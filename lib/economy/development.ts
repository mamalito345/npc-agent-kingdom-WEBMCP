import {
  getAvailableSettlementResources,
  hasEnoughResources,
} from "@/lib/economy/reservations";

import {
  getSettlementControllerId,
} from "@/lib/military/occupation";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  ResourceStockpile,
} from "@/types/resources";

import type {
  SettlementBuildingType,
  SettlementDevelopmentFocus,
  SettlementDevelopmentLevel,
  SettlementType,
} from "@/types/settlement";

const MAX_DEVELOPMENT_LEVEL:
  SettlementDevelopmentLevel =
  5;

const BASE_COST:
  ResourceStockpile = {
  food: 0,
  gold: 450,
  wood: 180,
  stone: 140,
  metal: 60,
};

const TYPE_COST_MULTIPLIER:
  Record<
    SettlementType,
    number
  > = {
  village: 0.75,
  town: 1,
  city: 1.3,
  capital: 1.55,
  castle: 1.2,
  strategic_location: 0.85,
};

const BUILDING_BY_FOCUS:
  Record<
    SettlementDevelopmentFocus,
    SettlementBuildingType
  > = {
  food: "farms",
  gold: "market",
  wood: "lumber_yard",
  stone: "quarry",
  metal: "mine",
};

export type DevelopSettlementError =
  | "SETTLEMENT_NOT_FOUND"
  | "NOT_CONTROLLER"
  | "MAX_DEVELOPMENT_REACHED"
  | "INVALID_FOCUS"
  | "INSUFFICIENT_RESOURCES";

export interface DevelopSettlementInput {
  settlementId: string;
  kingdomId: string;
  focus: SettlementDevelopmentFocus;
}

function isFocus(
  value:
    string
): value is SettlementDevelopmentFocus {
  return (
    value ===
      "food" ||
    value ===
      "gold" ||
    value ===
      "wood" ||
    value ===
      "stone" ||
    value ===
      "metal"
  );
}

export function getDevelopmentCost(
  level:
    SettlementDevelopmentLevel,
  settlementType:
    SettlementType =
    "town"
): ResourceStockpile {
  const levelMultiplier =
    1 +
    level *
      0.75;

  const typeMultiplier =
    TYPE_COST_MULTIPLIER[
      settlementType
    ];

  return {
    food: 0,
    gold:
      Math.round(
        BASE_COST.gold *
        levelMultiplier *
        typeMultiplier
      ),
    wood:
      Math.round(
        BASE_COST.wood *
        levelMultiplier *
        typeMultiplier
      ),
    stone:
      Math.round(
        BASE_COST.stone *
        levelMultiplier *
        typeMultiplier
      ),
    metal:
      Math.round(
        BASE_COST.metal *
        levelMultiplier *
        typeMultiplier
      ),
  };
}

export function developSettlement(
  input:
    DevelopSettlementInput
) {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      input.settlementId
    ];

  if (!settlement) {
    return {
      ok: false as const,
      error:
        "SETTLEMENT_NOT_FOUND" as const,
    };
  }

  if (
    getSettlementControllerId(
      settlement
    ) !==
    input.kingdomId
  ) {
    return {
      ok: false as const,
      error:
        "NOT_CONTROLLER" as const,
    };
  }

  if (
    !isFocus(
      input.focus
    )
  ) {
    return {
      ok: false as const,
      error:
        "INVALID_FOCUS" as const,
    };
  }

  const currentLevel =
    settlement
      .developmentLevel ??
    0;

  if (
    currentLevel >=
    MAX_DEVELOPMENT_LEVEL
  ) {
    return {
      ok: false as const,
      error:
        "MAX_DEVELOPMENT_REACHED" as const,
    };
  }

  const cost =
    getDevelopmentCost(
      currentLevel,
      settlement.type
    );

  const available =
    getAvailableSettlementResources(
      settlement.id
    );

  if (
    !available ||
    !hasEnoughResources(
      available,
      cost
    )
  ) {
    return {
      ok: false as const,
      error:
        "INSUFFICIENT_RESOURCES" as const,
    };
  }

  const before =
    settlement
      .dailyProduction[
        input.focus
      ];

  /*
   * Development is intentionally legible:
   * - a permanent +15% (minimum +2) increase to the chosen base output,
   * - one level of the related economic building,
   * - small prosperity recovery,
   * - small devastation recovery.
   *
   * The effective economy layer then applies settlement-wide development,
   * prosperity and specialization multipliers.
   */
  const gain =
    Math.max(
      2,
      Math.round(
        before *
        0.15
      )
    );

  const nextLevel =
    (
      currentLevel +
      1
    ) as
      SettlementDevelopmentLevel;

  const building =
    BUILDING_BY_FOCUS[
      input.focus
    ];

  const currentBuildingLevel =
    settlement
      .buildings?.[
        building
      ] ??
    0;

  const nextBuildingLevel =
    Math.min(
      5,
      currentBuildingLevel +
        1
    ) as
      0 |
      1 |
      2 |
      3 |
      4 |
      5;

  updateRuntimeWorldState(
    (
      current
    ) => {
      const currentSettlement =
        current.settlements[
          settlement.id
        ];

      return {
        ...current,

        settlements: {
          ...current.settlements,

          [settlement.id]: {
            ...currentSettlement,

            resources: {
              food:
                currentSettlement
                  .resources
                  .food -
                cost.food,

              gold:
                currentSettlement
                  .resources
                  .gold -
                cost.gold,

              wood:
                currentSettlement
                  .resources
                  .wood -
                cost.wood,

              stone:
                currentSettlement
                  .resources
                  .stone -
                cost.stone,

              metal:
                currentSettlement
                  .resources
                  .metal -
                cost.metal,
            },

            dailyProduction: {
              ...currentSettlement
                .dailyProduction,

              [input.focus]:
                currentSettlement
                  .dailyProduction[
                    input.focus
                  ] +
                gain,
            },

            buildings: {
              ...(
                currentSettlement
                  .buildings ??
                {}
              ),

              [building]:
                nextBuildingLevel,
            },

            prosperity:
              Math.min(
                100,
                (
                  currentSettlement
                    .prosperity ??
                  60
                ) +
                  3
              ),

            devastation:
              Math.max(
                0,
                (
                  currentSettlement
                    .devastation ??
                  0
                ) -
                  2
              ),

            developmentLevel:
              nextLevel,

            developmentFocus:
              input.focus,
          },
        },
      };
    }
  );

  return {
    ok: true as const,
    settlementId:
      settlement.id,
    focus:
      input.focus,
    building,
    fromLevel:
      currentLevel,
    toLevel:
      nextLevel,
    productionBefore:
      before,
    productionGain:
      gain,
    cost,
  };
}
