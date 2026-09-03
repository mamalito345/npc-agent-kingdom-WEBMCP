import {
  getActiveGameMap,
} from "@/lib/map/map-registry";

import type {
  MapEdge,
  MapNode,
} from "@/types/map";

const activeMap =
  getActiveGameMap();

export const mapNodes:
  Record<
    string,
    MapNode
  > = activeMap.nodes;

export const mapEdges:
  Record<
    string,
    MapEdge
  > = activeMap.edges;