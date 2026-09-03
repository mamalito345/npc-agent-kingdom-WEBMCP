import {
  findRoute,
} from "@/lib/map/paths";

import {
  getMapNode,
} from "@/lib/map/graph";

import {
  isPlayableStrategicNode,
} from "@/lib/map/strategic-nodes";

import {
  createMovement,
} from "@/lib/world/movement";

import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmyComposition,
} from "@/lib/military/battle-tactics";

export const ARMY_BASE_SPEED_KM_PER_HOUR =
  5;

/*
 * Army speed now depends on size and composition instead of every
 * army marching at an identical flat rate:
 *  - A tiny force (a scout troop, a lone commander's escort) moves
 *    noticeably faster than a full army; a huge host of thousands
 *    moves noticeably slower -- but bounded to roughly a 2.5x spread
 *    between a 1-soldier and a 10,000-soldier force, never "light
 *    speed" for one man nor a crawl for a real army.
 *  - Cavalry-heavy forces move faster than pure infantry; siege
 *    trains slow a force down (dragging siege equipment is slow),
 *    matching the real tactical trade-off of bringing siege engines.
 */
const MAX_SIZE_SPEED_MULTIPLIER = 1.35;
const MIN_SIZE_SPEED_MULTIPLIER = 0.55;
const SPEED_REFERENCE_SOLDIERS = 10000;

function sizeSpeedMultiplier(
  totalSoldiers: number
): number {
  const clampedSoldiers =
    Math.max(
      1,
      Math.min(
        SPEED_REFERENCE_SOLDIERS,
        totalSoldiers
      )
    );

  // Interpolate on a log scale (1 .. 10,000 spans 4 orders of
  // magnitude) so the falloff feels gradual, not a cliff.
  const t =
    Math.log(
      clampedSoldiers
    ) /
    Math.log(
      SPEED_REFERENCE_SOLDIERS
    );

  return (
    MAX_SIZE_SPEED_MULTIPLIER -
    t *
      (
        MAX_SIZE_SPEED_MULTIPLIER -
        MIN_SIZE_SPEED_MULTIPLIER
      )
  );
}

export function getArmyEffectiveSpeedKmPerHour(
  armyId: string
): number {
  const composition =
    getArmyComposition([
      armyId,
    ]);

  if (
    composition.totalSoldiers <=
    0
  ) {
    return ARMY_BASE_SPEED_KM_PER_HOUR;
  }

  const cavalryShare =
    composition.cavalry /
    composition.totalSoldiers;

  const siegeShare =
    composition.siege /
    composition.totalSoldiers;

  const compositionMultiplier =
    1 +
    cavalryShare * 0.25 -
    siegeShare * 0.35;

  const multiplier =
    sizeSpeedMultiplier(
      composition.totalSoldiers
    ) *
    Math.max(
      0.4,
      compositionMultiplier
    );

  return (
    ARMY_BASE_SPEED_KM_PER_HOUR *
    multiplier
  );
}

export type MoveArmyError =
  | "ARMY_NOT_FOUND"
  | "ARMY_DESTROYED"
  | "ARMY_IN_BATTLE"
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
      movementId:
        string;
      estimatedArrivalAt:
        number;
      physicalDistanceKm:
        number;
      effectiveDistanceKm:
        number;
    };

export function stopArmyMovement(
  armyId:
    string
): boolean {
  const world =
    getRuntimeWorldState();

  const movement =
    world.simulation
      .activeMovements[
        armyId
      ];

  if (!movement) {
    return false;
  }

  updateRuntimeWorldState(
    (current) => {
      const activeMovements = {
        ...current
          .simulation
          .activeMovements,
      };

      delete activeMovements[
        armyId
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

export function moveArmy(
  armyId:
    string,
  destinationNodeId:
    string
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

  const destinationNode =
    getMapNode(
      destinationNodeId
    );

  if (
    !isPlayableStrategicNode(
      destinationNode
    )
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
      getArmyEffectiveSpeedKmPerHour(
        armyId
      ),
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
        ...current
          .simulation,

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

    physicalDistanceKm:
      route
        .totalDistanceKm,

    effectiveDistanceKm:
      route
        .effectiveDistanceKm,
  };
}
