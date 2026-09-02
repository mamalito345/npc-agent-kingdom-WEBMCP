import {
  findRoute,
} from "@/lib/map/paths";

import {
  createMovement,
} from "@/lib/world/movement";

import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

export const ARMY_BASE_SPEED_KM_PER_HOUR =
  5;

export type MoveArmyError =
  | "ARMY_NOT_FOUND"
  | "ARMY_DESTROYED"
  | "ARMY_IN_BATTLE"
  | "ARMY_ALREADY_MOVING"
  | "ARMY_NOT_AT_NODE"
  | "DESTINATION_NOT_FOUND"
  | "ROUTE_NOT_FOUND"
  | "ALREADY_AT_DESTINATION";

export type MoveArmyResult =
  | {
      ok: false;
      error:
        MoveArmyError;
    }
  | {
      ok: true;
      movementId: string;
      estimatedArrivalAt:
        number;
    };

export function moveArmy(
  armyId: string,
  destinationNodeId: string
): MoveArmyResult {
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

  if (
    army.status ===
    "battle"
  ) {
    return {
      ok: false,
      error:
        "ARMY_IN_BATTLE",
    };
  }

  if (
    world.simulation
      .activeMovements[
        armyId
      ]
  ) {
    return {
      ok: false,
      error:
        "ARMY_ALREADY_MOVING",
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
      "node"
  ) {
    return {
      ok: false,
      error:
        "ARMY_NOT_AT_NODE",
    };
  }

  if (
    !world.locations[
      destinationNodeId
    ]
  ) {
    return {
      ok: false,
      error:
        "DESTINATION_NOT_FOUND",
    };
  }

  if (
    position.nodeId ===
    destinationNodeId
  ) {
    return {
      ok: false,
      error:
        "ALREADY_AT_DESTINATION",
    };
  }

  const route =
    findRoute(
      position.nodeId,
      destinationNodeId
    );

  if (!route) {
    return {
      ok: false,
      error:
        "ROUTE_NOT_FOUND",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const movement =
    createMovement(
      `army-movement-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,
      armyId,
      route,
      ARMY_BASE_SPEED_KM_PER_HOUR,
      now
    );

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      armies: {
        ...current.armies,

        [armyId]: {
          ...current
            .armies[
              armyId
            ],

          status:
            "field",
        },
      },

      simulation: {
        ...current.simulation,

        activeMovements: {
          ...current
            .simulation
            .activeMovements,

          [armyId]:
            movement,
        },
      },
    })
  );

  return {
    ok: true,

    movementId:
      movement.id,

    estimatedArrivalAt:
      movement
        .estimatedArrivalAt,
  };
}