import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  processBattleDecision,
} from "@/lib/military/battle-decisions";

import {
  fightArmies,
} from "@/lib/military/battle";

import {
  getBattlePhaseDuration,
  getNextBattlePhase,
} from "@/lib/military/battle-timeline";

import type {
  PersistentBattle,
} from "@/types/military";

import type {
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

export function getNextBattleBoundary():
  WorldMinute | undefined {
  const battles =
    Object.values(
      getRuntimeWorldState()
        .battles
    )
      .filter(
        (battle) =>
          battle.status ===
            "active" &&
          battle.nextPhaseAt !==
            undefined
      )
      .sort(
        (a, b) =>
          (
            a.nextPhaseAt ??
            Infinity
          ) -
            (
              b.nextPhaseAt ??
              Infinity
            ) ||
          a.id.localeCompare(
            b.id
          )
      );

  return battles[
    0
  ]?.nextPhaseAt;
}

function createHistoryEntry(
  battle:
    PersistentBattle,
  worldTime:
    WorldMinute,
  summary:
    string
) {
  const index =
    battle.history.length +
    1;

  return {
    id:
      `${battle.id}-history-${index
        .toString()
        .padStart(
          3,
          "0"
        )}`,

    timestamp:
      worldTime,

    type:
      "phase_changed" as const,

    summary,
  };
}

function finishPersistentBattle(
  battle:
    PersistentBattle,
  worldTime:
    WorldMinute
): void {
  const attackerArmyId =
    battle.attackerArmyIds[
      0
    ];

  const defenderArmyId =
    battle.defenderArmyIds[
      0
    ];

  const result =
    fightArmies({
      attackerArmyId,
      defenderArmyId,
    });

  if (!result.ok) {
    throw new Error(
      `Persistent battle resolution failed: ${result.error}`
    );
  }

  updateRuntimeWorldState(
    (current) => {
      const existing =
        current.battles[
          battle.id
        ];

      if (!existing) {
        return current;
      }

      return {
        ...current,

        battles: {
          ...current.battles,

          [battle.id]: {
            ...existing,

            currentPhase:
              "ended",

            nextPhaseAt:
              undefined,

            status:
              "ended",

            pendingDecision:
              undefined,

            finalBattleResultId:
              result.battle.id,

            history: [
              ...existing.history,

              {
                id:
                  `${battle.id}-history-${(
                    existing.history.length +
                    1
                  )
                    .toString()
                    .padStart(
                      3,
                      "0"
                    )}`,

                timestamp:
                  worldTime,

                type:
                  "battle_ended",

                summary:
                  result.battle
                    .winnerArmyId
                    ? `Battle ended. Winner: ${result.battle.winnerArmyId}.`
                    : "Battle ended in stalemate.",
              },
            ],
          },
        },
      };
    }
  );
}

export function processBattlePhases(
  worldTime:
    WorldMinute
): SimulationInterrupt | undefined {
  const snapshot =
    getRuntimeWorldState();

  const dueBattles =
    Object.values(
      snapshot.battles
    )
      .filter(
        (battle) =>
          battle.status ===
            "active" &&
          battle.nextPhaseAt !==
            undefined &&
          battle.nextPhaseAt <=
            worldTime
      )
      .sort(
        (a, b) =>
          (
            a.nextPhaseAt ??
            Infinity
          ) -
            (
              b.nextPhaseAt ??
              Infinity
            ) ||
          a.id.localeCompare(
            b.id
          )
      );

  for (
    const dueBattle
    of dueBattles
  ) {
    const current =
      getRuntimeWorldState();

    const battle =
      current.battles[
        dueBattle.id
      ];

    if (
      !battle ||
      battle.status !==
        "active" ||
      battle.nextPhaseAt ===
        undefined ||
      battle.nextPhaseAt >
        worldTime
    ) {
      continue;
    }

    const nextPhase =
      getNextBattlePhase(
        battle.currentPhase
      );

    if (
      nextPhase ===
      "ended"
    ) {
      finishPersistentBattle(
        battle,
        worldTime
      );

      continue;
    }

    const historyEntry =
      createHistoryEntry(
        battle,
        worldTime,
        `Battle phase changed from ${battle.currentPhase} to ${nextPhase}.`
      );

    updateRuntimeWorldState(
      (state) => {
        const latest =
          state.battles[
            battle.id
          ];

        if (!latest) {
          return state;
        }

        return {
          ...state,

          battles: {
            ...state.battles,

            [battle.id]: {
              ...latest,

              currentPhase:
                nextPhase,

              nextPhaseAt:
                worldTime +
                getBattlePhaseDuration(
                  nextPhase
                ),

              history: [
                ...latest.history,
                historyEntry,
              ],
            },
          },
        };
      }
    );

    //
    // C2.2:
    // CRISIS is the first
    // meaningful decision point.
    //
    if (
      nextPhase ===
      "crisis"
    ) {
      const refreshed =
        getRuntimeWorldState()
          .battles[
            battle.id
          ];

      if (!refreshed) {
        continue;
      }

      const interrupt =
        processBattleDecision(
          refreshed
        );

      if (interrupt) {
        return interrupt;
      }
    }
  }

  return undefined;
}