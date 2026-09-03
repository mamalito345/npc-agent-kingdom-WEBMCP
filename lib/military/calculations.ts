import {
  CAMPAIGN_UPKEEP,
  GARRISON_FOOD_MULTIPLIER,
  GARRISON_GOLD_MULTIPLIER,
  SOLDIERS_PER_BLOCK,
  UNIT_COMBAT_STRENGTH,
} from "@/lib/military/balance";

import type {
  ArmyStatus,
  UnitBlock,
} from "@/types/military";

export function getUnitSoldierCount(
  unit: UnitBlock
): number {
  if (
    unit.type ===
      "siege" ||
    unit.type ===
      "ship"
  ) {
    return 0;
  }

  return Math.max(
    0,

    Math.min(
      SOLDIERS_PER_BLOCK,

      unit.currentSoldiers
    )
  );
}

export function getUnitCombatStrength(
  unit: UnitBlock
): number {
  if (
    unit.type ===
      "siege" ||
    unit.type ===
      "ship"
  ) {
    return 0;
  }

  const soldiers =
    getUnitSoldierCount(
      unit
    );

  const ratio =
    soldiers /
    SOLDIERS_PER_BLOCK;

  return (
    UNIT_COMBAT_STRENGTH[
      unit.type
    ] * ratio
  );
}

export function getUnitFortifiedAttackStrength(
  unit: UnitBlock
): number {
  if (
    unit.type ===
    "ship"
  ) {
    return 0;
  }

  if (
    unit.type ===
    "siege"
  ) {
    return 2;
  }

  return getUnitCombatStrength(
    unit
  );
}

export function getArmyTotalSoldiers(
  units: UnitBlock[]
): number {
  return units.reduce(
    (
      total,
      unit
    ) =>
      total +
      getUnitSoldierCount(
        unit
      ),

    0
  );
}

export function getArmyDailyUpkeep(
  units: UnitBlock[],
  status: ArmyStatus =
    "field"
): {
  gold: number;
  food: number;
} {
  let gold = 0;

  let food = 0;

  for (
    const unit of units
  ) {
    const upkeep =
      CAMPAIGN_UPKEEP[
        unit.type
      ];

    if (!upkeep) {
      continue;
    }

    if (
      unit.type ===
      "siege"
    ) {
      gold +=
        upkeep.gold;

      food +=
        upkeep.food;

      continue;
    }

    if (
      unit.type ===
      "ship"
    ) {
      continue;
    }

    const soldiers =
      getUnitSoldierCount(
        unit
      );

    const ratio =
      soldiers /
      SOLDIERS_PER_BLOCK;

    gold +=
      upkeep.gold *
      ratio;

    food +=
      upkeep.food *
      ratio;
  }

  if (
    status ===
    "garrison"
  ) {
    gold *=
      GARRISON_GOLD_MULTIPLIER;

    food *=
      GARRISON_FOOD_MULTIPLIER;
  }

  return {
    gold,
    food,
  };
}