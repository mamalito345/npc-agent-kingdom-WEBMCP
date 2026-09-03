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

import type {
  ActiveMovement,
} from "@/types/simulation";

export type TravelError =
  | "LOCATION_NOT_FOUND"
  | "CHARACTER_NOT_FOUND"
  | "ROUTE_NOT_FOUND"
  | "ALREADY_MOVING"
  | "NOT_AT_NODE"
  | "ALREADY_AT_DESTINATION";

export type BeginCharacterTravelResult =
  | {
      ok: false;

      error:
        TravelError;
    }
  | {
      ok: true;

      characterId:
        string;

      destinationId:
        string;

      departedAt:
        number;

      estimatedArrivalAt:
        number;

      durationMinutes:
        number;

      physicalDistanceKm:
        number;

      effectiveDistanceKm:
        number;

      movement:
        ActiveMovement;
    };

export function beginCharacterTravel(
  characterId:
    string,
  locationId:
    string
): BeginCharacterTravelResult {
  const destination =
    getLocation(
      locationId
    );

  if (!destination) {
    return {
      ok: false,

      error:
        "LOCATION_NOT_FOUND",
    };
  }

  const destinationNode =
    getMapNode(
      locationId
    );

  if (!destinationNode) {
    return {
      ok: false,

      error:
        "ROUTE_NOT_FOUND",
    };
  }

  const world =
    getRuntimeWorldState();

  const character =
    world.characters[
      characterId
    ];

  if (!character) {
    return {
      ok: false,

      error:
        "CHARACTER_NOT_FOUND",
    };
  }

  if (
    world.simulation
      .activeMovements[
        characterId
      ]
  ) {
    return {
      ok: false,

      error:
        "ALREADY_MOVING",
    };
  }

  const currentPosition =
    world.simulation
      .entityPositions[
        characterId
      ];

  if (
    !currentPosition ||
    currentPosition.kind !==
      "node"
  ) {
    return {
      ok: false,

      error:
        "NOT_AT_NODE",
    };
  }

  if (
    currentPosition.nodeId ===
    destinationNode.id
  ) {
    return {
      ok: false,

      error:
        "ALREADY_AT_DESTINATION",
    };
  }

  const route =
    findRoute(
      currentPosition.nodeId,
      destinationNode.id
    );

  if (!route) {
    return {
      ok: false,

      error:
        "ROUTE_NOT_FOUND",
    };
  }

  const departedAt =
    world.simulation
      .worldTimeMinutes;

  const durationMinutes =
    calculateTravelDurationMinutes(
      route,
      PLAYER_BASE_SPEED_KM_PER_HOUR
    );

  const sequence =
    allocateSimulationSequence();

  const movement =
    createMovement(
      `character-movement-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

      characterId,

      route,

      PLAYER_BASE_SPEED_KM_PER_HOUR,

      departedAt
    );

  setActiveMovement(
    movement
  );

  return {
    ok: true,

    characterId,

    destinationId:
      destinationNode.id,

    departedAt,

    estimatedArrivalAt:
      movement
        .estimatedArrivalAt,

    durationMinutes,

    physicalDistanceKm:
      route
        .totalDistanceKm,

    effectiveDistanceKm:
      route
        .effectiveDistanceKm,

    movement,
  };
}

export function beginTravelTo(
  locationId:
    string
): BeginCharacterTravelResult {
  const characterId =
    getRuntimeWorldState()
      .player
      .characterId;

  return beginCharacterTravel(
    characterId,
    locationId
  );
}

/*
 * Compatibility alias only.
 *
 * travelTo DOES NOT advance time.
 * It only starts physical movement.
 */
export const travelTo =
  beginTravelTo;