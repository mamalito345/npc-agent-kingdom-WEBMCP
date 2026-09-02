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
   * Normal player UI hides transit nodes.
   * Debug/route tooling may still render them.
   */
  hidden?: boolean;

  /*
   * Realm whose territory physically contains this node.
   * Border nodes may use the realm on the near side and carry
   * explicit border metadata on connected edges.
   */
  territoryKingdomId?: string;

  x: number;
  y: number;

  iconUrl?: string;
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

export interface BorderCrossingDefinition {
  fromKingdomId: string;
  toKingdomId: string;
  crossingNodeId?: string;
}

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

  /*
   * The realm physically containing the road segment where that
   * segment is unambiguous. Cross-border edges use borderCrossing.
   */
  territoryKingdomId?: string;

  /*
   * Metadata only in this phase. The next canonical border-action
   * integration consumes this rather than guessing border crossings
   * from settlement ownership.
   */
  borderCrossing?: BorderCrossingDefinition;

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
   * Movement cost after terrain / road modifiers.
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

  nodes: Record<string, MapNode>;
  edges: Record<string, MapEdge>;
}
