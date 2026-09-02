import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  processBattleDecision,
} from "@/lib/military/battle-decisions";

import {
  battleShouldEnd,
  processBattleRound,
} from "@/lib/military/battle-round";

import {
  resolvePersistentBattleOutcome,
} from "@/lib/military/persistent-battle-resolution";

import type {
  PersistentBattle,
} from "@/types/military";

import type {
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

const BATTLE_ROUND_MINUTES =
  60;

const MINIMUM_BATTLE_HOURS =
  4;

function appendHistory(
  battleId:
    string,
  worldTime:
    WorldMinute,
  summary:
    string
): void {
  updateRuntimeWorldState(
    (state) => {
      const battle =
        state.battles[
          battleId
        ];

      if (!battle) {
        return state;
      }

      return {
        ...state,

        battles: {
          ...state.battles,

          [battleId]: {
            ...battle,

            history: [
              ...battle.history,

              {
                id:
                  `${battleId}-history-${(
                    battle
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

                summary,
              },
            ],
          },
        },
      };
    }
  );
}

function setBattlePhase(
  battleId:
    string,
  phase:
    PersistentBattle[
      "currentPhase"
    ],
  worldTime:
    WorldMinute
): void {
  updateRuntimeWorldState(
    (state) => {
      const battle =
        state.battles[
          battleId
        ];

      if (!battle) {
        return state;
      }

      if (
        battle.currentPhase ===
        phase
      ) {
        return state;
      }

      return {
        ...state,

        battles: {
          ...state.battles,

          [battleId]: {
            ...battle,

            currentPhase:
              phase,

            history: [
              ...battle.history,

              {
                id:
                  `${battleId}-history-${(
                    battle
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
                  `Battle entered ${phase}.`,
              },
            ],
          },
        },
      };
    }
  );
}

function endBattle(
  battleId:
    string,
  worldTime:
    WorldMinute
): void {
  const world =
    getRuntimeWorldState();

  const battle =
    world.battles[
      battleId
    ];

  if (
    !battle ||
    battle.status !==
      "active"
  ) {
    return;
  }

  const result =
    resolvePersistentBattleOutcome(
      battleId,
      worldTime
    );

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

            currentPhase:
              "ended",

            status:
              "ended",

            nextPhaseAt:
              undefined,

            pendingDecision:
              undefined,

            finalBattleResultId:
              result.id,

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
                  "battle_ended",

                summary:
                  result
                    .winnerArmyId
                    ? `Battle ended. Winner: ${result.winnerArmyId}.`
                    : "Battle ended in stalemate.",
              },
            ],
          },
        },
      };
    }
  );
}

function shouldEnterCrisis(
  battle:
    PersistentBattle
): boolean {
  return (
    Math.abs(
      battle
        .frontMomentum
    ) >=
      55 ||
    battle
      .attackerMoralePressure >=
      60 ||
    battle
      .defenderMoralePressure >=
      60
  );
}

export function getNextBattleBoundary():
  WorldMinute | undefined {
  return Object.values(
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
    )[0]
    ?.nextPhaseAt;
}

export function processBattlePhases(
  worldTime:
    WorldMinute
): SimulationInterrupt | undefined {
  const dueBattleIds =
    Object.values(
      getRuntimeWorldState()
        .battles
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
      )
      .map(
        (battle) =>
          battle.id
      );

  for (
    const battleId
    of dueBattleIds
  ) {
    let battle =
      getRuntimeWorldState()
        .battles[
          battleId
        ];

    if (
      !battle ||
      battle.status !==
        "active"
    ) {
      continue;
    }

    //
    // Hour 1 = contact.
    //
    if (
      battle.battleHour ===
      0
    ) {
      setBattlePhase(
        battleId,
        "deployment",
        worldTime
      );

      appendHistory(
        battleId,
        worldTime,
        "Initial contact complete. Armies are deploying."
      );
    }

    //
    // Hour 2 onward = actual engagement.
    //
    if (
      battle.battleHour >=
      1 &&
      battle.currentPhase ===
        "deployment"
    ) {
      setBattlePhase(
        battleId,
        "engagement",
        worldTime
      );
    }

    processBattleRound(
      battleId,
      worldTime
    );

    battle =
      getRuntimeWorldState()
        .battles[
          battleId
        ];

    if (
      !battle ||
      battle.status !==
        "active"
    ) {
      continue;
    }

    if (
      battle.battleHour >=
        MINIMUM_BATTLE_HOURS &&
      shouldEnterCrisis(
        battle
      ) &&
      battle.currentPhase !==
        "crisis"
    ) {
      setBattlePhase(
        battleId,
        "crisis",
        worldTime
      );

      const refreshed =
        getRuntimeWorldState()
          .battles[
            battleId
          ];

      if (refreshed) {
        const interrupt =
          processBattleDecision(
            refreshed
          );

        if (
          interrupt
        ) {
          updateRuntimeWorldState(
            (state) => ({
              ...state,

              battles: {
                ...state.battles,

                [battleId]: {
                  ...state
                    .battles[
                      battleId
                    ],

                  nextPhaseAt:
                    worldTime +
                    BATTLE_ROUND_MINUTES,
                },
              },
            })
          );

          return interrupt;
        }
      }
    }

    const losingSide =
      battleShouldEnd(
        battleId
      );

    if (
      losingSide &&
      battle.battleHour >=
        MINIMUM_BATTLE_HOURS
    ) {
      setBattlePhase(
        battleId,
        "resolution",
        worldTime
      );

      appendHistory(
        battleId,
        worldTime,
        `${losingSide} battle line collapsed.`
      );

      endBattle(
        battleId,
        worldTime
      );

      continue;
    }

    //
    // Safety valve:
    // no battle should run forever.
    //
    if (
      battle.battleHour >=
      72
    ) {
      appendHistory(
        battleId,
        worldTime,
        "Battle reached 72 hours. Operational exhaustion forced resolution."
      );

      endBattle(
        battleId,
        worldTime
      );

      continue;
    }

    updateRuntimeWorldState(
      (state) => {
        const latest =
          state.battles[
            battleId
          ];

        if (
          !latest ||
          latest.status !==
            "active"
        ) {
          return state;
        }

        return {
          ...state,

          battles: {
            ...state.battles,

            [battleId]: {
              ...latest,

              nextPhaseAt:
                worldTime +
                BATTLE_ROUND_MINUTES,
            },
          },
        };
      }
    );
  }

  return undefined;
}