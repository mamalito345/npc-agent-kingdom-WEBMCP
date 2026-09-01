import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getEffectiveEdgeDistance,
  getMapEdge,
} from "@/lib/map/graph";

import type { Route } from "@/types/map";

import type {
  ActiveMovement,
  Position,
  WorldMinute,
} from "@/types/simulation";

export const PLAYER_BASE_SPEED_KM_PER_HOUR = 8;

export function calculateTravelDurationMinutes(
  route: Route,
  speedKmPerHour: number
): number {
  if (route.totalDistanceKm <= 0) {
    return 0;
  }

  if (speedKmPerHour <= 0) {
    throw new Error(
      "Movement speed must be greater than zero."
    );
  }

  return Math.ceil(
    (route.totalDistanceKm /
      speedKmPerHour) *
      60
  );
}

export function createMovement(
  id: string,
  entityId: string,
  route: Route,
  speedKmPerHour: number,
  startedAt: WorldMinute
): ActiveMovement {
  const durationMinutes =
    calculateTravelDurationMinutes(
      route,
      speedKmPerHour
    );

  return {
    id,
    entityId,

    routeNodeIds: route.nodeIds,
    routeEdgeIds: route.edgeIds,

    currentEdgeIndex: 0,

    speedKmPerHour,

    startedAt,

    estimatedArrivalAt:
      startedAt + durationMinutes,

    destinationNodeId:
      route.nodeIds[
        route.nodeIds.length - 1
      ],
  };
}

function getMovementEdgeDistances(
  movement: ActiveMovement
): number[] {
  return movement.routeEdgeIds.map(
    (edgeId) => {
      const edge = getMapEdge(edgeId);

      if (!edge) {
        throw new Error(
          `Movement references unknown edge: ${edgeId}`
        );
      }

      return getEffectiveEdgeDistance(edge);
    }
  );
}

export function getMovementTotalDistanceKm(
  movement: ActiveMovement
): number {
  return getMovementEdgeDistances(
    movement
  ).reduce(
    (total, distance) =>
      total + distance,
    0
  );
}

export function getMovementPositionAtTime(
  movement: ActiveMovement,
  worldTime: WorldMinute
): Position {
  if (
    worldTime <= movement.startedAt ||
    movement.routeEdgeIds.length === 0
  ) {
    return {
      kind: "node",
      nodeId: movement.routeNodeIds[0],
    };
  }

  if (
    worldTime >=
    movement.estimatedArrivalAt
  ) {
    return {
      kind: "node",
      nodeId:
        movement.destinationNodeId,
    };
  }

  const totalDuration =
    movement.estimatedArrivalAt -
    movement.startedAt;

  const elapsed =
    worldTime -
    movement.startedAt;

  const timeProgress =
    elapsed / totalDuration;

  const edgeDistances =
    getMovementEdgeDistances(movement);

  const totalDistance =
    edgeDistances.reduce(
      (total, distance) =>
        total + distance,
      0
    );

  const travelledDistance =
    totalDistance * timeProgress;

  let cumulativeDistance = 0;

  for (
    let index = 0;
    index < edgeDistances.length;
    index += 1
  ) {
    const edgeDistance =
      edgeDistances[index];

    const edgeEnd =
      cumulativeDistance +
      edgeDistance;

    if (
      travelledDistance < edgeEnd
    ) {
      const distanceOnEdge =
        travelledDistance -
        cumulativeDistance;

      const progress =
        edgeDistance === 0
          ? 1
          : distanceOnEdge /
            edgeDistance;

      const edgeId =
        movement.routeEdgeIds[index];

      const edge =
        getMapEdge(edgeId);

      if (!edge) {
        throw new Error(
          `Unknown movement edge: ${edgeId}`
        );
      }

      const routeFromNode =
        movement.routeNodeIds[index];

      const direction =
        edge.fromNodeId ===
        routeFromNode
          ? "forward"
          : "backward";

      return {
        kind: "edge",
        edgeId,
        progress: Math.max(
          0,
          Math.min(1, progress)
        ),
        direction,
      };
    }

    cumulativeDistance = edgeEnd;
  }

  return {
    kind: "node",
    nodeId:
      movement.destinationNodeId,
  };
}

export function getNextMovementBoundaryTime(
  movement: ActiveMovement,
  currentTime: WorldMinute
): WorldMinute | undefined {
  const edgeDistances =
    getMovementEdgeDistances(movement);

  const totalDistance =
    edgeDistances.reduce(
      (total, distance) =>
        total + distance,
      0
    );

  const totalDuration =
    movement.estimatedArrivalAt -
    movement.startedAt;

  if (
    totalDistance <= 0 ||
    totalDuration <= 0
  ) {
    return undefined;
  }

  let cumulativeDistance = 0;

  for (const edgeDistance of edgeDistances) {
    cumulativeDistance += edgeDistance;

    const boundaryProgress =
      cumulativeDistance /
      totalDistance;

    const boundaryTime =
      Math.ceil(
        movement.startedAt +
          totalDuration *
            boundaryProgress
      );

    if (boundaryTime > currentTime) {
      return boundaryTime;
    }
  }

  return undefined;
}

export function getNextWorldMovementBoundaryTime(
  currentTime: WorldMinute
): WorldMinute | undefined {
  const movements = Object.values(
    getRuntimeWorldState()
      .simulation.activeMovements
  );

  let next:
    | WorldMinute
    | undefined;

  for (const movement of movements) {
    const boundary =
      getNextMovementBoundaryTime(
        movement,
        currentTime
      );

    if (boundary === undefined) {
      continue;
    }

    if (
      next === undefined ||
      boundary < next
    ) {
      next = boundary;
    }
  }

  return next;
}

export function advanceMovementPositionsTo(
  worldTime: WorldMinute
): void {
  updateRuntimeWorldState((current) => {
    const entityPositions = {
      ...current.simulation
        .entityPositions,
    };

    for (
      const movement of Object.values(
        current.simulation
          .activeMovements
      )
    ) {
      entityPositions[
        movement.entityId
      ] =
        getMovementPositionAtTime(
          movement,
          worldTime
        );
    }

    return {
      ...current,

      simulation: {
        ...current.simulation,
        entityPositions,
      },
    };
  });
}

export function resolveCompletedMovements(
  worldTime: WorldMinute
): void {
  updateRuntimeWorldState((current) => {
    const activeMovements = {
      ...current.simulation
        .activeMovements,
    };

    const entityPositions = {
      ...current.simulation
        .entityPositions,
    };

    let player = current.player;

    let characters =
      current.characters;

    let charactersChanged = false;

    for (
      const movement of Object.values(
        current.simulation
          .activeMovements
      )
    ) {
      if (
        movement.estimatedArrivalAt >
        worldTime
      ) {
        continue;
      }

      entityPositions[
        movement.entityId
      ] = {
        kind: "node",
        nodeId:
          movement.destinationNodeId,
      };

      delete activeMovements[
        movement.entityId
      ];

      if (
        movement.entityId ===
        current.player.characterId
      ) {
        player = {
          ...player,

          locationId:
            movement.destinationNodeId,
        };
      }

      const character =
        current.characters[
          movement.entityId
        ];

      if (character) {
        if (!charactersChanged) {
          characters = {
            ...current.characters,
          };

          charactersChanged = true;
        }

        characters[
          movement.entityId
        ] = {
          ...character,

          locationId:
            movement.destinationNodeId,
        };
      }
    }

    return {
      ...current,

      player,
      characters,

      simulation: {
        ...current.simulation,

        activeMovements,
        entityPositions,
      },
    };
  });
}