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
  interceptArmy,
} from "@/lib/military/interception";

import {
  canWorldExecute,
} from "@/lib/session/command-cycle";

import type {
  StrategicOrder,
} from "@/types/session";

function markOrder(
  orderId:
    string,
  status:
    StrategicOrder[
      "status"
    ],
  failureReason?:
    string
): void {
  updateRuntimeWorldState(
    (world) => {
      const order =
        world.session
          .orders[
            orderId
          ];

      if (!order) {
        return world;
      }

      return {
        ...world,

        session: {
          ...world.session,

          orders: {
            ...world
              .session
              .orders,

            [orderId]: {
              ...order,

              status,

              updatedAt:
                world.simulation
                  .worldTimeMinutes,

              failureReason,
            },
          },
        },
      };
    }
  );
}

function executeOrder(
  order:
    StrategicOrder
): void {
  switch (
    order.type
  ) {
    case "move_character": {
      if (
        !(
          "characterId" in
            order.payload &&
          "destinationNodeId" in
            order.payload
        )
      ) {
        markOrder(
          order.id,
          "failed",
          "INVALID_PAYLOAD"
        );

        return;
      }

      const result =
        beginCharacterTravel(
          order.payload
            .characterId,

          order.payload
            .destinationNodeId
        );

      if (
        result.ok ===
        false
      ) {
        markOrder(
          order.id,
          "failed",
          result.error
        );

        return;
      }

      markOrder(
        order.id,
        "executing"
      );

      return;
    }

    case "move_army": {
      if (
        !(
          "armyId" in
            order.payload &&
          "destinationNodeId" in
            order.payload
        )
      ) {
        markOrder(
          order.id,
          "failed",
          "INVALID_PAYLOAD"
        );

        return;
      }

      const result =
        moveArmy(
          order.payload
            .armyId,

          order.payload
            .destinationNodeId
        );

      if (
        result.ok ===
        false
      ) {
        markOrder(
          order.id,
          "failed",
          result.error
        );

        return;
      }

      markOrder(
        order.id,
        "executing"
      );

      return;
    }

    case "intercept_army": {
      if (
        !(
          "armyId" in
            order.payload &&
          "targetArmyId" in
            order.payload
        )
      ) {
        markOrder(
          order.id,
          "failed",
          "INVALID_PAYLOAD"
        );

        return;
      }

      const result =
        interceptArmy(
          order.payload
            .armyId,

          order.payload
            .targetArmyId
        );

      if (
        result.ok ===
        false
      ) {
        markOrder(
          order.id,
          "failed",
          result.reason ??
            result.error
        );

        return;
      }

      markOrder(
        order.id,
        "executing"
      );

      return;
    }

    case "hold_army": {
      if (
        !(
          "armyId" in
          order.payload
        )
      ) {
        markOrder(
          order.id,
          "failed",
          "INVALID_PAYLOAD"
        );

        return;
      }

      stopArmyMovement(
        order.payload
          .armyId
      );

      markOrder(
        order.id,
        "completed"
      );

      return;
    }
  }
}

export function executeQueuedStrategicOrders():
  void {
  if (
    !canWorldExecute()
  ) {
    return;
  }

  const orders =
    Object.values(
      getRuntimeWorldState()
        .session
        .orders
    )
      .filter(
        (order) =>
          order.status ===
          "queued"
      )
      .sort(
        (a, b) =>
          a.issuedAt -
            b.issuedAt ||
          a.id.localeCompare(
            b.id
          )
      );

  for (
    const order
    of orders
  ) {
    executeOrder(
      order
    );
  }
}