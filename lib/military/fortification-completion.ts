import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  consumeSettlementReservation,
} from "@/lib/economy/reservations";

import type {
  WorldMinute,
} from "@/types/simulation";

export function getNextFortificationCompletionBoundary():
  WorldMinute | undefined {
  const world =
    getRuntimeWorldState();

  const activeOrders =
    Object.values(
      world
        .fortificationOrders
    )
      .filter(
        (order) =>
          order.status ===
          "active"
      )
      .sort(
        (a, b) =>
          a.completesAt -
            b.completesAt ||
          a.id.localeCompare(
            b.id
          )
      );

  return activeOrders[
    0
  ]?.completesAt;
}

export function processFortificationCompletions(
  worldTime:
    WorldMinute
): void {
  const snapshot =
    getRuntimeWorldState();

  const dueOrders =
    Object.values(
      snapshot
        .fortificationOrders
    )
      .filter(
        (order) =>
          order.status ===
            "active" &&
          order.completesAt <=
            worldTime
      )
      .sort(
        (a, b) =>
          a.completesAt -
            b.completesAt ||
          a.id.localeCompare(
            b.id
          )
      );

  for (
    const order
    of dueOrders
  ) {
    const world =
      getRuntimeWorldState();

    const settlement =
      world.settlements[
        order.settlementId
      ];

    if (!settlement) {
      updateRuntimeWorldState(
        (current) => ({
          ...current,

          fortificationOrders: {
            ...current
              .fortificationOrders,

            [order.id]: {
              ...current
                .fortificationOrders[
                  order.id
                ],

              status:
                "cancelled",
            },
          },
        })
      );

      continue;
    }

    consumeSettlementReservation(
      order.settlementId,
      order.reservedResources
    );

    updateRuntimeWorldState(
      (current) => ({
        ...current,

        settlements: {
          ...current
            .settlements,

          [order.settlementId]: {
            ...current
              .settlements[
                order
                  .settlementId
              ],

            fortificationLevel:
              order.toLevel,

            fortificationIntegrity:
              100,
          },
        },

        fortificationOrders: {
          ...current
            .fortificationOrders,

          [order.id]: {
            ...current
              .fortificationOrders[
                order.id
              ],

            status:
              "completed",
          },
        },
      })
    );
  }
}