import type {
  ResourceStockpile,
} from "@/types/resources";

import type {
  FortificationLevel,
} from "@/types/military";

import type {
  SettlementType,
} from "@/types/settlement";

export interface FortificationDefinition {
  targetLevel:
    FortificationLevel;

  durationDays:
    number;

  cost:
    ResourceStockpile;
}

export const FORTIFICATION_DEFINITIONS:
  Record<
    Exclude<
      FortificationLevel,
      0
    >,
    FortificationDefinition
  > = {
  1: {
    targetLevel: 1,

    durationDays: 6,

    cost: {
      gold: 1000,
      food: 0,
      wood: 500,
      stone: 200,
      metal: 30,
    },
  },

  2: {
    targetLevel: 2,

    durationDays: 12,

    cost: {
      gold: 2600,
      food: 0,
      wood: 800,
      stone: 900,
      metal: 100,
    },
  },

  3: {
    targetLevel: 3,

    durationDays: 28,

    cost: {
      gold: 7500,
      food: 0,
      wood: 1400,
      stone: 2800,
      metal: 350,
    },
  },
};

/**
 * Castle-specific level 3 construction.
 *
 * Canonical Castle cost:
 * G4500 / W900 / S1600 / M200
 * Duration: 16 days
 */
export const CASTLE_LEVEL_3_DEFINITION:
  FortificationDefinition = {
  targetLevel: 3,

  durationDays: 16,

  cost: {
    gold: 4500,
    food: 0,
    wood: 900,
    stone: 1600,
    metal: 200,
  },
};

export function getMaximumFortificationLevel(
  settlementType:
    SettlementType
): FortificationLevel {
  switch (
    settlementType
  ) {
    case "village":
    case "strategic_location":
      return 1;

    case "town":
    case "city":
      return 2;

    case "castle":
    case "capital":
      return 3;
  }
}

export function getFortificationDefinition(
  settlementType:
    SettlementType,
  targetLevel:
    FortificationLevel
):
  | FortificationDefinition
  | undefined {
  if (
    targetLevel === 0
  ) {
    return undefined;
  }

  if (
    settlementType ===
      "castle" &&
    targetLevel === 3
  ) {
    return (
      CASTLE_LEVEL_3_DEFINITION
    );
  }

  return (
    FORTIFICATION_DEFINITIONS[
      targetLevel
    ]
  );
}