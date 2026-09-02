import type {
  CommanderRating,
  MoraleState,
  SupplyState,
  TerrainDefense,
} from "@/types/military";

export function getCommanderModifier(
  rating:
    CommanderRating
): number {
  switch (rating) {
    case "poor":
      return 0;

    case "average":
      return 1;

    case "good":
      return 2;

    case "excellent":
      return 3;
  }
}

export function getMoraleModifier(
  morale:
    MoraleState
): number {
  switch (morale) {
    case "high":
      return 1;

    case "normal":
      return 0;

    case "low":
      return -1;

    case "broken":
      return -2;
  }
}

export function getSupplyModifier(
  supply:
    SupplyState
): number {
  switch (supply) {
    case "supplied":
      return 0;

    case "low_supply":
      return -1;

    case "critical_supply":
    case "starving":
      return -2;
  }
}

export function getTerrainModifier(
  terrain:
    TerrainDefense
): number {
  switch (terrain) {
    case "normal":
      return 0;

    case "defensive":
      return 1;

    case "strong":
      return 2;
  }
}