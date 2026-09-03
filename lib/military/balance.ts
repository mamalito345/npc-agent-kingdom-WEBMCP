import type {
  ResourceStockpile,
} from "@/types/resources";

import type {
  UnitType,
} from "@/types/military";

export const SOLDIERS_PER_BLOCK =
  250;

export const TARGET_SUPPLY_DAYS =
  7;

export const MAX_SUPPLY_DAYS =
  14;

export const CRITICAL_SUPPLY_DAYS =
  3;

export interface RecruitmentDefinition {
  cost: ResourceStockpile;

  durationDays: number;
}

export const RECRUITMENT_DEFINITIONS: Record<
  UnitType,
  RecruitmentDefinition | null
> = {
  infantry: {
    cost: {
      gold: 700,

      food: 350,

      wood: 0,

      stone: 0,

      metal: 25,
    },

    durationDays: 4,
  },

  cavalry: {
    cost: {
      gold: 2200,

      food: 650,

      wood: 0,

      stone: 0,

      metal: 120,
    },

    durationDays: 10,
  },

  siege: {
    cost: {
      gold: 1600,

      food: 200,

      wood: 500,

      stone: 0,

      metal: 140,
    },

    durationDays: 12,
  },

  ship: null,
};

export interface DailyUpkeep {
  gold: number;

  food: number;
}

export const CAMPAIGN_UPKEEP: Record<
  UnitType,
  DailyUpkeep | null
> = {
  infantry: {
    gold: 32,

    food: 65,
  },

  cavalry: {
    gold: 90,

    food: 95,
  },

  siege: {
    gold: 50,

    food: 40,
  },

  ship: null,
};

export const UNIT_COMBAT_STRENGTH: Record<
  UnitType,
  number
> = {
  infantry: 1,

  cavalry: 2,

  siege: 0,

  ship: 0,
};

export const SIEGE_FORTRESS_STRENGTH =
  2;

export const GARRISON_GOLD_MULTIPLIER =
  0.6;

export const GARRISON_FOOD_MULTIPLIER =
  0.7;

export const MOBILIZATION_CAPACITY_BY_LEVEL: Record<
  number,
  number
> = {
  1: 250,
  2: 250,
  3: 500,
  4: 500,
  5: 750,
  6: 750,
  7: 1000,
  8: 1000,
  9: 1250,
  10: 1500,
};

export function getConcurrentRecruitmentSlots(
  level: number
): number {
  if (
    level <= 3
  ) {
    return 1;
  }

  if (
    level <= 9
  ) {
    return 2;
  }

  return 3;
}

export function isLandRecruitableUnit(
  unitType: UnitType
): boolean {
  return (
    unitType !==
    "ship"
  );
}