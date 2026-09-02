import {
  getSettlementMilitaryProfile,
} from "@/data/military/settlement-levels";

import {
  MOBILIZATION_CAPACITY_BY_LEVEL,
} from "@/lib/military/balance";

import type {
  Settlement,
} from "@/types/settlement";

import type {
  RecruitmentOrder,
  UnitType,
} from "@/types/military";

import type {
  WorldMinute,
} from "@/types/simulation";

const THIRTY_DAYS_MINUTES =
  30 * 24 * 60;

export function getSettlementMilitaryLevel(
  settlementId: string
): number | undefined {
  return (
    getSettlementMilitaryProfile(
      settlementId
    )?.level
  );
}

export function getSettlementMobilizationCapacity(
  settlementId: string
): number | undefined {
  const level =
    getSettlementMilitaryLevel(
      settlementId
    );

  if (!level) {
    return undefined;
  }

  return (
    MOBILIZATION_CAPACITY_BY_LEVEL[
      level
    ]
  );
}

/**
 * Package 3 simplified eligibility.
 *
 * Village:
 * infantry
 *
 * Town:
 * infantry + cavalry
 *
 * Castle:
 * infantry + cavalry + siege
 *
 * Capital:
 * infantry + cavalry + siege
 *
 * Strategic locations:
 * none
 *
 * Ships intentionally disabled.
 */
export function canSettlementRecruitUnit(
  settlement: Settlement,
  unitType: UnitType
): boolean {
  if (
    unitType ===
    "ship"
  ) {
    return false;
  }

  switch (
    settlement.type
  ) {
    case "village":
      return (
        unitType ===
        "infantry"
      );

    case "town":
      return (
        unitType ===
          "infantry" ||
        unitType ===
          "cavalry"
      );

    case "castle":
    case "capital":
      return (
        unitType ===
          "infantry" ||
        unitType ===
          "cavalry" ||
        unitType ===
          "siege"
      );

    case "strategic_location":
      return false;

    default:
      return false;
  }
}

export function getRecruitmentManpower(
  unitType: UnitType,
  blocks: number
): number {
  if (
    unitType ===
      "siege" ||
    unitType ===
      "ship"
  ) {
    return 0;
  }

  return (
    blocks *
    250
  );
}

export function getCommittedRecruitmentManpower(
  recruitmentOrders:
    Record<
      string,
      RecruitmentOrder
    >,
  settlementId: string,
  now: WorldMinute
): number {
  const earliestRelevant =
    now -
    THIRTY_DAYS_MINUTES;

  let total = 0;

  for (
    const order
    of Object.values(
      recruitmentOrders
    )
  ) {
    if (
      order.settlementId !==
      settlementId
    ) {
      continue;
    }

    if (
      order.status ===
      "cancelled"
    ) {
      continue;
    }

    if (
      order.startedAt <
      earliestRelevant
    ) {
      continue;
    }

    total +=
      getRecruitmentManpower(
        order.unitType,
        order.blocks
      );
  }

  return total;
}