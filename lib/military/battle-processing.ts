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

const CRISIS_COOLDOWN_MINUTES =
  4 * 60;

const MAXIMUM_BATTLE_HOURS =
  72;

function appendHistory(
  battleId: string,
  worldTime: WorldMinute,
  summary: string
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
  battleId: string,
  phase:
    PersistentBattle[
      "currentPhase"
    ],
  worldTime: WorldMinute
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

function getLatestBattleOrderTime(
  battle:
    PersistentBattle
): WorldMinute | undefined {
  if (
    battle.activeOrders
      .length ===
    0
  ) {
    return undefined;
  }

  return Math.max(
    ...battle.activeOrders.map(
      (order) =>
        order.issuedAt
    )
  );
}

function crisisThresholdReached(
  battle:
    PersistentBattle
): boolean {
  return (
    Math.abs(
      battle.frontMomentum
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

function shouldEnterCrisis(
  battle:
    PersistentBattle,
  worldTime:
    WorldMinute
): boolean {
  if (
    battle.battleHour <
    MINIMUM_BATTLE_HOURS
  ) {
    return false;
  }

  if (
    !crisisThresholdReached(
      battle
    )
  ) {
    return false;
  }

  const lastOrderTime =
    getLatestBattleOrderTime(
      battle
    );

  if (
    lastOrderTime ===
    undefined
  ) {
    return true;
  }

  return (
    worldTime -
      lastOrderTime >=
    CRISIS_COOLDOWN_MINUTES
  );
}

function hasExplicitRetreat(
  battle:
    PersistentBattle,
  losingSide:
    | "attacker"
    | "defender"
): boolean {
  return losingSide ===
    "attacker"
    ? battle
        .attackerTactic ===
        "orderly_retreat"
    : battle
        .defenderTactic ===
        "orderly_retreat";
}

function endBattle(
  battleId: string,
  worldTime: WorldMinute
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

function scheduleNextBattleHour(
  battleId: string,
  worldTime: WorldMinute
): void {
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

function prepareNewCrisis(
  battleId: string,
  worldTime: WorldMinute
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

            currentPhase:
              "crisis",

            /*
             * activeOrders belong to the
             * current decision window.
             *
             * Persistent consequences,
             * especially committed reserves,
             * live in separate battle fields.
             */
            activeOrders: [],

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
                  "Battle reached a new operational crisis.",
              },
            ],
          },
        },
      };
    }
  );
}

/*
 * Called by the world simulation scheduler.
 *
 * Returns the earliest battle hour
 * boundary among all active battles.
 */
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

/*
 * Called when simulation reaches one
 * or more battle boundaries.
 *
 * Each due battle advances exactly
 * one canonical battle hour.
 */
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

    /*
     * A crisis that already received
     * its decision goes back into
     * normal engagement.
     */
    if (
      battle.currentPhase ===
        "crisis" &&
      !battle.pendingDecision
    ) {
      setBattlePhase(
        battleId,
        "engagement",
        worldTime
      );

      battle =
        getRuntimeWorldState()
          .battles[
            battleId
          ];

      if (!battle) {
        continue;
      }
    }

    /*
     * First operational hour:
     * contact becomes deployment.
     */
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

    battle =
      getRuntimeWorldState()
        .battles[
          battleId
        ];

    if (!battle) {
      continue;
    }

    /*
     * Hour two onward:
     * deployment becomes engagement.
     */
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

    /*
     * Exactly one hourly combat round.
     */
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

    /*
     * Collapse / withdrawal.
     */
    const losingSide =
      battleShouldEnd(
        battleId
      );

    if (
      losingSide
    ) {
      const enoughBattleTime =
        battle.battleHour >=
        MINIMUM_BATTLE_HOURS;

      const explicitRetreat =
        hasExplicitRetreat(
          battle,
          losingSide
        );

      if (
        enoughBattleTime ||
        explicitRetreat
      ) {
        setBattlePhase(
          battleId,
          "resolution",
          worldTime
        );

        appendHistory(
          battleId,
          worldTime,
          explicitRetreat
            ? `${losingSide} began an organized withdrawal.`
            : `${losingSide} battle line collapsed.`
        );

        endBattle(
          battleId,
          worldTime
        );

        continue;
      }
    }

    /*
     * Crisis windows are state-driven,
     * not simply scheduled because
     * a certain number of hours passed.
     */
    if (
      shouldEnterCrisis(
        battle,
        worldTime
      )
    ) {
      prepareNewCrisis(
        battleId,
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
          scheduleNextBattleHour(
            battleId,
            worldTime
          );

          return interrupt;
        }
      }
    }

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

    /*
     * Safety valve only.
     */
    if (
      battle.battleHour >=
      MAXIMUM_BATTLE_HOURS
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

    scheduleNextBattleHour(
      battleId,
      worldTime
    );
  }

  return undefined;
}