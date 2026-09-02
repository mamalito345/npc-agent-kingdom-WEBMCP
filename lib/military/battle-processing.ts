import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  processBattleDecision,
} from "@/lib/military/battle-decisions";

import {
  calculateBattleSidePower,
} from "@/lib/military/battle-side-power";

import {
  applyProgressiveBattleCasualties,
  resolvePersistentBattleOutcome,
} from "@/lib/military/persistent-battle-resolution";

import {
  getBattlePhaseDuration,
  getNextBattlePhase,
} from "@/lib/military/battle-timeline";

import type {
  BattlePhase,
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
  battle: PersistentBattle,
  worldTime: WorldMinute,
  summary: string
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

function appendOperationalPowerSnapshot(
  battleId: string,
  worldTime: WorldMinute
): void {
  const current =
    getRuntimeWorldState();

  const battle =
    current.battles[
      battleId
    ];

  if (
    !battle ||
    battle.status !==
      "active"
  ) {
    return;
  }

  const attacker =
    calculateBattleSidePower(
      battle,
      "attacker"
    );

  const defender =
    calculateBattleSidePower(
      battle,
      "defender"
    );

  const attackerOrder =
    attacker.order?.type ??
    "none";

  const defenderOrder =
    defender.order?.type ??
    "none";

  updateRuntimeWorldState(
    (state) => {
      const latest =
        state.battles[
          battleId
        ];

      if (!latest) {
        return state;
      }

      return {
        ...state,

        battles: {
          ...state.battles,

          [battleId]: {
            ...latest,

            history: [
              ...latest.history,

              {
                id:
                  `${battleId}-history-${(
                    latest
                      .history
                      .length +
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
                  "phase_changed",

                summary:
                  [
                    "Operational battle power calculated.",
                    `Attacker armies=${attacker.armyIds.length}`,
                    `power=${attacker.totalPower.toFixed(2)}`,
                    `order=${attackerOrder}.`,
                    `Defender armies=${defender.armyIds.length}`,
                    `power=${defender.totalPower.toFixed(2)}`,
                    `order=${defenderOrder}.`,
                  ].join(
                    " "
                  ),
              },
            ],
          },
        },
      };
    }
  );
}

function shouldApplyCasualties(
  phase: BattlePhase
): phase is
  | "engagement"
  | "crisis"
  | "resolution" {
  return (
    phase ===
      "engagement" ||
    phase ===
      "crisis" ||
    phase ===
      "resolution"
  );
}

function finishPersistentBattle(
  battle: PersistentBattle,
  worldTime: WorldMinute
): void {
  const existing =
    getRuntimeWorldState()
      .battles[
        battle.id
      ];

  if (!existing) {
    return;
  }

  let result =
    existing
      .finalBattleResultId
      ? getRuntimeWorldState()
          .battleResults[
            existing
              .finalBattleResultId
          ]
      : undefined;

  if (!result) {
    result =
      resolvePersistentBattleOutcome(
        battle.id,
        worldTime
      );
  }

  updateRuntimeWorldState(
    (current) => {
      const latest =
        current.battles[
          battle.id
        ];

      if (!latest) {
        return current;
      }

      return {
        ...current,

        battles: {
          ...current.battles,

          [battle.id]: {
            ...latest,

            currentPhase:
              "ended",

            nextPhaseAt:
              undefined,

            status:
              "ended",

            pendingDecision:
              undefined,

            finalBattleResultId:
              result!.id,

            history: [
              ...latest.history,

              {
                id:
                  `${battle.id}-history-${(
                    latest
                      .history
                      .length +
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
                  result!
                    .winnerArmyId
                    ? `Battle ended. Winning side led by ${result!.winnerArmyId}.`
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
  worldTime: WorldMinute
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
    // Progressive casualty pulses.
    //
    if (
      shouldApplyCasualties(
        nextPhase
      )
    ) {
      applyProgressiveBattleCasualties(
        battle.id,
        nextPhase,
        worldTime
      );
    }

    //
    // Crisis decision point.
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

    //
    // Resolution snapshot after casualty pulse.
    //
    if (
      nextPhase ===
      "resolution"
    ) {
      appendOperationalPowerSnapshot(
        battle.id,
        worldTime
      );
    }

    //
    // Resolution → retreat:
    //
    // decide actual battlefield winner
    // using ALL surviving armies.
    //
    if (
      nextPhase ===
      "retreat"
    ) {
      const refreshed =
        getRuntimeWorldState()
          .battles[
            battle.id
          ];

      if (
        refreshed &&
        !refreshed
          .finalBattleResultId
      ) {
        const result =
          resolvePersistentBattleOutcome(
            battle.id,
            worldTime
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

                  finalBattleResultId:
                    result.id,

                  history: [
                    ...latest.history,

                    {
                      id:
                        `${battle.id}-history-${(
                          latest
                            .history
                            .length +
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
                        "phase_changed",

                      summary:
                        result
                          .winnerArmyId
                          ? `Battlefield outcome decided. Winning side led by ${result.winnerArmyId}.`
                          : "Battlefield outcome decided as stalemate.",
                    },
                  ],
                },
              },
            };
          }
        );
      }
    }
  }

  return undefined;
}