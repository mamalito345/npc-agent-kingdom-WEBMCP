import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  SACK_DAMAGE_DAYS,
  SACK_FOOD_REMOVAL,
  SACK_LOCAL_GOLD_REMOVAL,
  SACK_LOOT_EFFICIENCY,
  SACK_PRODUCTION_MULTIPLIER,
} from "@/lib/military/conquest-balance";

import {
  getArmyFoodLootCapacity,
} from "@/lib/military/loot";

import {
  getSettlementControllerId,
} from "@/lib/military/occupation";

import {
  refreshArmySupplyState,
} from "@/lib/military/supply";

import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

export type SackSettlementError =
  | "ARMY_NOT_FOUND"
  | "SETTLEMENT_NOT_FOUND"
  | "ARMY_NOT_AT_SETTLEMENT"
  | "NOT_CONTROLLED_BY_ARMY"
  | "NOT_OCCUPIED"
  | "ARMY_DESTROYED";

export function sackSettlement(
  armyId: string,
  settlementId: string
) {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return {
      ok: false as const,
      error:
        "ARMY_NOT_FOUND" as const,
    };
  }

  if (
    army.status ===
    "destroyed"
  ) {
    return {
      ok: false as const,
      error:
        "ARMY_DESTROYED" as const,
    };
  }

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    return {
      ok: false as const,
      error:
        "SETTLEMENT_NOT_FOUND" as const,
    };
  }

  const position =
    world.simulation
      .entityPositions[
        armyId
      ];

  if (
    !position ||
    position.kind !==
      "node" ||
    position.nodeId !==
      settlement.locationId
  ) {
    return {
      ok: false as const,
      error:
        "ARMY_NOT_AT_SETTLEMENT" as const,
    };
  }

  if (
    getSettlementControllerId(
      settlement
    ) !== army.ownerId
  ) {
    return {
      ok: false as const,
      error:
        "NOT_CONTROLLED_BY_ARMY" as const,
    };
  }

  if (
    settlement.kingdomId ===
    army.ownerId
  ) {
    return {
      ok: false as const,
      error:
        "NOT_OCCUPIED" as const,
    };
  }

  const foodRemoved =
    Math.floor(
      settlement
        .resources.food *
        SACK_FOOD_REMOVAL
    );

  const goldRemoved =
    Math.floor(
      settlement
        .resources.gold *
        SACK_LOCAL_GOLD_REMOVAL
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

  const goldLooted =
    Math.floor(
      goldRemoved *
        SACK_LOOT_EFFICIENCY
    );

  const now =
    world.simulation
      .worldTimeMinutes;

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      kingdoms: {
        ...current.kingdoms,

        [army.ownerId]: {
          ...current
            .kingdoms[
              army.ownerId
            ],

          treasury:
            current
              .kingdoms[
                army.ownerId
              ]
              .treasury +
            goldLooted,
        },
      },

      armies: {
        ...current.armies,

        [army.id]: {
          ...current.armies[
            army.id
          ],

          supply: {
            ...current
              .armies[
                army.id
              ]
              .supply,

            foodSupply:
              current
                .armies[
                  army.id
                ]
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
          ...current
            .settlements[
              settlement.id
            ],

          resources: {
            ...current
              .settlements[
                settlement.id
              ]
              .resources,

            food:
              Math.max(
                0,
                current
                  .settlements[
                    settlement.id
                  ]
                  .resources
                  .food -
                  foodRemoved
              ),

            gold:
              Math.max(
                0,
                current
                  .settlements[
                    settlement.id
                  ]
                  .resources
                  .gold -
                  goldRemoved
              ),
          },

          productionDamage: {
            multiplier:
              SACK_PRODUCTION_MULTIPLIER,

            until:
              now +
              SACK_DAMAGE_DAYS *
                MINUTES_PER_DAY,

            cause:
              "sack",
          },
        },
      },
    })
  );

  refreshArmySupplyState(
    army.id
  );

  return {
    ok: true as const,

    settlementId,

    foodRemoved,

    foodLooted,

    goldRemoved,

    goldLooted,

    productionMultiplier:
      SACK_PRODUCTION_MULTIPLIER,

    damageUntil:
      now +
      SACK_DAMAGE_DAYS *
        MINUTES_PER_DAY,
  };
}