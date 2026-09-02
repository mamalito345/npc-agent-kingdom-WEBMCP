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

import {
  getBattleSideForArmy,
  sideHasBattleOrder,
  type BattleSide,
} from "@/lib/military/battle-side-power";

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

function getCommanderArmyForSide(
  battle: PersistentBattle,
  side: BattleSide
): string | undefined {
  const world =
    getRuntimeWorldState();

  const armyIds =
    side === "attacker"
      ? battle.attackerArmyIds
      : battle.defenderArmyIds;

  //
  // Prefer an army that actually
  // has a character commander.
  //
  const commandedArmy =
    armyIds.find(
      (armyId) =>
        world.armies[
          armyId
        ]?.commanderId !==
        undefined
    );

  return (
    commandedArmy ??
    armyIds[0]
  );
}

function createPendingDecision(
  battle: PersistentBattle,
  armyId: string
): string {
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

              armyId,

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
                  `Battle decision requested for ${armyId}.`,
              },
            ],
          },
        },
      };
    }
  );

  return decisionId;
}

function resolveCommanderSide(
  battle: PersistentBattle,
  side: BattleSide
): void {
  if (
    sideHasBattleOrder(
      battle,
      side
    )
  ) {
    return;
  }

  const armyId =
    getCommanderArmyForSide(
      battle,
      side
    );

  if (!armyId) {
    return;
  }

  createPendingDecision(
    battle,
    armyId
  );

  const refreshed =
    getRuntimeWorldState()
      .battles[
        battle.id
      ];

  if (!refreshed) {
    return;
  }

  resolveCommanderDecision(
    refreshed,
    armyId
  );
}

function createPlayerInterrupt(
  battle: PersistentBattle,
  armyId: string
): SimulationInterrupt {
  const decisionId =
    createPendingDecision(
      battle,
      armyId
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

export function processBattleDecision(
  battle: PersistentBattle
): SimulationInterrupt | undefined {
  if (
    battle.status !==
      "active" ||
    battle.currentPhase !==
      "crisis"
  ) {
    return undefined;
  }

  if (
    battle.pendingDecision
  ) {
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

  const playerSide =
    playerArmyId
      ? getBattleSideForArmy(
          battle,
          playerArmyId
        )
      : undefined;

  //
  // ==================================================
  // NO PLAYER AT BATTLE
  // ==================================================
  //
  // Both sides use the SAME canonical
  // submitBattleOrder path through
  // resolveCommanderDecision().
  //
  if (
    !playerArmyId ||
    !playerSide
  ) {
    let refreshed =
      getRuntimeWorldState()
        .battles[
          battle.id
        ];

    if (!refreshed) {
      return undefined;
    }

    resolveCommanderSide(
      refreshed,
      "attacker"
    );

    refreshed =
      getRuntimeWorldState()
        .battles[
          battle.id
        ];

    if (!refreshed) {
      return undefined;
    }

    resolveCommanderSide(
      refreshed,
      "defender"
    );

    return undefined;
  }

  //
  // ==================================================
  // PLAYER PRESENT
  // ==================================================
  //
  // Resolve the OTHER side first.
  //
  // This is important:
  //
  // when player order is later submitted,
  // both sides already have their orders.
  //
  const otherSide:
    BattleSide =
    playerSide ===
    "attacker"
      ? "defender"
      : "attacker";

  let refreshed =
    getRuntimeWorldState()
      .battles[
        battle.id
      ];

  if (!refreshed) {
    return undefined;
  }

  resolveCommanderSide(
    refreshed,
    otherSide
  );

  refreshed =
    getRuntimeWorldState()
      .battles[
        battle.id
      ];

  if (!refreshed) {
    return undefined;
  }

  //
  // Player side may already have an
  // order for some reason.
  //
  if (
    sideHasBattleOrder(
      refreshed,
      playerSide
    )
  ) {
    return undefined;
  }

  return createPlayerInterrupt(
    refreshed,
    playerArmyId
  );
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