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
     * Any hop that ENTERS a kingdom other than the mover's own requires
     * access into that kingdom -- not just the first hop out of the
     * mover's home territory. A multi-kingdom route (A -> B -> C) used
     * to only check the A -> B leg (fromKingdomId === movingKingdomId),
     * silently skipping the B -> C leg even though the army still needs
     * authorization to be in C. Returning home (toKingdomId ===
     * movingKingdomId) never requires a treaty.
     */
    if (
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
