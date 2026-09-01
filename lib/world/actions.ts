import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  setActiveMovement,
} from "@/lib/world/runtime";

import {
  getLocation,
} from "@/lib/world/state";

import {
  getMapNode,
} from "@/lib/map/graph";

import {
  findRoute,
} from "@/lib/map/paths";

import {
  PLAYER_BASE_SPEED_KM_PER_HOUR,
  calculateTravelDurationMinutes,
  createMovement,
} from "@/lib/world/movement";

import {
  advanceWorldUntil,
} from "@/lib/world/simulation";

import type {
  ActiveMovement,
  SimulationInterrupt,
} from "@/types/simulation";

export type TravelError =
  | "LOCATION_NOT_FOUND"
  | "ROUTE_NOT_FOUND"
  | "ALREADY_MOVING";

export type BeginTravelResult =
  | {
      ok: false;
      error: TravelError;
    }
  | {
      ok: true;

      destinationId: string;

      departedAt: number;

      estimatedArrivalAt: number;

      durationMinutes: number;

      movement: ActiveMovement | null;
    };

export type TravelResult =
  | {
      ok: false;
      error: TravelError;
    }
  | {
      ok: true;

      destinationId: string;

      departedAt: number;

      arrivedAt: number | null;

      durationMinutes: number;

      interrupted: boolean;

      currentTime: number;

      interrupt?:
        SimulationInterrupt;
    };

export function beginTravelTo(
  locationId: string
): BeginTravelResult {
  const destination =
    getLocation(locationId);

  if (!destination) {
    return {
      ok: false,
      error: "LOCATION_NOT_FOUND",
    };
  }

  const destinationNode =
    getMapNode(locationId);

  if (!destinationNode) {
    return {
      ok: false,
      error: "ROUTE_NOT_FOUND",
    };
  }

  const world =
    getRuntimeWorldState();

  const playerCharacterId =
    world.player.characterId;

  const activeMovement =
    world.simulation
      .activeMovements[
      playerCharacterId
    ];

  if (activeMovement) {
    return {
      ok: false,
      error: "ALREADY_MOVING",
    };
  }

  const currentPosition =
    world.simulation
      .entityPositions[
      playerCharacterId
    ];

  if (
    !currentPosition ||
    currentPosition.kind !== "node"
  ) {
    return {
      ok: false,
      error: "ALREADY_MOVING",
    };
  }

  const departedAt =
    world.simulation
      .worldTimeMinutes;

  if (
    currentPosition.nodeId ===
    destinationNode.id
  ) {
    return {
      ok: true,

      destinationId:
        destinationNode.id,

      departedAt,

      estimatedArrivalAt:
        departedAt,

      durationMinutes: 0,

      movement: null,
    };
  }

  const route = findRoute(
    currentPosition.nodeId,
    destinationNode.id
  );

  if (!route) {
    return {
      ok: false,
      error: "ROUTE_NOT_FOUND",
    };
  }

  const durationMinutes =
    calculateTravelDurationMinutes(
      route,
      PLAYER_BASE_SPEED_KM_PER_HOUR
    );

  const sequence =
    allocateSimulationSequence();

  const movement =
    createMovement(
      `movement-${sequence
        .toString()
        .padStart(6, "0")}`,

      playerCharacterId,

      route,

      PLAYER_BASE_SPEED_KM_PER_HOUR,

      departedAt
    );

  setActiveMovement(movement);

  return {
    ok: true,

    destinationId:
      destinationNode.id,

    departedAt,

    estimatedArrivalAt:
      movement.estimatedArrivalAt,

    durationMinutes,

    movement,
  };
}

export function travelTo(
  locationId: string
): TravelResult {
  const startResult =
    beginTravelTo(locationId);

  if (!startResult.ok) {
    return startResult;
  }

  if (!startResult.movement) {
    return {
      ok: true,

      destinationId:
        startResult.destinationId,

      departedAt:
        startResult.departedAt,

      arrivedAt:
        startResult.departedAt,

      durationMinutes: 0,

      interrupted: false,

      currentTime:
        startResult.departedAt,
    };
  }

  const advanceResult =
    advanceWorldUntil(
      startResult.estimatedArrivalAt
    );

  if (
    !advanceResult.reachedTarget
  ) {
    return {
      ok: true,

      destinationId:
        startResult.destinationId,

      departedAt:
        startResult.departedAt,

      arrivedAt: null,

      durationMinutes:
        startResult.durationMinutes,

      interrupted: true,

      currentTime:
        advanceResult.currentTime,

      interrupt:
        advanceResult.interrupt,
    };
  }

  return {
    ok: true,

    destinationId:
      startResult.destinationId,

    departedAt:
      startResult.departedAt,

    arrivedAt:
      advanceResult.currentTime,

    durationMinutes:
      startResult.durationMinutes,

    interrupted: false,

    currentTime:
      advanceResult.currentTime,
  };
}