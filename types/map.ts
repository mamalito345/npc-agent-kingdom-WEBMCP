export interface MapNode {
  id: string;
  locationId: string;
}

export interface MapEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceKm: number;
  travelModifier: number;
}

export interface Route {
  nodeIds: string[];
  edgeIds: string[];
  totalDistanceKm: number;
}