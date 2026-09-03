import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  ResourceStockpile,
} from "@/types/resources";

import type {
  Settlement,
  SettlementBuildingType,
  SettlementSpecialization,
} from "@/types/settlement";

export interface SettlementEconomicProfile {
  settlementId: string;
  prosperity: number;
  devastation: number;
  developmentLevel: number;
  specialization: SettlementSpecialization;
  developmentMultiplier: number;
  prosperityMultiplier: number;
  devastationMultiplier: number;
  effectiveProduction: ResourceStockpile;
  taxBaseGold: number;
  marketBaseGold: number;
}

const BASE_TAX_BY_TYPE = {
  capital: 62,
  city: 42,
  castle: 18,
  town: 25,
  village: 9,
  strategic_location: 0,
} as const;

const RESOURCE_BUILDING:
  Record<
    keyof ResourceStockpile,
    SettlementBuildingType | undefined
  > = {
  food:
    "farms",
  gold:
    "market",
  wood:
    "lumber_yard",
  stone:
    "quarry",
  metal:
    "mine",
};

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function round2(
  value: number
): number {
  return Math.round(
    value *
    100
  ) /
  100;
}

function specializationMultiplier(
  specialization:
    SettlementSpecialization,
  resource:
    keyof ResourceStockpile
): number {
  switch (
    specialization
  ) {
    case "farming":
      return resource ===
        "food"
        ? 1.28
        : 1;
    case "pastoral":
      return resource ===
        "food"
        ? 1.18
        : 1;
    case "logging":
      return resource ===
        "wood"
        ? 1.35
        : 1;
    case "mining":
      return resource ===
        "stone"
        ? 1.25
        : resource ===
            "metal"
          ? 1.35
          : 1;
    case "trade":
      return resource ===
        "gold"
        ? 1.28
        : 1;
    case "oasis":
      return resource ===
        "food"
        ? 1.2
        : resource ===
            "gold"
          ? 1.08
          : 1;
    case "military":
      return resource ===
        "stone" ||
        resource ===
          "metal"
        ? 1.08
        : 0.96;
    case "mixed":
    default:
      return 1.05;
  }
}

function buildingMultiplier(
  settlement:
    Settlement,
  resource:
    keyof ResourceStockpile
): number {
  const building =
    RESOURCE_BUILDING[
      resource
    ];

  if (!building) {
    return 1;
  }

  const level =
    settlement
      .buildings?.[
        building
      ] ??
    0;

  const perLevel =
    resource ===
    "gold"
      ? 0.09
      : resource ===
          "food"
        ? 0.1
        : 0.11;

  const warehouse =
    settlement
      .buildings
      ?.warehouse ??
    0;

  return (
    1 +
    level *
      perLevel +
    warehouse *
      0.015
  );
}

export function getEffectiveSettlementProduction(
  settlement:
    Settlement
): ResourceStockpile {
  const developmentLevel =
    settlement
      .developmentLevel ??
    0;

  const prosperity =
    clamp(
      settlement
        .prosperity ??
        60,
      0,
      100
    );

  const devastation =
    clamp(
      settlement
        .devastation ??
        0,
      0,
      100
    );

  const specialization =
    settlement
      .specialization ??
    "mixed";

  const developmentMultiplier =
    1 +
    developmentLevel *
      0.08;

  const prosperityMultiplier =
    0.78 +
    prosperity /
      220;

  const devastationMultiplier =
    Math.max(
      0.3,
      1 -
        devastation *
          0.007
    );

  const output =
    {} as
      ResourceStockpile;

  for (
    const resource
    of [
      "food",
      "gold",
      "wood",
      "stone",
      "metal",
    ] as const
  ) {
    output[
      resource
    ] =
      round2(
        settlement
          .dailyProduction[
            resource
          ] *
          developmentMultiplier *
          prosperityMultiplier *
          devastationMultiplier *
          specializationMultiplier(
            specialization,
            resource
          ) *
          buildingMultiplier(
            settlement,
            resource
          )
      );
  }

  return output;
}

export function getSettlementEconomicProfile(
  settlementId:
    string
): SettlementEconomicProfile {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    throw new Error(
      `SETTLEMENT_NOT_FOUND: ${settlementId}`
    );
  }

  const prosperity =
    clamp(
      settlement
        .prosperity ??
        60,
      0,
      100
    );

  const devastation =
    clamp(
      settlement
        .devastation ??
        0,
      0,
      100
    );

  const developmentLevel =
    settlement
      .developmentLevel ??
    0;

  const specialization =
    settlement
      .specialization ??
    "mixed";

  const effectiveProduction =
    getEffectiveSettlementProduction(
      settlement
    );

  const baseTax =
    BASE_TAX_BY_TYPE[
      settlement.type
    ];

  const taxBaseGold =
    effectiveProduction
      .gold *
      0.5 +
    baseTax *
      (
        0.65 +
        prosperity /
          140
      );

  const marketLevel =
    settlement
      .buildings
      ?.market ??
    0;

  const marketBaseGold =
    effectiveProduction
      .gold *
      (
        0.36 +
        marketLevel *
          0.045
      ) +
    baseTax *
      0.45;

  return {
    settlementId,
    prosperity,
    devastation,
    developmentLevel,
    specialization,
    developmentMultiplier:
      round2(
        1 +
        developmentLevel *
          0.08
      ),
    prosperityMultiplier:
      round2(
        0.78 +
        prosperity /
          220
      ),
    devastationMultiplier:
      round2(
        Math.max(
          0.3,
          1 -
            devastation *
              0.007
        )
      ),
    effectiveProduction,
    taxBaseGold:
      round2(
        taxBaseGold
      ),
    marketBaseGold:
      round2(
        marketBaseGold
      ),
  };
}

export function getKingdomSettlementEconomy(
  kingdomId:
    string
) {
  const world =
    getRuntimeWorldState();

  const profiles =
    Object.values(
      world.settlements
    )
      .filter(
        (
          settlement
        ) =>
          (
            settlement
              .controllerKingdomId ??
            settlement.kingdomId
          ) ===
          kingdomId
      )
      .map(
        (
          settlement
        ) =>
          getSettlementEconomicProfile(
            settlement.id
          )
      );

  return {
    kingdomId,
    settlementCount:
      profiles.length,
    effectiveProduction:
      profiles.reduce(
        (
          total,
          profile
        ) => ({
          food:
            total.food +
            profile
              .effectiveProduction
              .food,
          gold:
            total.gold +
            profile
              .effectiveProduction
              .gold,
          wood:
            total.wood +
            profile
              .effectiveProduction
              .wood,
          stone:
            total.stone +
            profile
              .effectiveProduction
              .stone,
          metal:
            total.metal +
            profile
              .effectiveProduction
              .metal,
        }),
        {
          food: 0,
          gold: 0,
          wood: 0,
          stone: 0,
          metal: 0,
        }
      ),
  };
}
