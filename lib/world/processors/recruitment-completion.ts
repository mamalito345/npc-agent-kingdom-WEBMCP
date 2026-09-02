import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  consumeSettlementReservation,
} from "@/lib/economy/reservations";

import type {
  Army,
  UnitBlock,
} from "@/types/military";

import type {
  WorldMinute,
} from "@/types/simulation";

export function getNextRecruitmentCompletionTime(
  currentTime: WorldMinute
): WorldMinute | undefined {
  const world =
    getRuntimeWorldState();

  let next:
    WorldMinute |
    undefined;

  for (
    const order
    of Object.values(
      world.recruitmentOrders
    )
  ) {
    if (
      order.status !==
      "active"
    ) {
      continue;
    }

    if (
      order.completesAt <=
      currentTime
    ) {
      continue;
    }

    if (
      next === undefined ||
      order.completesAt <
        next
    ) {
      next =
        order.completesAt;
    }
  }

  return next;
}

export function processRecruitmentCompletions(
  worldTime: WorldMinute
): void {
  const world =
    getRuntimeWorldState();

  const dueOrders =
    Object.values(
      world.recruitmentOrders
    )
      .filter(
        (order) =>
          order.status ===
            "active" &&
          order.completesAt <=
            worldTime
      )
      .sort(
        (left, right) =>
          left.completesAt -
            right.completesAt ||
          left.id.localeCompare(
            right.id
          )
      );

  for (
    const order
    of dueOrders
  ) {
    /**
     * Consume physical stock
     * and release reservation.
     */
    consumeSettlementReservation(
      order.settlementId,
      order.reservedResources
    );

    const current =
      getRuntimeWorldState();

    const settlement =
      current.settlements[
        order.settlementId
      ];

    if (!settlement) {
      throw new Error(
        `Settlement missing during recruitment completion: ${order.settlementId}`
      );
    }

    const unitBlocks: Record<
      string,
      UnitBlock
    > = {};

    const unitIds:
      string[] = [];

    for (
      let index = 0;
      index <
      order.blocks;
      index += 1
    ) {
      const unitId =
        `${order.id}-unit-${(
          index + 1
        )
          .toString()
          .padStart(
            3,
            "0"
          )}`;

      const unit:
        UnitBlock = {
        id: unitId,

        type:
          order.unitType,

        currentSoldiers:
          order.unitType ===
            "siege"
            ? 0
            : 250,
      };

      unitBlocks[
        unit.id
      ] = unit;

      unitIds.push(
        unit.id
      );
    }

    const armyId =
      `${order.id}-army`;

    const army:
      Army = {
      id: armyId,

      ownerId:
        settlement.kingdomId,

      commanderId:
        order.actorId,

      unitIds,

      morale:
        "normal",

      /**
       * Garrison armies currently
       * draw food locally.
       *
       * Carried field supply will be
       * activated in Block B.
       */
      supply: {
        foodSupply: 0,

        state:
          "supplied",
      },

      funding: {
        unpaidDays: 0,

        state:
          "funded",
      },

      status:
        "garrison",
    };

    updateRuntimeWorldState(
      (state) => {
        const latestOrder =
          state
            .recruitmentOrders[
              order.id
            ];

        /**
         * Another processor must never
         * complete the same order twice.
         */
        if (
          !latestOrder ||
          latestOrder.status !==
            "active"
        ) {
          return state;
        }

        const kingdom =
          state.kingdoms[
            settlement.kingdomId
          ];

        if (!kingdom) {
          throw new Error(
            `Kingdom missing during recruitment completion: ${settlement.kingdomId}`
          );
        }

        return {
          ...state,

          unitBlocks: {
            ...state.unitBlocks,

            ...unitBlocks,
          },

          armies: {
            ...state.armies,

            [army.id]:
              army,
          },

          kingdoms: {
            ...state.kingdoms,

            [kingdom.id]: {
              ...kingdom,

              armyIds: [
                ...kingdom.armyIds,

                army.id,
              ],
            },
          },

          recruitmentOrders: {
            ...state
              .recruitmentOrders,

            [order.id]: {
              ...latestOrder,

              status:
                "completed",
            },
          },

          simulation: {
            ...state.simulation,

            entityPositions: {
              ...state
                .simulation
                .entityPositions,

              [army.id]: {
                kind:
                  "node",

                nodeId:
                  settlement
                    .locationId,
              },
            },
          },
        };
      }
    );
  }
}