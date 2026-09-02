import {
  mapEdges,
  mapNodes,
} from "@/data/map";

import type {
  MapEdge,
  MapNode,
} from "@/types/map";

export function getMapNode(
  nodeId: string
): MapNode | undefined {
  return mapNodes[
    nodeId
  ];
}

export function getMapEdge(
  edgeId: string
): MapEdge | undefined {
  return mapEdges[
    edgeId
  ];
}

export function getMapNodes():
  MapNode[] {
  return Object.values(
    mapNodes
  );
}

export function getVisibleMapNodes():
  MapNode[] {
  return getMapNodes()
    .filter(
      (node) =>
        node.hidden !== true
    );
}

export function getTransitMapNodes():
  MapNode[] {
  return getMapNodes()
    .filter(
      (node) =>
        node.kind ===
        "transit"
    );
}

export function getMapEdges():
  MapEdge[] {
  return Object.values(
    mapEdges
  );
}

export function getBorderEdges():
  MapEdge[] {
  return getMapEdges()
    .filter(
      (edge) =>
        edge.borderCrossing !==
        undefined
    );
}

export function getConnectedEdges(
  nodeId: string
): MapEdge[] {
  return Object.values(
    mapEdges
  )
    .filter(
      (edge) =>
        edge.fromNodeId ===
          nodeId ||
        edge.toNodeId ===
          nodeId
    )
    .sort(
      (a, b) =>
        a.id.localeCompare(
          b.id
        )
    );
}

export function getOtherNodeId(
  edge: MapEdge,
  nodeId: string
): string | null {
  if (
    edge.fromNodeId ===
    nodeId
  ) {
    return edge.toNodeId;
  }

  if (
    edge.toNodeId ===
    nodeId
  ) {
    return edge.fromNodeId;
  }

  return null;
}

export function getPhysicalEdgeDistance(
  edge: MapEdge
): number {
  return Math.max(
    0,
    edge.distanceKm
  );
}

export function getEffectiveEdgeDistance(
  edge: MapEdge
): number {
  return (
    getPhysicalEdgeDistance(
      edge
    ) *
    Math.max(
      0,
      edge.travelModifier
    )
  );
}

export function getNodeTerritory(
  nodeId: string
): string | undefined {
  return getMapNode(
    nodeId
  )?.territoryKingdomId;
}

export function isTransitNode(
  nodeId: string
): boolean {
  return (
    getMapNode(nodeId)
      ?.kind ===
    "transit"
  );
}
