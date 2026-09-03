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
  SettlementDevelopmentFocus,
  SettlementDevelopmentLevel,
} from "@/types/settlement";

const MAX_DEVELOPMENT_LEVEL:
  SettlementDevelopmentLevel =
  3;

const BASE_COST:
  ResourceStockpile = {
  food:
    0,

  gold:
    120,

  wood:
    80,

  stone:
    60,

  metal:
    30,
};

export type DevelopSettlementError =
  | "SETTLEMENT_NOT_FOUND"
  | "NOT_CONTROLLER"
  | "MAX_DEVELOPMENT_REACHED"
  | "INVALID_FOCUS"
  | "INSUFFICIENT_RESOURCES";

export interface DevelopSettlementInput {
  settlementId:
    string;

  kingdomId:
    string;

  focus:
    SettlementDevelopmentFocus;
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
    SettlementDevelopmentLevel
): ResourceStockpile {
  const multiplier =
    level + 1;

  return {
    food:
      BASE_COST.food *
      multiplier,

    gold:
      BASE_COST.gold *
      multiplier,

    wood:
      BASE_COST.wood *
      multiplier,

    stone:
      BASE_COST.stone *
      multiplier,

    metal:
      BASE_COST.metal *
      multiplier,
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
      ok:
        false as const,

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
      ok:
        false as const,

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
      ok:
        false as const,

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
      ok:
        false as const,

      error:
        "MAX_DEVELOPMENT_REACHED" as const,
    };
  }

  const cost =
    getDevelopmentCost(
      currentLevel
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
      ok:
        false as const,

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
   * Investment is intentionally predictable:
   * each level improves one chosen production branch by +20% of its current
   * output, with a minimum +1 so weak villages can still develop.
   */
  const gain =
    Math.max(
      1,
      Math.round(
        before *
          0.2
      )
    );

  const nextLevel =
    (
      currentLevel +
      1
    ) as
      SettlementDevelopmentLevel;

  updateRuntimeWorldState(
    (current) => {
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
    ok:
      true as const,

    settlementId:
      settlement.id,

    focus:
      input.focus,

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
