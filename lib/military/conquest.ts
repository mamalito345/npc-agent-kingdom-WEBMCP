import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getSettlementControllerId,
} from "@/lib/military/occupation";

export type CaptureSettlementError =
  | "ARMY_NOT_FOUND"
  | "SETTLEMENT_NOT_FOUND"
  | "ARMY_NOT_AT_SETTLEMENT"
  | "ARMY_DESTROYED"
  | "ALREADY_CONTROLLED"
  | "HOSTILE_ARMY_PRESENT";

export type CaptureSettlementResult =
  | {
      ok: false;
      error:
        CaptureSettlementError;
    }
  | {
      ok: true;
      settlementId:
        string;
      previousControllerKingdomId:
        string;
      newControllerKingdomId:
        string;
      politicalOwnerKingdomId:
        string;
    };

function hasHostileArmyAtNode(
  nodeId: string,
  kingdomId: string
): boolean {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.armies
  ).some(
    (army) => {
      if (
        army.ownerId ===
        kingdomId
      ) {
        return false;
      }

      if (
        army.status ===
        "destroyed"
      ) {
        return false;
      }

      const position =
        world.simulation
          .entityPositions[
            army.id
          ];

      return (
        position?.kind ===
          "node" &&
        position.nodeId ===
          nodeId
      );
    }
  );
}

export function captureSettlement(
  armyId: string,
  settlementId: string
): CaptureSettlementResult {
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
        army.id
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

  const previousController =
    getSettlementControllerId(
      settlement
    );

  if (
    previousController ===
    army.ownerId
  ) {
    return {
      ok: false,
      error:
        "ALREADY_CONTROLLED",
    };
  }

  if (
    hasHostileArmyAtNode(
      settlement.locationId,
      army.ownerId
    )
  ) {
    return {
      ok: false,
      error:
        "HOSTILE_ARMY_PRESENT",
    };
  }

  const now =
    world.simulation
      .worldTimeMinutes;

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      settlements: {
        ...current
          .settlements,

        [settlementId]: {
          ...current
            .settlements[
              settlementId
            ],

          controllerKingdomId:
            army.ownerId,

          occupiedAt:
            army.ownerId ===
            settlement.kingdomId
              ? undefined
              : now,
        },
      },
    })
  );

  return {
    ok: true,

    settlementId,

    previousControllerKingdomId:
      previousController,

    newControllerKingdomId:
      army.ownerId,

    politicalOwnerKingdomId:
      settlement.kingdomId,
  };
}