import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getAvailableSettlementResources,
  hasEnoughResources,
  reserveSettlementResources,
} from "@/lib/economy/reservations";

import {
  getFortificationDefinition,
} from "@/lib/military/fortification-balance";

import {
  getSettlementControllerId,
} from "@/lib/military/occupation";

import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import type {
  FortificationLevel,
  FortificationRepairOrder,
} from "@/types/military";

import type {
  ResourceStockpile,
} from "@/types/resources";

export type RepairFortificationError =
  | "SETTLEMENT_NOT_FOUND"
  | "ACTOR_NOT_FOUND"
  | "NOT_AUTHORIZED"
  | "FOREIGN_CONTROL"
  | "NO_FORTIFICATION"
  | "FORTIFICATION_ALREADY_FULL"
  | "FORTIFICATION_CONSTRUCTION_ACTIVE"
  | "FORTIFICATION_REPAIR_ACTIVE"
  | "INVALID_FORTIFICATION"
  | "INSUFFICIENT_RESOURCES";

export type RepairFortificationResult =
  | {
      ok: false;
      error:
        RepairFortificationError;
    }
  | {
      ok: true;
      order:
        FortificationRepairOrder;
    };

export interface RepairFortificationInput {
  settlementId:
    string;

  actorId?:
    string;
}

function clampIntegrity(
  value: number
): number {
  return Math.max(
    0,
    Math.min(
      100,
      value
    )
  );
}

function scaleRepairResources(
  fullCost:
    ResourceStockpile,
  damageRatio:
    number
): ResourceStockpile {
  return {
    food:
      Math.ceil(
        fullCost.food *
          damageRatio
      ),

    gold:
      Math.ceil(
        fullCost.gold *
          damageRatio
      ),

    wood:
      Math.ceil(
        fullCost.wood *
          damageRatio
      ),

    stone:
      Math.ceil(
        fullCost.stone *
          damageRatio
      ),

    metal:
      Math.ceil(
        fullCost.metal *
          damageRatio
      ),
  };
}

function canActorRepairSettlement(
  actorId:
    string,
  settlementId:
    string
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
    getSettlementControllerId(
      settlement
    )
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

export function repairFortification(
  input:
    RepairFortificationInput
): RepairFortificationResult {
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
    world.player
      .characterId;

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

  const controller =
    getSettlementControllerId(
      settlement
    );

  if (
    controller !==
    actor.kingdomId
  ) {
    return {
      ok: false,
      error:
        "FOREIGN_CONTROL",
    };
  }

  if (
    !canActorRepairSettlement(
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

  const level =
    settlement
      .fortificationLevel ??
    0;

  if (
    level === 0
  ) {
    return {
      ok: false,
      error:
        "NO_FORTIFICATION",
    };
  }

  const currentIntegrity =
    clampIntegrity(
      settlement
        .fortificationIntegrity ??
        100
    );

  if (
    currentIntegrity >=
    100
  ) {
    return {
      ok: false,
      error:
        "FORTIFICATION_ALREADY_FULL",
    };
  }

  const constructionActive =
    Object.values(
      world
        .fortificationOrders
    ).some(
      (order) =>
        order.settlementId ===
          settlement.id &&
        order.status ===
          "active"
    );

  if (
    constructionActive
  ) {
    return {
      ok: false,
      error:
        "FORTIFICATION_CONSTRUCTION_ACTIVE",
    };
  }

  const repairActive =
    Object.values(
      world
        .fortificationRepairOrders
    ).some(
      (order) =>
        order.settlementId ===
          settlement.id &&
        order.status ===
          "active"
    );

  if (
    repairActive
  ) {
    return {
      ok: false,
      error:
        "FORTIFICATION_REPAIR_ACTIVE",
    };
  }

  const definition =
    getFortificationDefinition(
      settlement.type,
      level as
        FortificationLevel
    );

  if (!definition) {
    return {
      ok: false,
      error:
        "INVALID_FORTIFICATION",
    };
  }

  const damageRatio =
    (100 -
      currentIntegrity) /
    100;

  const repairCost =
    scaleRepairResources(
      definition.cost,
      damageRatio
    );

  const available =
    getAvailableSettlementResources(
      settlement.id
    );

  if (
    !available ||
    !hasEnoughResources(
      available,
      repairCost
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
      repairCost
    );

  if (!reserved) {
    return {
      ok: false,
      error:
        "INSUFFICIENT_RESOURCES",
    };
  }

  const repairDays =
    Math.max(
      1,
      Math.ceil(
        definition
          .durationDays *
          damageRatio
      )
    );

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const order:
    FortificationRepairOrder = {
    id:
      `fortification-repair-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    settlementId:
      settlement.id,

    actorId,

    fortificationLevel:
      level as
        FortificationLevel,

    fromIntegrity:
      currentIntegrity,

    toIntegrity:
      100,

    startedAt:
      now,

    completesAt:
      now +
      repairDays *
        MINUTES_PER_DAY,

    reservedResources:
      repairCost,

    status:
      "active",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      fortificationRepairOrders: {
        ...current
          .fortificationRepairOrders,

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