import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getEffectiveEdgeDistance,
  getMapEdge,
} from "@/lib/map/graph";

import type {
  Route,
} from "@/types/map";

import type {
  ActiveMovement,
  Position,
  WorldMinute,
} from "@/types/simulation";

export const PLAYER_BASE_SPEED_KM_PER_HOUR =
  8;

export interface MovementEdgeTraversalWindow {
  movementId:
    string;

  entityId:
    string;

  edgeId:
    string;

  edgeIndex:
    number;

  startsAt:
    number;

  endsAt:
    number;

  direction:
    | "forward"
    | "backward";

  /*
   * Canonical edge progress.
   *
   * These values are relative to
   * edge.fromNodeId -> edge.toNodeId.
   */
  startProgress:
    number;

  endProgress:
    number;
}

export function calculateTravelDurationMinutes(
  route:
    Route,
  speedKmPerHour:
    number
): number {
  if (
    route.effectiveDistanceKm <=
    0
  ) {
    return 0;
  }

  if (
    speedKmPerHour <=
    0
  ) {
    throw new Error(
      "Movement speed must be greater than zero."
    );
  }

  return Math.ceil(
    (
      route.effectiveDistanceKm /
      speedKmPerHour
    ) *
      60
  );
}

export function createMovement(
  id:
    string,
  entityId:
    string,
  route:
    Route,
  speedKmPerHour:
    number,
  startedAt:
    WorldMinute
): ActiveMovement {
  if (
    route.nodeIds.length ===
    0
  ) {
    throw new Error(
      "Movement route must contain at least one node."
    );
  }

  const destinationNodeId =
    route.nodeIds[
      route.nodeIds.length -
        1
    ];

  if (!destinationNodeId) {
    throw new Error(
      "Movement destination node could not be resolved."
    );
  }

  const durationMinutes =
    calculateTravelDurationMinutes(
      route,
      speedKmPerHour
    );

  return {
    id,

    entityId,

    routeNodeIds: [
      ...route.nodeIds,
    ],

    routeEdgeIds: [
      ...route.edgeIds,
    ],

    currentEdgeIndex:
      0,

    speedKmPerHour,

    startedAt,

    estimatedArrivalAt:
      startedAt +
      durationMinutes,

    destinationNodeId,
  };
}

function getMovementEdgeDistances(
  movement:
    ActiveMovement
): number[] {
  return movement
    .routeEdgeIds
    .map(
      (edgeId) => {
        const edge =
          getMapEdge(
            edgeId
          );

        if (!edge) {
          throw new Error(
            `Movement references unknown edge: ${edgeId}`
          );
        }

        return getEffectiveEdgeDistance(
          edge
        );
      }
    );
}

export function getMovementTotalEffectiveDistanceKm(
  movement:
    ActiveMovement
): number {
  return getMovementEdgeDistances(
    movement
  ).reduce(
    (
      total,
      distance
    ) =>
      total +
      distance,
    0
  );
}

/*
 * Legacy name retained because older
 * modules may still import it.
 *
 * It represents effective movement
 * distance, not geographic distance.
 */
export const getMovementTotalDistanceKm =
  getMovementTotalEffectiveDistanceKm;

export function getMovementEdgeTraversalWindows(
  movement:
    ActiveMovement
): MovementEdgeTraversalWindow[] {
  const edgeDistances =
    getMovementEdgeDistances(
      movement
    );

  const totalDistance =
    edgeDistances.reduce(
      (
        total,
        distance
      ) =>
        total +
        distance,
      0
    );

  const totalDuration =
    movement
      .estimatedArrivalAt -
    movement.startedAt;

  if (
    totalDistance <=
      0 ||
    totalDuration <=
      0
  ) {
    return [];
  }

  const windows:
    MovementEdgeTraversalWindow[] =
    [];

  let cumulativeDistance =
    0;

  for (
    let index = 0;
    index <
      movement
        .routeEdgeIds
        .length;
    index += 1
  ) {
    const edgeId =
      movement
        .routeEdgeIds[
          index
        ];

    const routeFromNode =
      movement
        .routeNodeIds[
          index
        ];

    const edgeDistance =
      edgeDistances[
        index
      ];

    if (
      !edgeId ||
      !routeFromNode ||
      edgeDistance ===
        undefined
    ) {
      throw new Error(
        `Movement ${movement.id} has inconsistent route data.`
      );
    }

    const edge =
      getMapEdge(
        edgeId
      );

    if (!edge) {
      throw new Error(
        `Unknown movement edge: ${edgeId}`
      );
    }

    const startRatio =
      cumulativeDistance /
      totalDistance;

    cumulativeDistance +=
      edgeDistance;

    const endRatio =
      cumulativeDistance /
      totalDistance;

    const startsAt =
      movement.startedAt +
      totalDuration *
        startRatio;

    const endsAt =
      movement.startedAt +
      totalDuration *
        endRatio;

    const forward =
      edge.fromNodeId ===
      routeFromNode;

    windows.push({
      movementId:
        movement.id,

      entityId:
        movement.entityId,

      edgeId,

      edgeIndex:
        index,

      startsAt,

      endsAt,

      direction:
        forward
          ? "forward"
          : "backward",

      startProgress:
        forward
          ? 0
          : 1,

      endProgress:
        forward
          ? 1
          : 0,
    });
  }

  return windows;
}

export function getMovementPositionAtTime(
  movement:
    ActiveMovement,
  worldTime:
    WorldMinute
): Position {
  const firstNodeId =
    movement
      .routeNodeIds[
        0
      ];

  if (!firstNodeId) {
    throw new Error(
      `Movement ${movement.id} has no origin node.`
    );
  }

  if (
    worldTime <=
      movement.startedAt ||
    movement
      .routeEdgeIds
      .length ===
      0
  ) {
    return {
      kind:
        "node",

      nodeId:
        firstNodeId,
    };
  }

  if (
    worldTime >=
    movement
      .estimatedArrivalAt
  ) {
    return {
      kind:
        "node",

      nodeId:
        movement
          .destinationNodeId,
    };
  }

  const windows =
    getMovementEdgeTraversalWindows(
      movement
    );

  for (
    const window
    of windows
  ) {
    if (
      worldTime <
        window.startsAt ||
      worldTime >
        window.endsAt
    ) {
      continue;
    }

    const duration =
      window.endsAt -
      window.startsAt;

    const localProgress =
      duration <=
      0
        ? 1
        : (
            worldTime -
            window.startsAt
          ) /
          duration;

    const canonicalProgress =
      window.startProgress +
      (
        window.endProgress -
        window.startProgress
      ) *
        localProgress;

    return {
      kind:
        "edge",

      edgeId:
        window.edgeId,

      progress:
        Math.max(
          0,
          Math.min(
            1,
            canonicalProgress
          )
        ),

      direction:
        window.direction,
    };
  }

  return {
    kind:
      "node",

    nodeId:
      movement
        .destinationNodeId,
  };
}

export function getMovementEdgeIndexAtTime(
  movement:
    ActiveMovement,
  worldTime:
    WorldMinute
): number {
  const position =
    getMovementPositionAtTime(
      movement,
      worldTime
    );

  if (
    position.kind ===
    "edge"
  ) {
    const index =
      movement
        .routeEdgeIds
        .indexOf(
          position.edgeId
        );

    return Math.max(
      0,
      index
    );
  }

  if (
    worldTime >=
    movement
      .estimatedArrivalAt
  ) {
    return Math.max(
      0,
      movement
        .routeEdgeIds
        .length -
        1
    );
  }

  return 0;
}

export function getNextMovementBoundaryTime(
  movement:
    ActiveMovement,
  currentTime:
    WorldMinute
): WorldMinute | undefined {
  const windows =
    getMovementEdgeTraversalWindows(
      movement
    );

  for (
    const window
    of windows
  ) {
    const boundary =
      Math.ceil(
        window.endsAt
      );

    if (
      boundary >
      currentTime
    ) {
      return boundary;
    }
  }

  return undefined;
}

export function getNextWorldMovementBoundaryTime(
  currentTime:
    WorldMinute
): WorldMinute | undefined {
  const movements =
    Object.values(
      getRuntimeWorldState()
        .simulation
        .activeMovements
    );

  let next:
    WorldMinute |
    undefined;

  for (
    const movement
    of movements
  ) {
    const boundary =
      getNextMovementBoundaryTime(
        movement,
        currentTime
      );

    if (
      boundary ===
      undefined
    ) {
      continue;
    }

    if (
      next ===
        undefined ||
      boundary <
        next
    ) {
      next =
        boundary;
    }
  }

  return next;
}

export function advanceMovementPositionsTo(
  worldTime:
    WorldMinute
): void {
  updateRuntimeWorldState(
    (current) => {
      const entityPositions = {
        ...current
          .simulation
          .entityPositions,
      };

      const activeMovements = {
        ...current
          .simulation
          .activeMovements,
      };

      for (
        const movement
        of Object.values(
          current
            .simulation
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

        activeMovements[
          movement.entityId
        ] = {
          ...movement,

          currentEdgeIndex:
            getMovementEdgeIndexAtTime(
              movement,
              worldTime
            ),
        };
      }

      return {
        ...current,

        simulation: {
          ...current
            .simulation,

          entityPositions,

          activeMovements,
        },
      };
    }
  );
}

export function stopEntityMovement(
  entityId:
    string
): boolean {
  const world =
    getRuntimeWorldState();

  if (
    !world.simulation
      .activeMovements[
        entityId
      ]
  ) {
    return false;
  }

  /*
   * entityPositions already represents
   * the exact canonical position at the
   * current world time.
   *
   * Removing ActiveMovement therefore
   * leaves the entity physically where
   * it currently is.
   */
  updateRuntimeWorldState(
    (current) => {
      const activeMovements = {
        ...current
          .simulation
          .activeMovements,
      };

      delete activeMovements[
        entityId
      ];

      return {
        ...current,

        simulation: {
          ...current
            .simulation,

          activeMovements,
        },
      };
    }
  );

  return true;
}

export function resolveCompletedMovements(
  worldTime:
    WorldMinute
): void {
  updateRuntimeWorldState(
    (current) => {
      const activeMovements = {
        ...current
          .simulation
          .activeMovements,
      };

      const entityPositions = {
        ...current
          .simulation
          .entityPositions,
      };

      let player =
        current.player;

      let characters =
        current.characters;

      let charactersChanged =
        false;

      let armies =
        current.armies;

      let armiesChanged =
        false;

      for (
        const movement
        of Object.values(
          current
            .simulation
            .activeMovements
        )
      ) {
        if (
          movement
            .estimatedArrivalAt >
          worldTime
        ) {
          continue;
        }

        entityPositions[
          movement.entityId
        ] = {
          kind:
            "node",

          nodeId:
            movement
              .destinationNodeId,
        };

        delete activeMovements[
          movement.entityId
        ];

        if (
          movement.entityId ===
          current
            .player
            .characterId
        ) {
          player = {
            ...player,

            locationId:
              movement
                .destinationNodeId,
          };
        }

        const character =
          current.characters[
            movement.entityId
          ];

        if (character) {
          if (
            !charactersChanged
          ) {
            characters = {
              ...current
                .characters,
            };

            charactersChanged =
              true;
          }

          characters[
            movement.entityId
          ] = {
            ...character,

            locationId:
              movement
                .destinationNodeId,
          };
        }

        const army =
          current.armies[
            movement.entityId
          ];

        if (army) {
          if (
            !armiesChanged
          ) {
            armies = {
              ...current
                .armies,
            };

            armiesChanged =
              true;
          }

          const approachNodeId =
            movement
              .routeNodeIds
              .length >=
            2
              ? movement
                  .routeNodeIds[
                    movement
                      .routeNodeIds
                      .length -
                      2
                  ]
              : undefined;

          armies[
            movement.entityId
          ] = {
            ...army,

            arrivedFromNodeId:
              approachNodeId ??
              army.arrivedFromNodeId,
          };
        }
      }

      return {
        ...current,

        player,

        characters,

        armies,

        simulation: {
          ...current
            .simulation,

          activeMovements,

          entityPositions,
        },
      };
    }
  );
}