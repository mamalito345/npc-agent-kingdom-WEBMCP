import {
  getActiveGameMap,
} from "@/lib/map/map-registry";

import type {
  BattleFeature,
  BattleTerrain,
} from "@/types/military";

export interface BattleTerrainDefinition {
  terrain:
    BattleTerrain;

  features:
    BattleFeature[];
}

const DEFAULT_TERRAIN:
  BattleTerrainDefinition = {
  terrain:
    "plains",

  features:
    [],
};

export function getBattleTerrainForNode(
  nodeId:
    string
): BattleTerrainDefinition {
  const node =
    getActiveGameMap()
      .nodes[
        nodeId
      ];

  if (!node) {
    return {
      ...DEFAULT_TERRAIN,

      features: [],
    };
  }

  return {
    terrain:
      node.terrain,

    features: [
      ...node.features,
    ],
  };
}

export function getBattleTerrainForEdge(
  edgeId:
    string
): BattleTerrainDefinition {
  const edge =
    getActiveGameMap()
      .edges[
        edgeId
      ];

  if (!edge) {
    return {
      ...DEFAULT_TERRAIN,

      features: [],
    };
  }

  switch (
    edge.terrain
  ) {
    case "forest_road":
      return {
        terrain:
          "forest",

        features:
          [],
      };

    case "mountain_road":
      return {
        terrain:
          "mountain",

        features:
          [],
      };

    case "marsh_road":
      return {
        terrain:
          "marsh",

        features:
          [],
      };

    case "river_road":
      return {
        terrain:
          "river_crossing",

        features: [
          "bridge",
        ],
      };

    case "road":
    default:
      return {
        terrain:
          "plains",

        features:
          [],
      };
  }
}

export const battleTerrainByNode:
  Record<
    string,
    BattleTerrainDefinition
  > =
  Object.fromEntries(
    Object.values(
      getActiveGameMap()
        .nodes
    ).map(
      (node) => [
        node.id,

        {
          terrain:
            node.terrain,

          features: [
            ...node.features,
          ],
        },
      ]
    )
  );