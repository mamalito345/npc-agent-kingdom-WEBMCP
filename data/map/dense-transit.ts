import type {
  BattleFeature,
  BattleTerrain,
} from "@/types/military";

import type {
  GameMapDefinition,
  MapEdge,
  MapNode,
  RoadTerrain,
  TransitNodeType,
} from "@/types/map";

interface CorridorDefinition {
  id: string;
  from: string;
  to: string;
  territoryFrom: string;
  territoryTo: string;
  terrain: RoadTerrain;
  nodeTerrain: BattleTerrain;
  nodeFeatures?: BattleFeature[];
  transitType: TransitNodeType;
  travelModifier: number;
  difficulty: number;
  segments: number;
  bend?: number;
}

interface AlternateCorridorDefinition extends CorridorDefinition {
  lane: "north" | "south" | "east" | "west";
}

const corridors: CorridorDefinition[] = [
  // NORTHREACH internal
  { id: "nr-stoneford-riverhold-main", from: "stoneford", to: "riverhold", territoryFrom: "northreach", territoryTo: "northreach", terrain: "road", nodeTerrain: "hills", transitType: "hill_road", travelModifier: 1.0, difficulty: 2, segments: 3, bend: -45 },
  { id: "nr-riverhold-northwatch-main", from: "riverhold", to: "northwatch", territoryFrom: "northreach", territoryTo: "northreach", terrain: "mountain_road", nodeTerrain: "hills", nodeFeatures: ["high_ground"], transitType: "mountain_pass", travelModifier: 1.1, difficulty: 3, segments: 4, bend: 55 },
  { id: "nr-riverhold-highcrest-main", from: "riverhold", to: "highcrest", territoryFrom: "northreach", territoryTo: "northreach", terrain: "mountain_road", nodeTerrain: "mountain", nodeFeatures: ["high_ground"], transitType: "mountain_pass", travelModifier: 1.15, difficulty: 3, segments: 4, bend: -50 },
  { id: "nr-highcrest-frostmere-main", from: "highcrest", to: "frostmere", territoryFrom: "northreach", territoryTo: "northreach", terrain: "forest_road", nodeTerrain: "forest", transitType: "forest_path", travelModifier: 1.18, difficulty: 3, segments: 3, bend: -45 },

  // EASTVALE internal
  { id: "ev-eastkeep-greenharbor-main", from: "eastkeep", to: "greenharbor", territoryFrom: "eastvale", territoryTo: "eastvale", terrain: "road", nodeTerrain: "plains", transitType: "plains_waypoint", travelModifier: 0.95, difficulty: 1, segments: 4, bend: -30 },
  { id: "ev-greenharbor-elmstead-main", from: "greenharbor", to: "elmstead", territoryFrom: "eastvale", territoryTo: "eastvale", terrain: "forest_road", nodeTerrain: "forest", transitType: "forest_path", travelModifier: 1.05, difficulty: 2, segments: 3, bend: 35 },
  { id: "ev-eastkeep-dawnfort-main", from: "eastkeep", to: "dawnfort", territoryFrom: "eastvale", territoryTo: "eastvale", terrain: "road", nodeTerrain: "hills", transitType: "hill_road", travelModifier: 1.0, difficulty: 2, segments: 3, bend: 35 },

  // WESTMOOR internal
  { id: "wm-moorhall-blackfen-main", from: "moorhall", to: "blackfen", territoryFrom: "westmoor", territoryTo: "westmoor", terrain: "marsh_road", nodeTerrain: "marsh", transitType: "plains_waypoint", travelModifier: 1.2, difficulty: 4, segments: 3, bend: 35 },
  { id: "wm-blackfen-reedmere-main", from: "blackfen", to: "reedmere", territoryFrom: "westmoor", territoryTo: "westmoor", terrain: "marsh_road", nodeTerrain: "marsh", transitType: "plains_waypoint", travelModifier: 1.25, difficulty: 4, segments: 3, bend: 25 },
  { id: "wm-moorhall-greywatch-main", from: "moorhall", to: "greywatch", territoryFrom: "westmoor", territoryTo: "westmoor", terrain: "road", nodeTerrain: "hills", nodeFeatures: ["high_ground"], transitType: "hill_road", travelModifier: 1.05, difficulty: 2, segments: 3, bend: -35 },

  // SOUTHMARK internal
  { id: "sm-sunspire-goldmeadow-main", from: "sunspire", to: "goldmeadow", territoryFrom: "southmark", territoryTo: "southmark", terrain: "road", nodeTerrain: "plains", transitType: "plains_waypoint", travelModifier: 0.95, difficulty: 1, segments: 3, bend: -30 },
  { id: "sm-goldmeadow-redfield-main", from: "goldmeadow", to: "redfield", territoryFrom: "southmark", territoryTo: "southmark", terrain: "road", nodeTerrain: "plains", transitType: "plains_waypoint", travelModifier: 1.0, difficulty: 1, segments: 3, bend: 30 },
  { id: "sm-sunspire-southgate-main", from: "sunspire", to: "southgate", territoryFrom: "southmark", territoryTo: "southmark", terrain: "road", nodeTerrain: "hills", nodeFeatures: ["narrow_pass"], transitType: "hill_road", travelModifier: 1.05, difficulty: 2, segments: 4, bend: -35 },

  // IRONHOLLOW internal
  { id: "ih-ironhold-emberfall-main", from: "ironhold", to: "emberfall", territoryFrom: "ironhollow", territoryTo: "ironhollow", terrain: "mountain_road", nodeTerrain: "mountain", transitType: "mountain_pass", travelModifier: 1.15, difficulty: 3, segments: 3, bend: -35 },
  { id: "ih-emberfall-stonevein-main", from: "emberfall", to: "stonevein", territoryFrom: "ironhollow", territoryTo: "ironhollow", terrain: "mountain_road", nodeTerrain: "mountain", nodeFeatures: ["narrow_pass"], transitType: "mountain_pass", travelModifier: 1.2, difficulty: 4, segments: 3, bend: 25 },
  { id: "ih-ironhold-ashguard-main", from: "ironhold", to: "ashguard", territoryFrom: "ironhollow", territoryTo: "ironhollow", terrain: "forest_road", nodeTerrain: "dense_forest", transitType: "forest_path", travelModifier: 1.18, difficulty: 3, segments: 4, bend: 45 },

  // Cross-realm strategic corridors
  { id: "border-nr-ev-highcrest-eastkeep", from: "highcrest", to: "eastkeep", territoryFrom: "northreach", territoryTo: "eastvale", terrain: "road", nodeTerrain: "plains", transitType: "border_crossing", travelModifier: 1.05, difficulty: 2, segments: 6, bend: -90 },
  { id: "border-nr-wm-stoneford-moorhall", from: "stoneford", to: "moorhall", territoryFrom: "northreach", territoryTo: "westmoor", terrain: "marsh_road", nodeTerrain: "marsh", transitType: "border_crossing", travelModifier: 1.15, difficulty: 3, segments: 6, bend: 100 },
  { id: "border-wm-sm-moorhall-sunspire", from: "moorhall", to: "sunspire", territoryFrom: "westmoor", territoryTo: "southmark", terrain: "road", nodeTerrain: "plains", transitType: "border_crossing", travelModifier: 1.0, difficulty: 2, segments: 7, bend: -120 },
  { id: "border-ev-sm-eastkeep-sunspire", from: "eastkeep", to: "sunspire", territoryFrom: "eastvale", territoryTo: "southmark", terrain: "road", nodeTerrain: "plains", transitType: "border_crossing", travelModifier: 1.0, difficulty: 2, segments: 6, bend: 120 },
  { id: "border-ev-ih-eastkeep-ironhold", from: "eastkeep", to: "ironhold", territoryFrom: "eastvale", territoryTo: "ironhollow", terrain: "mountain_road", nodeTerrain: "mountain", transitType: "border_crossing", travelModifier: 1.18, difficulty: 3, segments: 7, bend: -100 },
  { id: "border-wm-ih-moorhall-ironhold", from: "moorhall", to: "ironhold", territoryFrom: "westmoor", territoryTo: "ironhollow", terrain: "road", nodeTerrain: "plains", transitType: "border_crossing", travelModifier: 1.08, difficulty: 2, segments: 8, bend: 130 },

  // Additional cross routes create strategic alternatives
  { id: "border-nr-ev-frostmere-greenharbor", from: "frostmere", to: "greenharbor", territoryFrom: "northreach", territoryTo: "eastvale", terrain: "forest_road", nodeTerrain: "forest", transitType: "border_crossing", travelModifier: 1.2, difficulty: 3, segments: 7, bend: -150 },
  { id: "border-nr-wm-riverhold-greywatch", from: "riverhold", to: "greywatch", territoryFrom: "northreach", territoryTo: "westmoor", terrain: "forest_road", nodeTerrain: "forest", transitType: "border_crossing", travelModifier: 1.15, difficulty: 3, segments: 7, bend: 135 },
  { id: "border-ev-sm-dawnfort-southgate", from: "dawnfort", to: "southgate", territoryFrom: "eastvale", territoryTo: "southmark", terrain: "road", nodeTerrain: "hills", transitType: "border_crossing", travelModifier: 1.12, difficulty: 3, segments: 6, bend: 90 },
  { id: "border-sm-ih-southgate-ashguard", from: "southgate", to: "ashguard", territoryFrom: "southmark", territoryTo: "ironhollow", terrain: "forest_road", nodeTerrain: "dense_forest", transitType: "border_crossing", travelModifier: 1.16, difficulty: 3, segments: 6, bend: -100 },
];

const alternates: AlternateCorridorDefinition[] = [
  { id: "nr-stoneford-riverhold-forest", from: "stoneford", to: "riverhold", territoryFrom: "northreach", territoryTo: "northreach", terrain: "forest_road", nodeTerrain: "forest", transitType: "forest_path", travelModifier: 1.18, difficulty: 3, segments: 4, bend: 125, lane: "west" },
  { id: "nr-riverhold-highcrest-north", from: "riverhold", to: "highcrest", territoryFrom: "northreach", territoryTo: "northreach", terrain: "road", nodeTerrain: "hills", transitType: "hill_road", travelModifier: 1.08, difficulty: 2, segments: 5, bend: -135, lane: "north" },
  { id: "ev-eastkeep-greenharbor-south", from: "eastkeep", to: "greenharbor", territoryFrom: "eastvale", territoryTo: "eastvale", terrain: "forest_road", nodeTerrain: "forest", transitType: "forest_path", travelModifier: 1.12, difficulty: 2, segments: 5, bend: 115, lane: "south" },
  { id: "wm-moorhall-greywatch-west", from: "moorhall", to: "greywatch", territoryFrom: "westmoor", territoryTo: "westmoor", terrain: "marsh_road", nodeTerrain: "marsh", transitType: "plains_waypoint", travelModifier: 1.18, difficulty: 3, segments: 5, bend: 110, lane: "west" },
  { id: "sm-sunspire-southgate-east", from: "sunspire", to: "southgate", territoryFrom: "southmark", territoryTo: "southmark", terrain: "road", nodeTerrain: "plains", transitType: "plains_waypoint", travelModifier: 1.02, difficulty: 2, segments: 5, bend: -120, lane: "east" },
  { id: "ih-ironhold-ashguard-east", from: "ironhold", to: "ashguard", territoryFrom: "ironhollow", territoryTo: "ironhollow", terrain: "mountain_road", nodeTerrain: "mountain", transitType: "mountain_pass", travelModifier: 1.16, difficulty: 3, segments: 5, bend: -120, lane: "east" },
];

function inferKingdomFromLocation(nodeId: string): string | undefined {
  const groups: Record<string, string[]> = {
    northreach: ["northwatch", "stoneford", "riverhold", "highcrest", "frostmere"],
    eastvale: ["eastkeep", "greenharbor", "elmstead", "dawnfort"],
    westmoor: ["moorhall", "blackfen", "greywatch", "reedmere"],
    southmark: ["sunspire", "goldmeadow", "redfield", "southgate"],
    ironhollow: ["ironhold", "emberfall", "stonevein", "ashguard"],
  };

  return Object.entries(groups).find(([, ids]) => ids.includes(nodeId))?.[0];
}

function decorateSettlementNodes(
  base: GameMapDefinition
): Record<string, MapNode> {
  return Object.fromEntries(
    Object.entries(base.nodes).map(([id, node]) => [
      id,
      {
        ...node,
        kind: "settlement" as const,
        hidden: false,
        locationId: node.locationId ?? id,
        territoryKingdomId:
          node.territoryKingdomId ??
          inferKingdomFromLocation(id),
      },
    ])
  );
}

function pointAlong(
  from: MapNode,
  to: MapNode,
  t: number,
  bend: number
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));

  /*
   * Perpendicular curve. sin(pi*t) keeps the bend zero at endpoints.
   */
  const curve = Math.sin(Math.PI * t) * bend;
  const nx = -dy / length;
  const ny = dx / length;

  return {
    x: Math.round(from.x + dx * t + nx * curve),
    y: Math.round(from.y + dy * t + ny * curve),
  };
}

function physicalDistanceKm(
  from: MapNode,
  to: MapNode,
  segments: number
): number {
  /*
   * Preserve the established map scale without pretending pixels are km.
   * Long corridors remain strategically longer than local roads.
   */
  const pixelDistance = Math.hypot(to.x - from.x, to.y - from.y);
  return Math.max(35, Math.round((pixelDistance / 4.2) / segments));
}

function addCorridor(
  nodes: Record<string, MapNode>,
  edges: Record<string, MapEdge>,
  corridor: CorridorDefinition
): void {
  const from = nodes[corridor.from];
  const to = nodes[corridor.to];

  if (!from || !to) {
    return;
  }

  const transitNodeIds: string[] = [];

  for (let index = 1; index < corridor.segments; index += 1) {
    const t = index / corridor.segments;
    const nodeId = `${corridor.id}:t${index}`;
    const isCrossBorder =
      corridor.territoryFrom !== corridor.territoryTo;

    const crossingIndex =
      Math.max(1, Math.floor(corridor.segments / 2));

    const territory =
      !isCrossBorder || index < crossingIndex
        ? corridor.territoryFrom
        : corridor.territoryTo;

    const transitType: TransitNodeType =
      isCrossBorder && index === crossingIndex
        ? "border_crossing"
        : corridor.transitType;

    nodes[nodeId] = {
      id: nodeId,
      kind: "transit",
      transitType,
      hidden: true,
      territoryKingdomId: territory,
      ...pointAlong(
        from,
        to,
        t,
        corridor.bend ?? 0
      ),
      terrain: corridor.nodeTerrain,
      features:
        transitType === "border_crossing"
          ? [...(corridor.nodeFeatures ?? [])]
          : [...(corridor.nodeFeatures ?? [])],
    };

    transitNodeIds.push(nodeId);
  }

  const chain = [
    corridor.from,
    ...transitNodeIds,
    corridor.to,
  ];

  for (let index = 0; index < chain.length - 1; index += 1) {
    const fromNodeId = chain[index];
    const toNodeId = chain[index + 1];
    const a = nodes[fromNodeId];
    const b = nodes[toNodeId];

    const edgeId = `${corridor.id}:e${index + 1}`;
    const crossesBorder =
      a.territoryKingdomId !==
      b.territoryKingdomId;

    edges[edgeId] = {
      id: edgeId,
      fromNodeId,
      toNodeId,
      distanceKm: physicalDistanceKm(
        from,
        to,
        corridor.segments
      ),
      travelModifier: corridor.travelModifier,
      difficulty: corridor.difficulty,
      terrain: corridor.terrain,
      territoryKingdomId:
        crossesBorder
          ? undefined
          : a.territoryKingdomId,
      borderCrossing:
        crossesBorder
          ? {
              fromKingdomId:
                a.territoryKingdomId ??
                corridor.territoryFrom,
              toKingdomId:
                b.territoryKingdomId ??
                corridor.territoryTo,
              crossingNodeId:
                a.transitType === "border_crossing"
                  ? a.id
                  : b.transitType === "border_crossing"
                    ? b.id
                    : undefined,
            }
          : undefined,
      points: [
        { x: a.x, y: a.y },
        { x: b.x, y: b.y },
      ],
    };
  }
}

export function buildDenseFiveKingdomsMap(
  base: GameMapDefinition
): GameMapDefinition {
  const nodes =
    decorateSettlementNodes(base);

  /*
   * Deliberately replace the sparse settlement-to-settlement edge set.
   * Dense physical corridors become canonical movement truth.
   */
  const edges: Record<string, MapEdge> = {};

  for (const corridor of [
    ...corridors,
    ...alternates,
  ]) {
    addCorridor(
      nodes,
      edges,
      corridor
    );
  }

  return {
    ...base,
    name:
      `${base.name} — Dense Strategic Roads`,
    nodes,
    edges,
  };
}

export function getDenseMapStats(
  map: GameMapDefinition
) {
  const allNodes =
    Object.values(map.nodes);

  const allEdges =
    Object.values(map.edges);

  return {
    nodeCount:
      allNodes.length,
    settlementNodeCount:
      allNodes.filter(
        (node) =>
          node.kind === "settlement"
      ).length,
    transitNodeCount:
      allNodes.filter(
        (node) =>
          node.kind === "transit"
      ).length,
    edgeCount:
      allEdges.length,
    borderEdgeCount:
      allEdges.filter(
        (edge) =>
          edge.borderCrossing !==
          undefined
      ).length,
  };
}
