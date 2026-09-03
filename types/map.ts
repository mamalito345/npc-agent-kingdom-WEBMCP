import type {
  BattleFeature,
  BattleTerrain,
} from "@/types/military";

export interface MapPoint {
  x: number;
  y: number;
}

export type MapNodeKind =
  | "settlement"
  | "transit";

export type TransitNodeType =
  | "road_junction"
  | "forest_path"
  | "mountain_pass"
  | "river_crossing"
  | "plains_waypoint"
  | "bridge"
  | "border_crossing"
  | "coast_road"
  | "hill_road";

export type StrategicImportance =
  | "local"
  | "regional"
  | "major"
  | "critical";

export interface MapNode {
  id: string;

  /*
   * Settlement nodes point to the canonical world location.
   * Transit nodes intentionally have no world location entity.
   */
  locationId?: string;

  kind?: MapNodeKind;
  transitType?: TransitNodeType;

  /*
   * Normal player UI hides transit nodes as large settlement markers.
   * StrategicNodeLayer still renders them as small tactical positions.
   */
  hidden?: boolean;

  territoryKingdomId?: string;

  x: number;
  y: number;

  iconUrl?: string;
  scale?: number;

  labelOffsetX?: number;
  labelOffsetY?: number;

  terrain: BattleTerrain;
  features: BattleFeature[];

  /*
   * Public geographic metadata. This is map knowledge, not fog-of-war
   * intelligence about enemy forces.
   */
  displayName?: string;
  importance?: StrategicImportance;
  strategicRole?: string;
}

export type RoadTerrain =
  | "road"
  | "forest_road"
  | "mountain_road"
  | "marsh_road"
  | "river_road";

export type RoadClass =
  | "major_road"
  | "regional_road"
  | "local_road"
  | "forest_trail"
  | "mountain_route"
  | "caravan_route";

export interface BorderCrossingDefinition {
  fromKingdomId: string;
  toKingdomId: string;
  crossingNodeId?: string;
}

export interface MapEdge {
  id: string;

  fromNodeId: string;
  toNodeId: string;

  /* Real physical length. */
  distanceKm: number;

  /*
   * Movement-cost multiplier.
   * 1.0 = normal.
   * 1.2 = 20% harder/slower.
   */
  travelModifier: number;

  difficulty: number;
  terrain: RoadTerrain;
  roadClass?: RoadClass;

  territoryKingdomId?: string;
  borderCrossing?: BorderCrossingDefinition;

  points: MapPoint[];
}

export interface Route {
  nodeIds: string[];
  edgeIds: string[];
  totalDistanceKm: number;
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

  nodes: Record<string, MapNode>;
  edges: Record<string, MapEdge>;
}
