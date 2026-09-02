import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  RECRUITMENT_DEFINITIONS,
  getConcurrentRecruitmentSlots,
} from "@/lib/military/balance";

import {
  canSettlementRecruitUnit,
  getCommittedRecruitmentManpower,
  getRecruitmentManpower,
  getSettlementMilitaryLevel,
  getSettlementMobilizationCapacity,
} from "@/lib/military/settlement-capacity";

import {
  getAvailableSettlementResources,
  hasEnoughResources,
  multiplyResources,
  reserveSettlementResources,
} from "@/lib/economy/reservations";

import type {
  RecruitmentOrder,
  UnitType,
} from "@/types/military";

export type RecruitUnitsError =
  | "INVALID_BLOCK_COUNT"
  | "SETTLEMENT_NOT_FOUND"
  | "ACTOR_NOT_FOUND"
  | "NOT_AUTHORIZED"
  | "UNIT_NOT_RECRUITABLE"
  | "UNIT_NOT_ELIGIBLE"
  | "MILITARY_PROFILE_NOT_FOUND"
  | "INSUFFICIENT_RESOURCES"
  | "RECRUITMENT_SLOT_LIMIT"
  | "MOBILIZATION_CAPACITY_EXCEEDED";

export type RecruitUnitsResult =
  | {
      ok: false;
      error:
        RecruitUnitsError;
    }
  | {
      ok: true;
      order:
        RecruitmentOrder;
    };

export interface RecruitUnitsInput {
  settlementId: string;

  unitType: UnitType;

  blocks: number;

  actorId?: string;
}

function canActorRecruitAtSettlement(
  actorId: string,
  settlementId: string
): boolean {
  const world =
    getRuntimeWorldState();

  const actor =
    world.characters[
      actorId
    ];

  const settlement =
    world.settlements[
      settlementId
    ];

  if (
    !actor ||
    !settlement
  ) {
    return false;
  }

  if (
    actor.kingdomId !==
    settlement.kingdomId
  ) {
    return false;
  }

  if (
    actor.rank ===
    "king"
  ) {
    return true;
  }

  return (
    settlement.ownerId ===
    actor.id
  );
}

function canUseRecruitmentSlot(
  settlementId: string,
  unitType: UnitType
): boolean {
  const world =
    getRuntimeWorldState();

  const level =
    getSettlementMilitaryLevel(
      settlementId
    );

  if (!level) {
    return false;
  }

  const baseSlots =
    getConcurrentRecruitmentSlots(
      level
    );

  const activeOrders =
    Object.values(
      world.recruitmentOrders
    ).filter(
      (order) =>
        order.settlementId ===
          settlementId &&
        order.status ===
          "active"
    );

  if (
    activeOrders.length <
    baseSlots
  ) {
    return true;
  }

  /**
   * Castle receives one additional
   * siege preparation slot.
   */
  const settlement =
    world.settlements[
      settlementId
    ];

  if (
    unitType !==
      "siege" ||
    settlement?.type !==
      "castle"
  ) {
    return false;
  }

  const activeSiegeOrders =
    activeOrders.filter(
      (order) =>
        order.unitType ===
        "siege"
    );

  return (
    activeOrders.length <
      baseSlots + 1 &&
    activeSiegeOrders.length <
      1
  );
}

export function recruitUnits(
  input: RecruitUnitsInput
): RecruitUnitsResult {
  if (
    !Number.isInteger(
      input.blocks
    ) ||
    input.blocks <= 0
  ) {
    return {
      ok: false,
      error:
        "INVALID_BLOCK_COUNT",
    };
  }

  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      input.settlementId
    ];

  if (!settlement) {
    return {
      ok: false,
      error:
        "SETTLEMENT_NOT_FOUND",
    };
  }

  const actorId =
    input.actorId ??
    world.player.characterId;

  const actor =
    world.characters[
      actorId
    ];

  if (!actor) {
    return {
      ok: false,
      error:
        "ACTOR_NOT_FOUND",
    };
  }

  if (
    !canActorRecruitAtSettlement(
      actorId,
      settlement.id
    )
  ) {
    return {
      ok: false,
      error:
        "NOT_AUTHORIZED",
    };
  }

  const definition =
    RECRUITMENT_DEFINITIONS[
      input.unitType
    ];

  if (!definition) {
    return {
      ok: false,
      error:
        "UNIT_NOT_RECRUITABLE",
    };
  }

  if (
    !canSettlementRecruitUnit(
      settlement,
      input.unitType
    )
  ) {
    return {
      ok: false,
      error:
        "UNIT_NOT_ELIGIBLE",
    };
  }

  const level =
    getSettlementMilitaryLevel(
      settlement.id
    );

  const capacity =
    getSettlementMobilizationCapacity(
      settlement.id
    );

  if (
    !level ||
    capacity === undefined
  ) {
    return {
      ok: false,
      error:
        "MILITARY_PROFILE_NOT_FOUND",
    };
  }

  const newManpower =
    getRecruitmentManpower(
      input.unitType,
      input.blocks
    );

  const alreadyCommitted =
    getCommittedRecruitmentManpower(
      world.recruitmentOrders,
      settlement.id,
      world.simulation
        .worldTimeMinutes
    );

  if (
    alreadyCommitted +
      newManpower >
    capacity
  ) {
    return {
      ok: false,
      error:
        "MOBILIZATION_CAPACITY_EXCEEDED",
    };
  }

  if (
    !canUseRecruitmentSlot(
      settlement.id,
      input.unitType
    )
  ) {
    return {
      ok: false,
      error:
        "RECRUITMENT_SLOT_LIMIT",
    };
  }

  const totalCost =
    multiplyResources(
      definition.cost,
      input.blocks
    );

  const available =
    getAvailableSettlementResources(
      settlement.id
    );

  if (
    !available ||
    !hasEnoughResources(
      available,
      totalCost
    )
  ) {
    return {
      ok: false,
      error:
        "INSUFFICIENT_RESOURCES",
    };
  }

  const reserved =
    reserveSettlementResources(
      settlement.id,
      totalCost
    );

  if (!reserved) {
    return {
      ok: false,
      error:
        "INSUFFICIENT_RESOURCES",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const orderId =
    `recruitment-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const order:
    RecruitmentOrder = {
    id: orderId,

    settlementId:
      settlement.id,

    actorId,

    unitType:
      input.unitType,

    blocks:
      input.blocks,

    startedAt:
      now,

    completesAt:
      now +
      definition.durationDays *
        24 *
        60,

    reservedResources:
      totalCost,

    status:
      "active",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      recruitmentOrders: {
        ...current
          .recruitmentOrders,

        [order.id]:
          order,
      },
    })
  );

  return {
    ok: true,
    order,
  };
}