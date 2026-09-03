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

export function getNextFortificationRepairBoundary():
  WorldMinute | undefined {
  const world =
    getRuntimeWorldState();

  const activeOrders =
    Object.values(
      world
        .fortificationRepairOrders
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

export function processFortificationRepairs(
  worldTime:
    WorldMinute
): void {
  const snapshot =
    getRuntimeWorldState();

  const dueOrders =
    Object.values(
      snapshot
        .fortificationRepairOrders
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

          fortificationRepairOrders: {
            ...current
              .fortificationRepairOrders,

            [order.id]: {
              ...current
                .fortificationRepairOrders[
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

    //
    // If the fortification level changed
    // during repair, the original repair
    // order is no longer valid.
    //
    if (
      (settlement
        .fortificationLevel ??
        0) !==
      order
        .fortificationLevel
    ) {
      updateRuntimeWorldState(
        (current) => ({
          ...current,

          fortificationRepairOrders: {
            ...current
              .fortificationRepairOrders,

            [order.id]: {
              ...current
                .fortificationRepairOrders[
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
                order.settlementId
              ],

            fortificationIntegrity:
              order.toIntegrity,
          },
        },

        fortificationRepairOrders: {
          ...current
            .fortificationRepairOrders,

          [order.id]: {
            ...current
              .fortificationRepairOrders[
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