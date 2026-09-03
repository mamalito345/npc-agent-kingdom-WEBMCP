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

/*
 * Without this, every single completed recruitment order spawns a brand
 * new one-off army at the settlement, even when the same kingdom already
 * has an idle garrison sitting right there. Over a few recruitment cycles
 * that fragments a kingdom's forces into a pile of tiny standalone armies
 * the player has to manually MERGE together one at a time -- which is
 * exactly the "new army gathering works badly" complaint. If a stationary,
 * non-battling, non-lord-commanded army of the same kingdom is already at
 * this settlement's node, freshly recruited units join it directly instead
 * of spawning yet another fragment.
 */
function findMergeableGarrisonArmyId(
  kingdomId:
    string,
  nodeId:
    string
): string | undefined {
  const world =
    getRuntimeWorldState();

  const lordControlledArmyIds =
    new Set(
      Object.values(
        world.session.lords
          .profiles
      ).flatMap(
        (profile) =>
          profile
            .controlledArmyIds
      )
    );

  const candidate =
    Object.values(
      world.armies
    ).find((army) => {
      if (
        army.ownerId !==
        kingdomId
      ) {
        return false;
      }

      if (
        army.status ===
        "battle"
      ) {
        return false;
      }

      if (
        lordControlledArmyIds.has(
          army.id
        )
      ) {
        return false;
      }

      if (
        world.simulation
          .activeMovements[
            army.id
          ]
      ) {
        return false;
      }

      const position =
        world.simulation
          .entityPositions[
            army.id
          ];

      return (
        position?.kind ===
          "node" &&
        position.nodeId ===
          nodeId
      );
    });

  return candidate?.id;
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

  const mergeableArmyId =
    findMergeableGarrisonArmyId(
      settlement.kingdomId,
      settlement.locationId
    );

  if (mergeableArmyId) {
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

          [mergeableArmyId]: {
            ...current.armies[
              mergeableArmyId
            ],

            unitIds: [
              ...current.armies[
                mergeableArmyId
              ].unitIds,

              ...createdUnitIds,
            ],
          },
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
      })
    );

    return;
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