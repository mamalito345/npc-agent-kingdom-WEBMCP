import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  consumeSettlementReservation,
} from "@/lib/economy/reservations";

import type {
  Army,
  RecruitmentOrder,
  UnitBlock,
} from "@/types/military";

import type {
  WorldMinute,
} from "@/types/simulation";

export function getNextRecruitmentCompletionBoundary():
  WorldMinute | undefined {
  const world =
    getRuntimeWorldState();

  const activeOrders =
    Object.values(
      world.recruitmentOrders
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

export function processRecruitmentCompletions(
  worldTime:
    WorldMinute
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
    completeRecruitmentOrder(
      order
    );
  }
}

function completeRecruitmentOrder(
  order:
    RecruitmentOrder
): void {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      order.settlementId
    ];

  if (!settlement) {
    return;
  }

  //
  // Consume the resources that were
  // reserved when recruitment began.
  //
  consumeSettlementReservation(
    order.settlementId,
    order.reservedResources
  );

  const createdUnitIds:
    string[] = [];

  const createdUnits:
    Record<
      string,
      UnitBlock
    > = {};

  for (
    let index = 0;
    index < order.blocks;
    index += 1
  ) {
    const sequence =
      allocateSimulationSequence();

    const unitId =
      `${order.id}-unit-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`;

    const currentSoldiers =
      order.unitType ===
      "siege"
        ? 0
        : 250;

    const unit:
      UnitBlock = {
      id:
        unitId,

      type:
        order.unitType,

      currentSoldiers,
    };

    createdUnitIds.push(
      unit.id
    );

    createdUnits[
      unit.id
    ] = unit;
  }

  const armyId =
    `${order.id}-army`;

  const army:
    Army = {
    id:
      armyId,

    ownerId:
      settlement.kingdomId,

    commanderId:
      order.actorId,

    unitIds:
      createdUnitIds,

    morale:
      "normal",

    supply: {
      foodSupply:
        0,

      state:
        "starving",
    },

    funding: {
      unpaidDays:
        0,

      state:
        "funded",
    },

    status:
      "garrison",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      unitBlocks: {
        ...current
          .unitBlocks,

        ...createdUnits,
      },

      armies: {
        ...current.armies,

        [army.id]:
          army,
      },

      recruitmentOrders: {
        ...current
          .recruitmentOrders,

        [order.id]: {
          ...current
            .recruitmentOrders[
              order.id
            ],

          status:
            "completed",
        },
      },

      kingdoms: {
        ...current.kingdoms,

        [army.ownerId]: {
          ...current
            .kingdoms[
              army.ownerId
            ],

          armyIds: [
            ...current
              .kingdoms[
                army.ownerId
              ]
              .armyIds,

            army.id,
          ],
        },
      },

      simulation: {
        ...current
          .simulation,

        entityPositions: {
          ...current
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
    })
  );
}