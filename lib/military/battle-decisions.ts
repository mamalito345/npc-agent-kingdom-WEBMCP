import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getPlayerControlledArmyId,
  isPlayerPresentAtBattle,
} from "@/lib/military/player-presence";

import {
  resolveCommanderDecision,
} from "@/lib/military/commander-policy";

import type {
  BattleOrderType,
  PersistentBattle,
} from "@/types/military";

import type {
  SimulationInterrupt,
} from "@/types/simulation";

const AVAILABLE_OPERATIONAL_ORDERS:
  BattleOrderType[] = [
  "hold_position",
  "commit_reserve",
  "press_attack",
  "order_retreat",
];

function shouldCreateDecision(
  battle:
    PersistentBattle
): boolean {
  return (
    battle.status ===
      "active" &&
    battle.currentPhase ===
      "crisis" &&
    !battle.pendingDecision &&
    battle.activeOrders.length ===
      0
  );
}

export function processBattleDecision(
  battle:
    PersistentBattle
): SimulationInterrupt | undefined {
  if (
    !shouldCreateDecision(
      battle
    )
  ) {
    return undefined;
  }

  const playerPresent =
    isPlayerPresentAtBattle(
      battle
    );

  const playerArmyId =
    playerPresent
      ? getPlayerControlledArmyId(
          battle
        )
      : undefined;

  if (
    playerPresent &&
    playerArmyId
  ) {
    const sequence =
      allocateSimulationSequence();

    const now =
      getRuntimeWorldState()
        .simulation
        .worldTimeMinutes;

    const decisionId =
      `battle-decision-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`;

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

              pendingDecision: {
                id:
                  decisionId,

                battleId:
                  battle.id,

                armyId:
                  playerArmyId,

                requestedAt:
                  now,

                availableOrders: [
                  ...AVAILABLE_OPERATIONAL_ORDERS,
                ],
              },

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
                    now,

                  type:
                    "decision_requested",

                  summary:
                    `Player decision requested for ${playerArmyId}.`,
                },
              ],
            },
          },
        };
      }
    );

    return {
      eventId:
        decisionId,

      type:
        "BATTLE_DECISION",

      message:
        `Battle ${battle.id} requires a decision.`,
    };
  }

  const commanderArmyId =
    battle.attackerArmyIds[
      0
    ];

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

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

            pendingDecision: {
              id:
                `battle-decision-${sequence
                  .toString()
                  .padStart(
                    6,
                    "0"
                  )}`,

              battleId:
                battle.id,

              armyId:
                commanderArmyId,

              requestedAt:
                now,

              availableOrders: [
                ...AVAILABLE_OPERATIONAL_ORDERS,
              ],
            },
          },
        },
      };
    }
  );

  const refreshed =
    getRuntimeWorldState()
      .battles[
        battle.id
      ];

  resolveCommanderDecision(
    refreshed,
    commanderArmyId
  );

  return undefined;
}

export function getPendingBattleDecisionInterrupt():
  SimulationInterrupt | undefined {
  const world =
    getRuntimeWorldState();

  const battle =
    Object.values(
      world.battles
    )
      .filter(
        (candidate) =>
          candidate.status ===
            "active" &&
          candidate.pendingDecision !==
            undefined
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id
          )
      )[0];

  if (
    !battle ||
    !battle.pendingDecision
  ) {
    return undefined;
  }

  return {
    eventId:
      battle
        .pendingDecision
        .id,

    type:
      "BATTLE_DECISION",

    message:
      `Battle ${battle.id} is waiting for a decision.`,
  };
}