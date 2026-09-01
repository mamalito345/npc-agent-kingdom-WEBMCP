import {
  roadVisuals,
} from "@/data/map/road-visuals";

import {
  settlementVisuals,
} from "@/data/map/settlement-visuals";

import type {
  Position,
} from "@/types/simulation";

export interface MapPoint {
  x: number;
  y: number;
}

function distanceBetween(
  a: MapPoint,
  b: MapPoint
): number {
  const dx =
    b.x - a.x;

  const dy =
    b.y - a.y;

  return Math.sqrt(
    dx * dx +
      dy * dy
  );
}

export function getSettlementMapPoint(
  settlementId: string
): MapPoint | null {
  const visual =
    settlementVisuals[
      settlementId
    ];

  if (!visual) {
    return null;
  }

  return {
    x: visual.x,
    y: visual.y,
  };
}

export function getPointAlongPolyline(
  points: MapPoint[],
  progress: number
): MapPoint | null {
  if (
    points.length === 0
  ) {
    return null;
  }

  if (
    points.length === 1
  ) {
    return {
      ...points[0],
    };
  }

  const normalizedProgress =
    Math.max(
      0,
      Math.min(
        1,
        progress
      )
    );

  if (
    normalizedProgress === 0
  ) {
    return {
      ...points[0],
    };
  }

  if (
    normalizedProgress === 1
  ) {
    return {
      ...points[
        points.length - 1
      ],
    };
  }

  const segmentLengths: number[] =
    [];

  let totalLength = 0;

  for (
    let index = 0;
    index <
    points.length - 1;
    index += 1
  ) {
    const length =
      distanceBetween(
        points[index],
        points[index + 1]
      );

    segmentLengths.push(
      length
    );

    totalLength +=
      length;
  }

  if (
    totalLength === 0
  ) {
    return {
      ...points[0],
    };
  }

  const targetDistance =
    totalLength *
    normalizedProgress;

  let traversed = 0;

  for (
    let index = 0;
    index <
    segmentLengths.length;
    index += 1
  ) {
    const segmentLength =
      segmentLengths[index];

    const nextTraversed =
      traversed +
      segmentLength;

    if (
      targetDistance <=
      nextTraversed
    ) {
      const localDistance =
        targetDistance -
        traversed;

      const localProgress =
        segmentLength === 0
          ? 0
          : localDistance /
            segmentLength;

      const from =
        points[index];

      const to =
        points[index + 1];

      return {
        x:
          from.x +
          (to.x - from.x) *
            localProgress,

        y:
          from.y +
          (to.y - from.y) *
            localProgress,
      };
    }

    traversed =
      nextTraversed;
  }

  return {
    ...points[
      points.length - 1
    ],
  };
}

export function getPointAlongRoad(
  edgeId: string,
  progress: number
): MapPoint | null {
  const road =
    roadVisuals[edgeId];

  if (!road) {
    return null;
  }

  return getPointAlongPolyline(
    road.points,
    progress
  );
}

export function getPointForPosition(
  position: Position
): MapPoint | null {
  if (
    position.kind === "node"
  ) {
    return getSettlementMapPoint(
      position.nodeId
    );
  }

  const road =
    roadVisuals[
      position.edgeId
    ];

  if (!road) {
    return null;
  }

  const visualProgress =
    position.direction ===
    "forward"
      ? position.progress
      : 1 -
        position.progress;

  return getPointAlongPolyline(
    road.points,
    visualProgress
  );
}