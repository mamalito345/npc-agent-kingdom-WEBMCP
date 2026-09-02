import {
  getMapEdge,
  getMapNode,
} from "@/lib/map/graph";

import type {
  MapEdge,
} from "@/types/map";

export interface RouteBorderCrossing {
  edgeId: string;
  fromKingdomId: string;
  toKingdomId: string;
  crossingNodeId?: string;
}

export function getEdgeBorderCrossing(
  edgeId: string
): RouteBorderCrossing | undefined {
  const edge =
    getMapEdge(edgeId);

  if (!edge?.borderCrossing) {
    return undefined;
  }

  return {
    edgeId,
    ...edge.borderCrossing,
  };
}

export function getRouteBorderCrossings(
  edgeIds: string[]
): RouteBorderCrossing[] {
  return edgeIds.flatMap(
    (edgeId) => {
      const crossing =
        getEdgeBorderCrossing(
          edgeId
        );

      return crossing
        ? [crossing]
        : [];
    }
  );
}

export function routeEntersForeignTerritory(
  edgeIds: string[],
  ownKingdomId: string
): RouteBorderCrossing | undefined {
  return getRouteBorderCrossings(
    edgeIds
  ).find(
    (crossing) =>
      crossing.toKingdomId !==
        ownKingdomId ||
      crossing.fromKingdomId !==
        ownKingdomId
  );
}

export function getEdgeTerritorySummary(
  edge: MapEdge
): string {
  if (
    edge.borderCrossing
  ) {
    return (
      `${edge.borderCrossing.fromKingdomId}` +
      ` → ` +
      `${edge.borderCrossing.toKingdomId}`
    );
  }

  if (
    edge.territoryKingdomId
  ) {
    return edge.territoryKingdomId;
  }

  const from =
    getMapNode(
      edge.fromNodeId
    )?.territoryKingdomId;

  const to =
    getMapNode(
      edge.toNodeId
    )?.territoryKingdomId;

  return (
    from === to
      ? from
      : `${from ?? "unknown"} → ${to ?? "unknown"}`
  ) ?? "unknown";
}
