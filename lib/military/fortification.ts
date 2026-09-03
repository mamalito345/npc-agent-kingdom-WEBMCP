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
  getMaximumFortificationLevel,
} from "@/lib/military/fortification-balance";

import {
  getSettlementControllerId,
} from "@/lib/military/occupation";

import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import type {
  FortificationLevel,
  FortificationOrder,
} from "@/types/military";

export type FortifyError =
  | "SETTLEMENT_NOT_FOUND"
  | "ACTOR_NOT_FOUND"
  | "NOT_AUTHORIZED"
  | "FOREIGN_CONTROL"
  | "FORTIFICATION_ALREADY_ACTIVE"
  | "MAX_FORTIFICATION_REACHED"
  | "INVALID_TARGET_LEVEL"
  | "INSUFFICIENT_RESOURCES";

export type FortifyResult =
  | {
      ok: false;
      error:
        FortifyError;
    }
  | {
      ok: true;
      order:
        FortificationOrder;
    };

export interface FortifyInput {
  settlementId:
    string;

  actorId?:
    string;
}

function canActorFortifySettlement(
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

export function fortify(
  input:
    FortifyInput
): FortifyResult {
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
    !canActorFortifySettlement(
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

  const alreadyActive =
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
    alreadyActive
  ) {
    return {
      ok: false,
      error:
        "FORTIFICATION_ALREADY_ACTIVE",
    };
  }

  const currentLevel:
    FortificationLevel =
      settlement
        .fortificationLevel ??
      0;

  const maximumLevel =
    getMaximumFortificationLevel(
      settlement.type
    );

  if (
    currentLevel >=
    maximumLevel
  ) {
    return {
      ok: false,
      error:
        "MAX_FORTIFICATION_REACHED",
    };
  }

  const targetLevel =
    (currentLevel +
      1) as
      FortificationLevel;

  const definition =
    getFortificationDefinition(
      settlement.type,
      targetLevel
    );

  if (!definition) {
    return {
      ok: false,
      error:
        "INVALID_TARGET_LEVEL",
    };
  }

  const available =
    getAvailableSettlementResources(
      settlement.id
    );

  if (
    !available ||
    !hasEnoughResources(
      available,
      definition.cost
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
      definition.cost
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

  const order:
    FortificationOrder = {
    id:
      `fortification-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    settlementId:
      settlement.id,

    actorId,

    fromLevel:
      currentLevel,

    toLevel:
      targetLevel,

    startedAt:
      now,

    completesAt:
      now +
      definition
        .durationDays *
        MINUTES_PER_DAY,

    reservedResources:
      definition.cost,

    status:
      "active",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      fortificationOrders: {
        ...current
          .fortificationOrders,

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