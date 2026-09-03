import {
  getMapEdge,
} from "@/lib/map/graph";

import {
  hasDiplomaticMilitaryAccess,
} from "@/lib/politics/diplomatic-law";

import type {
  Route,
} from "@/types/map";

export interface UnauthorizedBorderCrossing {
  edgeId: string;
  fromKingdomId: string;
  toKingdomId: string;
  crossingNodeId?: string;
}

export function hasCanonicalMilitaryAccess(
  movingKingdomId: string,
  foreignKingdomId: string
): boolean {
  return hasDiplomaticMilitaryAccess(
    movingKingdomId,
    foreignKingdomId
  );
}

export function findFirstUnauthorizedBorderCrossing(
  route: Route,
  movingKingdomId: string
): UnauthorizedBorderCrossing | undefined {
  for (
    let index = 0;
    index < route.edgeIds.length;
    index += 1
  ) {
    const edgeId =
      route.edgeIds[
        index
      ];

    const fromNodeId =
      route.nodeIds[
        index
      ];

    if (
      !edgeId ||
      !fromNodeId
    ) {
      continue;
    }

    const edge =
      getMapEdge(
        edgeId
      );

    if (
      !edge?.borderCrossing
    ) {
      continue;
    }

    const forward =
      edge.fromNodeId ===
      fromNodeId;

    const fromKingdomId =
      forward
        ? edge
            .borderCrossing
            .fromKingdomId
        : edge
            .borderCrossing
            .toKingdomId;

    const toKingdomId =
      forward
        ? edge
            .borderCrossing
            .toKingdomId
        : edge
            .borderCrossing
            .fromKingdomId;

    /*
     * Only leaving the moving realm into a foreign realm is an access check.
     * Returning home never requires a treaty.
     */
    if (
      fromKingdomId ===
        movingKingdomId &&
      toKingdomId !==
        movingKingdomId &&
      !hasCanonicalMilitaryAccess(
        movingKingdomId,
        toKingdomId
      )
    ) {
      return {
        edgeId,
        fromKingdomId,
        toKingdomId,
        crossingNodeId:
          edge
            .borderCrossing
            .crossingNodeId,
      };
    }
  }

  return undefined;
}
