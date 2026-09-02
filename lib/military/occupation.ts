import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  Settlement,
} from "@/types/settlement";

import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

export type OccupationStage =
  | "none"
  | "initial"
  | "establishing"
  | "consolidating"
  | "integrated";

export interface OccupationInfo {
  occupied:
    boolean;

  controllerKingdomId:
    string;

  politicalOwnerKingdomId:
    string;

  occupiedDays:
    number;

  stage:
    OccupationStage;

  economicMultiplier:
    number;
}

export function getSettlementControllerId(
  settlement:
    Settlement
): string {
  return (
    settlement
      .controllerKingdomId ??
    settlement.kingdomId
  );
}

export function getOccupationMultiplierForDays(
  occupiedDays:
    number
): number {
  if (
    occupiedDays < 0
  ) {
    return 1;
  }

  if (
    occupiedDays <= 7
  ) {
    return 0.25;
  }

  if (
    occupiedDays <= 20
  ) {
    return 0.5;
  }

  if (
    occupiedDays <= 40
  ) {
    return 0.75;
  }

  return 1;
}

export function getOccupationStageForDays(
  occupiedDays:
    number
): OccupationStage {
  if (
    occupiedDays <= 7
  ) {
    return "initial";
  }

  if (
    occupiedDays <= 20
  ) {
    return "establishing";
  }

  if (
    occupiedDays <= 40
  ) {
    return "consolidating";
  }

  return "integrated";
}

export function inspectSettlementOccupation(
  settlementId:
    string
):
  | {
      ok: false;
      error:
        "SETTLEMENT_NOT_FOUND";
    }
  | {
      ok: true;
      occupation:
        OccupationInfo;
    } {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    return {
      ok: false,
      error:
        "SETTLEMENT_NOT_FOUND",
    };
  }

  const controllerKingdomId =
    getSettlementControllerId(
      settlement
    );

  const occupied =
    controllerKingdomId !==
    settlement.kingdomId;

  if (
    !occupied ||
    settlement.occupiedAt ===
      undefined
  ) {
    return {
      ok: true,

      occupation: {
        occupied:
          false,

        controllerKingdomId,

        politicalOwnerKingdomId:
          settlement.kingdomId,

        occupiedDays:
          0,

        stage:
          "none",

        economicMultiplier:
          1,
      },
    };
  }

  const elapsed =
    Math.max(
      0,
      world.simulation
        .worldTimeMinutes -
        settlement.occupiedAt
    );

  const occupiedDays =
    Math.floor(
      elapsed /
        MINUTES_PER_DAY
    );

  return {
    ok: true,

    occupation: {
      occupied:
        true,

      controllerKingdomId,

      politicalOwnerKingdomId:
        settlement.kingdomId,

      occupiedDays,

      stage:
        getOccupationStageForDays(
          occupiedDays
        ),

      economicMultiplier:
        getOccupationMultiplierForDays(
          occupiedDays
        ),
    },
  };
}