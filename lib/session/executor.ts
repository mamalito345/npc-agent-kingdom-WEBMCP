import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  beginCharacterTravel,
} from "@/lib/world/actions";

import {
  moveArmy,
  stopArmyMovement,
} from "@/lib/military/army-movement";

import {
  canWorldExecute,
} from "@/lib/session/command-cycle";

import type {
  StrategicOrder,
} from "@/types/session";

interface OrderPatch {
  status?: StrategicOrder["status"];
  movementId?: string;
  startedAt?: number;
  completedAt?: number;
  failureReason?: string;
}

function patchOrder(orderId: string, patch: OrderPatch): void {
  updateRuntimeWorldState((world) => {
    const order = world.session.orders[orderId];
    if (!order) return world;

    return {
      ...world,
      session: {
        ...world.session,
        orders: {
          ...world.session.orders,
          [orderId]: {
            ...order,
            ...patch,
            updatedAt: world.simulation.worldTimeMinutes,
          },
        },
      },
    };
  });
}

function failOrder(orderId: string, reason: string): void {
  patchOrder(orderId, {
    status: "failed",
    failureReason: reason,
    completedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
  });
}

function executeOrder(order: StrategicOrder): void {
  const now = getRuntimeWorldState().simulation.worldTimeMinutes;

  switch (order.type) {
    case "move_character": {
      if (!("characterId" in order.payload && "destinationNodeId" in order.payload)) {
        failOrder(order.id, "INVALID_PAYLOAD");
        return;
      }

      const result = beginCharacterTravel(
        order.payload.characterId,
        order.payload.destinationNodeId
      );

      if (!result.ok) {
        failOrder(order.id, result.error);
        return;
      }

      patchOrder(order.id, {
        status: "executing",
        movementId: result.movement.id,
        startedAt: now,
      });
      return;
    }

    case "move_army": {
      if (!("armyId" in order.payload && "destinationNodeId" in order.payload)) {
        failOrder(order.id, "INVALID_PAYLOAD");
        return;
      }

      const result = moveArmy(
        order.payload.armyId,
        order.payload.destinationNodeId
      );

      if (!result.ok) {
        failOrder(order.id, result.error);
        return;
      }

      patchOrder(order.id, {
        status: "executing",
        movementId: result.movementId,
        startedAt: now,
      });
      return;
    }

    case "intercept_army": {
      if (!("armyId" in order.payload && "interceptNodeId" in order.payload)) {
        failOrder(order.id, "INVALID_PAYLOAD");
        return;
      }

      /*
       * Knowledge-safe interception:
       * destination was selected from the player's delivered knowledge when
       * the order was issued. Do NOT inspect target ActiveMovement here.
       */
      const result = moveArmy(
        order.payload.armyId,
        order.payload.interceptNodeId
      );

      if (!result.ok) {
        failOrder(order.id, result.error);
        return;
      }

      patchOrder(order.id, {
        status: "executing",
        movementId: result.movementId,
        startedAt: now,
      });
      return;
    }

    case "hold_army": {
      if (!("armyId" in order.payload)) {
        failOrder(order.id, "INVALID_PAYLOAD");
        return;
      }

      stopArmyMovement(order.payload.armyId);
      patchOrder(order.id, {
        status: "completed",
        startedAt: now,
        completedAt: now,
      });
      return;
    }
  }
}

export function executeQueuedStrategicOrders(): void {
  if (!canWorldExecute()) return;

  const orders = Object.values(getRuntimeWorldState().session.orders)
    .filter((order) => order.status === "queued")
    .sort(
      (a, b) =>
        a.issuedAt - b.issuedAt ||
        a.id.localeCompare(b.id)
    );

  for (const order of orders) {
    executeOrder(order);
  }
}
