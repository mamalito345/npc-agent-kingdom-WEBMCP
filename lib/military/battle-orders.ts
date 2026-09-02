import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  BattleDecisionActor,
  BattleOrder,
  BattleOrderType,
} from "@/types/military";

export interface SubmitBattleOrderInput {
  battleId:
    string;

  armyId:
    string;

  actorType:
    BattleDecisionActor;

  actorId:
    string;

  order:
    BattleOrderType;
}

export type SubmitBattleOrderError =
  | "BATTLE_NOT_FOUND"
  | "BATTLE_NOT_ACTIVE"
  | "ARMY_NOT_IN_BATTLE"
  | "ORDER_NOT_AVAILABLE"
  | "NO_PENDING_DECISION"
  | "WRONG_DECISION_ARMY";

export type SubmitBattleOrderResult =
  | {
      ok: false;
      error:
        SubmitBattleOrderError;
    }
  | {
      ok: true;
      order:
        BattleOrder;
    };

export function submitBattleOrder(
  input:
    SubmitBattleOrderInput
): SubmitBattleOrderResult {
  const world =
    getRuntimeWorldState();

  const battle =
    world.battles[
      input.battleId
    ];

  if (!battle) {
    return {
      ok: false,
      error:
        "BATTLE_NOT_FOUND",
    };
  }

  if (
    battle.status !==
    "active"
  ) {
    return {
      ok: false,
      error:
        "BATTLE_NOT_ACTIVE",
    };
  }

  const participating =
    battle.attackerArmyIds
      .includes(
        input.armyId
      ) ||
    battle.defenderArmyIds
      .includes(
        input.armyId
      );

  if (!participating) {
    return {
      ok: false,
      error:
        "ARMY_NOT_IN_BATTLE",
    };
  }

  const pending =
    battle.pendingDecision;

  if (!pending) {
    return {
      ok: false,
      error:
        "NO_PENDING_DECISION",
    };
  }

  if (
    pending.armyId !==
    input.armyId
  ) {
    return {
      ok: false,
      error:
        "WRONG_DECISION_ARMY",
    };
  }

  if (
    !pending.availableOrders
      .includes(
        input.order
      )
  ) {
    return {
      ok: false,
      error:
        "ORDER_NOT_AVAILABLE",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const order:
    BattleOrder = {
    id:
      `battle-order-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    battleId:
      battle.id,

    armyId:
      input.armyId,

    actorType:
      input.actorType,

    actorId:
      input.actorId,

    type:
      input.order,

    issuedAt:
      now,
  };

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

            pendingDecision:
              undefined,

            activeOrders: [
              ...latest
                .activeOrders,

              order,
            ],

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
                  "order_issued",

                summary:
                  `${input.actorType} ${input.actorId} issued ${input.order} for ${input.armyId}.`,
              },
            ],
          },
        },
      };
    }
  );

  return {
    ok: true,
    order,
  };
}