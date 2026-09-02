import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import {
  RAID_DURATION_DAYS,
} from "@/lib/military/conquest-balance";

import {
  getSettlementControllerId,
} from "@/lib/military/occupation";

import type {
  SettlementOperation,
} from "@/types/military";

export type RaidSettlementError =
  | "ARMY_NOT_FOUND"
  | "SETTLEMENT_NOT_FOUND"
  | "ARMY_NOT_AT_SETTLEMENT"
  | "ARMY_DESTROYED"
  | "FRIENDLY_SETTLEMENT"
  | "OPERATION_ALREADY_ACTIVE";

export function raidSettlement(
  armyId: string,
  settlementId: string
):
  | {
      ok: false;
      error:
        RaidSettlementError;
    }
  | {
      ok: true;
      operation:
        SettlementOperation;
    } {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  if (
    army.status ===
    "destroyed"
  ) {
    return {
      ok: false,
      error:
        "ARMY_DESTROYED",
    };
  }

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

  const position =
    world.simulation
      .entityPositions[
        armyId
      ];

  if (
    !position ||
    position.kind !==
      "node" ||
    position.nodeId !==
      settlement.locationId
  ) {
    return {
      ok: false,
      error:
        "ARMY_NOT_AT_SETTLEMENT",
    };
  }

  if (
    getSettlementControllerId(
      settlement
    ) === army.ownerId
  ) {
    return {
      ok: false,
      error:
        "FRIENDLY_SETTLEMENT",
    };
  }

  const active =
    Object.values(
      world
        .settlementOperations
    ).some(
      (operation) =>
        operation.armyId ===
          armyId &&
        operation.status ===
          "active"
    );

  if (active) {
    return {
      ok: false,
      error:
        "OPERATION_ALREADY_ACTIVE",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const startedAt =
    world.simulation
      .worldTimeMinutes;

  const operation:
    SettlementOperation = {
    id:
      `settlement-op-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    type:
      "raid",

    armyId,

    settlementId,

    startedAt,

    completesAt:
      startedAt +
      RAID_DURATION_DAYS *
        MINUTES_PER_DAY,

    status:
      "active",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      settlementOperations: {
        ...current
          .settlementOperations,

        [operation.id]:
          operation,
      },
    })
  );

  return {
    ok: true,
    operation,
  };
}