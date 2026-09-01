import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  setActiveMovement,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  findRoute,
} from "@/lib/map/paths";

import {
  createMovement,
} from "@/lib/world/movement";

import type {
  Courier,
  WorldMessage,
} from "@/types/courier";

export const COURIER_SPEED_KM_PER_HOUR = 12;

export type SpawnCourierResult =
  | {
      ok: false;
      error:
        | "START_NODE_NOT_FOUND"
        | "ROUTE_NOT_FOUND";
    }
  | {
      ok: true;
      courier: Courier;
      message: WorldMessage;
    };

export function spawnCourier(
  senderId: string,
  recipientId: string,
  content: string,
  startNodeId: string,
  destinationNodeId: string
): SpawnCourierResult {
  const world =
    getRuntimeWorldState();

  if (
    !world.locations[startNodeId]
  ) {
    return {
      ok: false,
      error: "START_NODE_NOT_FOUND",
    };
  }

  const route = findRoute(
    startNodeId,
    destinationNodeId
  );

  if (!route) {
    return {
      ok: false,
      error: "ROUTE_NOT_FOUND",
    };
  }

  const messageSequence =
    allocateSimulationSequence();

  const courierSequence =
    allocateSimulationSequence();

  const messageId =
    `message-${messageSequence
      .toString()
      .padStart(6, "0")}`;

  const courierId =
    `courier-${courierSequence
      .toString()
      .padStart(6, "0")}`;

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const message: WorldMessage = {
    id: messageId,

    senderId,

    recipientId,

    content,

    createdAt: now,
  };

  const courier: Courier = {
    id: courierId,

    senderId,

    targetId:
      recipientId,

    messageId,

    destinationNodeId,

    position: {
      kind: "node",
      nodeId: startNodeId,
    },

    speedKmPerHour:
      COURIER_SPEED_KM_PER_HOUR,

    status: "traveling",

    createdAt: now,
  };

  const movement =
    createMovement(
      `movement-${courierSequence
        .toString()
        .padStart(6, "0")}`,

      courierId,

      route,

      COURIER_SPEED_KM_PER_HOUR,

      now
    );

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      messages: {
        ...current.messages,

        [message.id]:
          message,
      },

      couriers: {
        ...current.couriers,

        [courier.id]:
          courier,
      },

      simulation: {
        ...current.simulation,

        entityPositions: {
          ...current.simulation
            .entityPositions,

          [courier.id]:
            courier.position,
        },
      },
    })
  );

  setActiveMovement(
    movement
  );

  return {
    ok: true,
    courier,
    message,
  };
}

export function processCourierArrivals(): void {
  updateRuntimeWorldState(
    (current) => {
      let couriers =
        current.couriers;

      let messages =
        current.messages;

      let courierChanged =
        false;

      let messageChanged =
        false;

      for (
        const courier of
          Object.values(
            current.couriers
          )
      ) {
        if (
          courier.status !==
          "traveling"
        ) {
          continue;
        }

        const movement =
          current.simulation
            .activeMovements[
            courier.id
          ];

        if (movement) {
          continue;
        }

        const position =
          current.simulation
            .entityPositions[
            courier.id
          ];

        if (
          !position ||
          position.kind !== "node" ||
          position.nodeId !==
            courier.destinationNodeId
        ) {
          continue;
        }

        if (!courierChanged) {
          couriers = {
            ...current.couriers,
          };

          courierChanged = true;
        }

        couriers[courier.id] = {
          ...courier,

          position,

          status:
            "delivered",

          deliveredAt:
            current.simulation
              .worldTimeMinutes,
        };

        const message =
          current.messages[
            courier.messageId
          ];

        if (message) {
          if (!messageChanged) {
            messages = {
              ...current.messages,
            };

            messageChanged = true;
          }

          messages[
            message.id
          ] = {
            ...message,

            deliveredAt:
              current.simulation
                .worldTimeMinutes,
          };
        }
      }

      return {
        ...current,
        couriers,
        messages,
      };
    }
  );
}