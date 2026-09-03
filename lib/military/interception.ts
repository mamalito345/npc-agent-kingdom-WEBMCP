import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  findRoute,
} from "@/lib/map/paths";

import {
  getArmyEffectiveSpeedKmPerHour,
  moveArmy,
} from "@/lib/military/army-movement";

export type InterceptArmyError =
  | "ARMY_NOT_FOUND"
  | "TARGET_NOT_FOUND"
  | "SAME_ARMY"
  | "SAME_OWNER"
  | "INTERCEPTOR_NOT_AT_NODE"
  | "TARGET_NOT_MOVING"
  | "NO_INTERCEPTION_POINT"
  | "MOVE_FAILED";

export type InterceptArmyResult =
  | {
      ok: false;

      error:
        InterceptArmyError;

      reason?: string;
    }
  | {
      ok: true;

      interceptNodeId:
        string;

      estimatedInterceptorMinutes:
        number;

      estimatedTargetMinutes:
        number;

      movementId:
        string;
    };

function routeMinutes(
  effectiveDistanceKm:
    number,
  speedKmPerHour:
    number
): number {
  if (
    speedKmPerHour <=
    0
  ) {
    throw new Error(
      "Army speed must be greater than zero."
    );
  }

  return Math.ceil(
    (
      effectiveDistanceKm /
      speedKmPerHour
    ) *
      60
  );
}

export function interceptArmy(
  armyId:
    string,
  targetArmyId:
    string
): InterceptArmyResult {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  const target =
    world.armies[
      targetArmyId
    ];

  if (!army) {
    return {
      ok: false,

      error:
        "ARMY_NOT_FOUND",
    };
  }

  if (!target) {
    return {
      ok: false,

      error:
        "TARGET_NOT_FOUND",
    };
  }

  if (
    armyId ===
    targetArmyId
  ) {
    return {
      ok: false,

      error:
        "SAME_ARMY",
    };
  }

  if (
    army.ownerId ===
    target.ownerId
  ) {
    return {
      ok: false,

      error:
        "SAME_OWNER",
    };
  }

  const interceptorPosition =
    world.simulation
      .entityPositions[
        armyId
      ];

  if (
    !interceptorPosition ||
    interceptorPosition.kind !==
      "node"
  ) {
    return {
      ok: false,

      error:
        "INTERCEPTOR_NOT_AT_NODE",
    };
  }

  const targetMovement =
    world.simulation
      .activeMovements[
        targetArmyId
      ];

  if (!targetMovement) {
    return {
      ok: false,

      error:
        "TARGET_NOT_MOVING",
    };
  }

  const now =
    world.simulation
      .worldTimeMinutes;

  const remainingTargetMinutes =
    Math.max(
      0,

      targetMovement
        .estimatedArrivalAt -
        now
    );

  const firstFutureNodeIndex =
    Math.max(
      1,

      targetMovement
        .currentEdgeIndex +
        1
    );

  const candidateNodeIds =
    targetMovement
      .routeNodeIds
      .slice(
        firstFutureNodeIndex
      );

  let best:
    | {
        nodeId:
          string;

        interceptorMinutes:
          number;

        targetMinutes:
          number;
      }
    | undefined;

  for (
    const candidateNodeId
    of candidateNodeIds
  ) {
    const interceptorRoute =
      findRoute(
        interceptorPosition
          .nodeId,

        candidateNodeId
      );

    if (!interceptorRoute) {
      continue;
    }

    const interceptorMinutes =
      routeMinutes(
        interceptorRoute
          .effectiveDistanceKm,

        getArmyEffectiveSpeedKmPerHour(
          armyId
        )
      );

    const candidateIndex =
      targetMovement
        .routeNodeIds
        .indexOf(
          candidateNodeId
        );

    if (
      candidateIndex <
      firstFutureNodeIndex
    ) {
      continue;
    }

    const remainingNodeSpan =
      Math.max(
        1,

        targetMovement
          .routeNodeIds
          .length -
          firstFutureNodeIndex
      );

    const progressThroughRemainingRoute =
      (
        candidateIndex -
        firstFutureNodeIndex +
        1
      ) /
      remainingNodeSpan;

    const targetMinutes =
      Math.round(
        remainingTargetMinutes *
          progressThroughRemainingRoute
      );

    if (
      interceptorMinutes >
      targetMinutes +
        60
    ) {
      continue;
    }

    const candidate = {
      nodeId:
        candidateNodeId,

      interceptorMinutes,

      targetMinutes,
    };

    if (
      !best ||
      candidate.targetMinutes <
        best.targetMinutes
    ) {
      best =
        candidate;
    }
  }

  if (!best) {
    return {
      ok: false,

      error:
        "NO_INTERCEPTION_POINT",

      reason:
        "No future target-route node can currently be reached in time.",
    };
  }

  const moveResult =
    moveArmy(
      armyId,
      best.nodeId
    );

  if (
    moveResult.ok ===
    false
  ) {
    return {
      ok: false,

      error:
        "MOVE_FAILED",

      reason:
        moveResult.error,
    };
  }

  return {
    ok: true,

    interceptNodeId:
      best.nodeId,

    estimatedInterceptorMinutes:
      best.interceptorMinutes,

    estimatedTargetMinutes:
      best.targetMinutes,

    movementId:
      moveResult.movementId,
  };
}