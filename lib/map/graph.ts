import { mapEdges, mapNodes } from "@/data/map";
import type { MapEdge, MapNode } from "@/types/map";

export function getMapNode(nodeId: string): MapNode | undefined {
  return mapNodes[nodeId];
}

export function getMapEdge(edgeId: string): MapEdge | undefined {
  return mapEdges[edgeId];
}

export function getMapNodes(): MapNode[] {
  return Object.values(mapNodes);
}

export function getMapEdges(): MapEdge[] {
  return Object.values(mapEdges);
}

export function getConnectedEdges(nodeId: string): MapEdge[] {
  return Object.values(mapEdges)
    .filter(
      (edge) =>
        edge.fromNodeId === nodeId ||
        edge.toNodeId === nodeId
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getOtherNodeId(
  edge: MapEdge,
  nodeId: string
): string | null {
  if (edge.fromNodeId === nodeId) {
    return edge.toNodeId;
  }

  if (edge.toNodeId === nodeId) {
    return edge.fromNodeId;
  }

  return null;
}

export function getEffectiveEdgeDistance(edge: MapEdge): number {
  return edge.distanceKm * edge.travelModifier;
}