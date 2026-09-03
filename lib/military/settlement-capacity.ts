import {
  getSettlementMilitaryProfile,
} from "@/data/military/settlement-levels";

import {
  MOBILIZATION_CAPACITY_BY_LEVEL,
} from "@/lib/military/balance";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

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
  30 *
  24 *
  60;

function inferredMilitaryLevel(
  settlement:
    Settlement
): number {
  const development =
    settlement
      .developmentLevel ??
    0;

  switch (
    settlement.type
  ) {
    case "capital":
      return Math.min(
        10,
        8 +
          Math.floor(
            development /
            3
          )
      );

    case "city":
      return Math.min(
        9,
        6 +
          Math.floor(
            development /
            2
          )
      );

    case "castle":
      return Math.min(
        9,
        6 +
          Math.floor(
            (
              settlement
                .fortificationLevel ??
              0
            ) /
            2
          )
      );

    case "town":
      return Math.min(
        7,
        4 +
          Math.floor(
            development /
            2
          )
      );

    case "village":
      return Math.min(
        4,
        2 +
          Math.floor(
            development /
            3
          )
      );

    case "strategic_location":
      return 0;
  }
}

export function getSettlementMilitaryLevel(
  settlementId:
    string
): number | undefined {
  const explicit =
    getSettlementMilitaryProfile(
      settlementId
    )?.level;

  if (explicit) {
    return explicit;
  }

  const settlement =
    getRuntimeWorldState()
      .settlements[
        settlementId
      ];

  if (!settlement) {
    return undefined;
  }

  const inferred =
    inferredMilitaryLevel(
      settlement
    );

  return inferred >
    0
      ? inferred
      : undefined;
}

export function getSettlementMobilizationCapacity(
  settlementId:
    string
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
    ] ??
    MOBILIZATION_CAPACITY_BY_LEVEL[
      10
    ]
  );
}

export function canSettlementRecruitUnit(
  settlement:
    Settlement,
  unitType:
    UnitType
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

    case "city":
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
  }
}

export function getRecruitmentManpower(
  unitType:
    UnitType,
  blocks:
    number
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

/**
 * Recruitment cost scaling.
 *
 * A more developed settlement (higher inferred/explicit military level)
 * has better logistics, forges and quartermasters, so recruiting there
 * is cheaper per block. Conversely, a settlement that has already
 * mobilized heavily inside the rolling 30-day window (tracked by
 * getCommittedRecruitmentManpower, the same figure that caps total
 * mobilization capacity) is running low on willing/available manpower,
 * so further recruitment there costs progressively more. This applies
 * identically to every kingdom — human, GM-controlled or actor-LLM —
 * since it only reads canonical settlement/order state.
 */
export function getRecruitmentCostMultiplier(
  settlementId:
    string,
  recruitmentOrders:
    Record<
      string,
      RecruitmentOrder
    >,
  now:
    WorldMinute
): number {
  const level =
    getSettlementMilitaryLevel(
      settlementId
    );

  const levelDiscount =
    level
      ? Math.max(
          0.7,
          1 -
            (
              level -
              1
            ) *
              0.03
        )
      : 1;

  const capacity =
    getSettlementMobilizationCapacity(
      settlementId
    );

  const committed =
    getCommittedRecruitmentManpower(
      recruitmentOrders,
      settlementId,
      now
    );

  const pressureRatio =
    capacity &&
    capacity >
      0
      ? Math.min(
          1,
          committed /
            capacity
        )
      : 0;

  const pressureSurcharge =
    1 +
    pressureRatio *
      0.6;

  return (
    levelDiscount *
    pressureSurcharge
  );
}

export function getCommittedRecruitmentManpower(
  recruitmentOrders:
    Record<
      string,
      RecruitmentOrder
    >,
  settlementId:
    string,
  now:
    WorldMinute
): number {
  const earliestRelevant =
    now -
    THIRTY_DAYS_MINUTES;

  let total =
    0;

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
