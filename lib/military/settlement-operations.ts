import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  RAID_DAMAGE_DAYS,
  RAID_FOOD_REMOVAL,
  RAID_GOLD_LOOT_EFFICIENCY,
  RAID_LOCAL_GOLD_REMOVAL,
  RAID_PRODUCTION_MULTIPLIER,
} from "@/lib/military/conquest-balance";

import {
  getArmyFoodLootCapacity,
} from "@/lib/military/loot";

import {
  refreshArmySupplyState,
} from "@/lib/military/supply";

import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import type {
  WorldMinute,
} from "@/types/simulation";

export function getNextSettlementOperationBoundary():
  WorldMinute | undefined {
  const world =
    getRuntimeWorldState();

  const active =
    Object.values(
      world
        .settlementOperations
    )
      .filter(
        (operation) =>
          operation.status ===
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

  return active[
    0
  ]?.completesAt;
}

export function processSettlementOperations(
  worldTime:
    WorldMinute
): void {
  const snapshot =
    getRuntimeWorldState();

  const operations =
    Object.values(
      snapshot
        .settlementOperations
    )
      .filter(
        (operation) =>
          operation.status ===
            "active" &&
          operation.completesAt <=
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
    const operation
    of operations
  ) {
    if (
      operation.type !==
      "raid"
    ) {
      continue;
    }

    const world =
      getRuntimeWorldState();

    const settlement =
      world.settlements[
        operation
          .settlementId
      ];

    const army =
      world.armies[
        operation.armyId
      ];

    if (
      !settlement ||
      !army ||
      army.status ===
        "destroyed"
    ) {
      updateRuntimeWorldState(
        (current) => ({
          ...current,

          settlementOperations: {
            ...current
              .settlementOperations,

            [operation.id]: {
              ...current
                .settlementOperations[
                  operation.id
                ],

              status:
                "cancelled",
            },
          },
        })
      );

      continue;
    }

    const position =
      world.simulation
        .entityPositions[
          army.id
        ];

    if (
      !position ||
      position.kind !==
        "node" ||
      position.nodeId !==
        settlement.locationId
    ) {
      updateRuntimeWorldState(
        (current) => ({
          ...current,

          settlementOperations: {
            ...current
              .settlementOperations,

            [operation.id]: {
              ...current
                .settlementOperations[
                  operation.id
                ],

              status:
                "cancelled",
            },
          },
        })
      );

      continue;
    }

    const foodRemoved =
      Math.floor(
        settlement
          .resources.food *
          RAID_FOOD_REMOVAL
      );

    const localGoldRemoved =
      Math.floor(
        settlement
          .resources.gold *
          RAID_LOCAL_GOLD_REMOVAL
      );

    const goldLooted =
      Math.floor(
        localGoldRemoved *
          RAID_GOLD_LOOT_EFFICIENCY
      );

    const foodCapacity =
      getArmyFoodLootCapacity(
        army.id,
        army.supply
          .foodSupply
      );

    const foodLooted =
      Math.min(
        foodRemoved,
        foodCapacity
      );

    updateRuntimeWorldState(
      (current) => {
        const currentArmy =
          current.armies[
            army.id
          ];

        const currentSettlement =
          current.settlements[
            settlement.id
          ];

        const kingdom =
          current.kingdoms[
            army.ownerId
          ];

        return {
          ...current,

          kingdoms:
            kingdom
              ? {
                  ...current
                    .kingdoms,

                  [army.ownerId]: {
                    ...kingdom,

                    treasury:
                      kingdom
                        .treasury +
                      goldLooted,
                  },
                }
              : current.kingdoms,

          armies: {
            ...current.armies,

            [army.id]: {
              ...currentArmy,

              supply: {
                ...currentArmy
                  .supply,

                foodSupply:
                  currentArmy
                    .supply
                    .foodSupply +
                  foodLooted,
              },
            },
          },

          settlements: {
            ...current
              .settlements,

            [settlement.id]: {
              ...currentSettlement,

              resources: {
                ...currentSettlement
                  .resources,

                food:
                  Math.max(
                    0,
                    currentSettlement
                      .resources
                      .food -
                      foodRemoved
                  ),

                gold:
                  Math.max(
                    0,
                    currentSettlement
                      .resources
                      .gold -
                      localGoldRemoved
                  ),
              },

              productionDamage: {
                multiplier:
                  RAID_PRODUCTION_MULTIPLIER,

                until:
                  worldTime +
                  RAID_DAMAGE_DAYS *
                    MINUTES_PER_DAY,

                cause:
                  "raid",
              },
            },
          },

          settlementOperations: {
            ...current
              .settlementOperations,

            [operation.id]: {
              ...current
                .settlementOperations[
                  operation.id
                ],

              status:
                "completed",
            },
          },
        };
      }
    );

    refreshArmySupplyState(
      army.id
    );
  }
}