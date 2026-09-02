import type {
  BattleFeature,
  BattleTerrain,
} from "@/types/military";

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapNode {
  id: string;

  locationId: string;

  x: number;
  y: number;

  iconUrl: string;

  scale?: number;

  labelOffsetX?: number;
  labelOffsetY?: number;

  terrain: BattleTerrain;

  features: BattleFeature[];
}

export type RoadTerrain =
  | "road"
  | "forest_road"
  | "mountain_road"
  | "marsh_road"
  | "river_road";

export interface MapEdge {
  id: string;

  fromNodeId: string;

  toNodeId: string;

  /*
   * Real physical length.
   */
  distanceKm: number;

  /*
   * Movement-cost multiplier.
   *
   * 1.0 = normal.
   * 1.2 = 20% harder/slower.
   */
  travelModifier: number;

  difficulty: number;

  terrain: RoadTerrain;

  points: MapPoint[];
}

export interface Route {
  nodeIds: string[];

  edgeIds: string[];

  /*
   * Physical geographic distance.
   */
  totalDistanceKm: number;

  /*
   * Movement cost after terrain /
   * road modifiers.
   */
  effectiveDistanceKm: number;
}

export interface GameMapImageDefinition {
  url: string;

  width: number;

  height: number;
}

export interface GameMapCameraDefinition {
  initialX: number;

  initialY: number;

  initialZoom: number;

  minZoom: number;

  maxZoom: number;
}

export interface GameMapDefinition {
  id: string;

  name: string;

  image: GameMapImageDefinition;

  camera: GameMapCameraDefinition;

  nodes: Record<
    string,
    MapNode
  >;

  edges: Record<
    string,
    MapEdge
  >;
}