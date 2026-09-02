import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import type {
  StrategicOrder,
} from "@/types/session";

import type {
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

interface OrderLifecycleNotice {
  orderId: string;
  playerId: string;
  kind:
    | "army_arrived"
    | "character_arrived"
    | "intercepted"
    | "failed";
  message: string;
}

function battleContainsBoth(firstArmyId: string, secondArmyId: string): boolean {
  return Object.values(getRuntimeWorldState().battles).some(
    (battle) =>
      battle.status === "active" &&
      (battle.attackerArmyIds.includes(firstArmyId) ||
        battle.defenderArmyIds.includes(firstArmyId)) &&
      (battle.attackerArmyIds.includes(secondArmyId) ||
        battle.defenderArmyIds.includes(secondArmyId))
  );
}

function completeOrder(order: StrategicOrder, worldTime: WorldMinute): void {
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      orders: {
        ...current.session.orders,
        [order.id]: {
          ...current.session.orders[order.id],
          status: "completed",
          completedAt: worldTime,
          updatedAt: worldTime,
        },
      },
    },
  }));
}

function failOrder(
  order: StrategicOrder,
  worldTime: WorldMinute,
  reason: string
): void {
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      orders: {
        ...current.session.orders,
        [order.id]: {
          ...current.session.orders[order.id],
          status: "failed",
          completedAt: worldTime,
          updatedAt: worldTime,
          failureReason: reason,
        },
      },
    },
  }));
}

export function processStrategicOrderLifecycle(
  worldTime: WorldMinute
): SimulationInterrupt | undefined {
  const orders = Object.values(getRuntimeWorldState().session.orders)
    .filter((order) => order.status === "executing")
    .sort(
      (a, b) =>
        a.issuedAt - b.issuedAt ||
        a.id.localeCompare(b.id)
    );

  const notices: OrderLifecycleNotice[] = [];

  for (const order of orders) {
    switch (order.type) {
      case "move_character": {
        if (!("characterId" in order.payload && "destinationNodeId" in order.payload)) {
          failOrder(order, worldTime, "INVALID_PAYLOAD");
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "failed",
            message: `${order.id} failed because its character movement payload is invalid.`,
          });
          break;
        }

        const movement =
          getRuntimeWorldState().simulation.activeMovements[order.payload.characterId];
        if (movement) break;

        const position =
          getRuntimeWorldState().simulation.entityPositions[order.payload.characterId];

        if (
          position?.kind === "node" &&
          position.nodeId === order.payload.destinationNodeId
        ) {
          completeOrder(order, worldTime);
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "character_arrived",
            message: `${order.payload.characterId} arrived at ${order.payload.destinationNodeId}.`,
          });
        } else {
          failOrder(order, worldTime, "MOVEMENT_STOPPED_BEFORE_DESTINATION");
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "failed",
            message: `${order.payload.characterId} movement ended before reaching ${order.payload.destinationNodeId}.`,
          });
        }
        break;
      }

      case "move_army": {
        if (!("armyId" in order.payload && "destinationNodeId" in order.payload)) {
          failOrder(order, worldTime, "INVALID_PAYLOAD");
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "failed",
            message: `${order.id} has invalid army movement data.`,
          });
          break;
        }

        const movement =
          getRuntimeWorldState().simulation.activeMovements[order.payload.armyId];
        if (movement) break;

        const army = getRuntimeWorldState().armies[order.payload.armyId];

        if (army?.status === "battle") {
          completeOrder(order, worldTime);
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "intercepted",
            message: `${order.payload.armyId} movement ended because it entered battle.`,
          });
          break;
        }

        const position =
          getRuntimeWorldState().simulation.entityPositions[order.payload.armyId];

        if (
          position?.kind === "node" &&
          position.nodeId === order.payload.destinationNodeId
        ) {
          completeOrder(order, worldTime);
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "army_arrived",
            message: `${order.payload.armyId} arrived at ${order.payload.destinationNodeId}.`,
          });
        }
        break;
      }

      case "intercept_army": {
        if (
          !(
            "armyId" in order.payload &&
            "targetArmyId" in order.payload &&
            "interceptNodeId" in order.payload
          )
        ) {
          failOrder(order, worldTime, "INVALID_PAYLOAD");
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "failed",
            message: `${order.id} has invalid interception data.`,
          });
          break;
        }

        if (battleContainsBoth(order.payload.armyId, order.payload.targetArmyId)) {
          completeOrder(order, worldTime);
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "intercepted",
            message: `${order.payload.armyId} intercepted ${order.payload.targetArmyId}.`,
          });
          break;
        }

        const movement =
          getRuntimeWorldState().simulation.activeMovements[order.payload.armyId];
        if (movement) break;

        const position =
          getRuntimeWorldState().simulation.entityPositions[order.payload.armyId];

        if (
          position?.kind === "node" &&
          position.nodeId === order.payload.interceptNodeId
        ) {
          completeOrder(order, worldTime);
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "army_arrived",
            message: `${order.payload.armyId} reached the last-known intercept point ${order.payload.interceptNodeId} without confirmed contact.`,
          });
        } else {
          failOrder(order, worldTime, "INTERCEPT_MOVEMENT_STOPPED");
          notices.push({
            orderId: order.id,
            playerId: order.playerId,
            kind: "failed",
            message: `${order.payload.armyId} interception movement stopped before the known intercept point.`,
          });
        }
        break;
      }

      case "hold_army":
        break;
    }
  }

  if (notices.length === 0) {
    return undefined;
  }

  if (getRuntimeWorldState().session.commandCycle.phase === "interrupted") {
    return undefined;
  }

  const affectedPlayerIds = [...new Set(notices.map((notice) => notice.playerId))];
  const hasFailure = notices.some((notice) => notice.kind === "failed");
  const hasCharacterArrival = notices.some(
    (notice) => notice.kind === "character_arrived"
  );

  const type = hasFailure
    ? "ORDER_FAILED"
    : hasCharacterArrival
      ? "CHARACTER_ARRIVED"
      : "ARMY_ARRIVED";

  const message = notices.map((notice) => notice.message).join(" ");
  const interrupt = openCommandInterrupt({
    type,
    affectedPlayerIds,
    message,
  });

  return {
    eventId: interrupt.id,
    type,
    message,
    affectedPlayerIds,
  };
}
