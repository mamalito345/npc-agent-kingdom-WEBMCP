import {
  getMapNode,
  getMapNodes,
} from "@/lib/map/graph";

import type {
  MapNode,
  TransitNodeType,
} from "@/types/map";

const PLAYABLE_TRANSIT_TYPES:
  ReadonlySet<TransitNodeType> =
  new Set([
    "road_junction",
    "forest_path",
    "mountain_pass",
    "river_crossing",
    "plains_waypoint",
    "bridge",
    "border_crossing",
    "coast_road",
    "hill_road",
  ]);

export function isPlayableStrategicNode(
  node:
    MapNode | undefined
): node is MapNode {
  if (!node) {
    return false;
  }

  if (
    node.kind ===
    "settlement"
  ) {
    return true;
  }

  if (
    node.kind !==
      "transit" ||
    !node.transitType
  ) {
    return false;
  }

  return PLAYABLE_TRANSIT_TYPES.has(
    node.transitType
  );
}

export function isPlayableStrategicNodeId(
  nodeId: string
): boolean {
  return isPlayableStrategicNode(
    getMapNode(nodeId)
  );
}

export function getPlayableStrategicNodes():
  MapNode[] {
  return getMapNodes()
    .filter(
      (node) =>
        node.kind ===
          "transit" &&
        isPlayableStrategicNode(
          node
        )
    )
    .sort(
      (a, b) =>
        a.id.localeCompare(
          b.id
        )
    );
}

export function getStrategicNodeLabel(
  node:
    MapNode
): string {
  switch (
    node.transitType
  ) {
    case "road_junction":
      return "Road Junction";

    case "forest_path":
      return "Forest Position";

    case "mountain_pass":
      return "Mountain Pass";

    case "river_crossing":
      return "River Crossing";

    case "plains_waypoint":
      return "Open Ground";

    case "bridge":
      return "Bridge";

    case "border_crossing":
      return "Border Post";

    case "coast_road":
      return "Coastal Position";

    case "hill_road":
      return "Hill Position";

    default:
      return "Strategic Position";
  }
}

export function getStrategicNodeIcon(
  node:
    MapNode
): string {
  switch (
    node.transitType
  ) {
    case "road_junction":
      return "✣";

    case "forest_path":
      return "♣";

    case "mountain_pass":
      return "▲";

    case "river_crossing":
      return "≈";

    case "bridge":
      return "═";

    case "border_crossing":
      return "⚑";

    case "coast_road":
      return "◒";

    case "hill_road":
      return "⌃";

    case "plains_waypoint":
    default:
      return "•";
  }
}

export function formatTerrainName(
  value: string
): string {
  return value
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}
