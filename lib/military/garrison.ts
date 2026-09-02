import type {
  SettlementType,
} from "@/types/settlement";

export function getRecommendedGarrison(
  settlementType:
    SettlementType
): number {
  switch (
    settlementType
  ) {
    case "village":
    case "strategic_location":
      return 0;

    case "town":
      return 250;

    case "city":
      return 500;

    case "castle":
      return 500;

    case "capital":
      return 750;
  }
}

export function isUnderGarrisoned(
  currentSoldiers:
    number,
  settlementType:
    SettlementType
): boolean {
  return (
    currentSoldiers <
    getRecommendedGarrison(
      settlementType
    )
  );
}