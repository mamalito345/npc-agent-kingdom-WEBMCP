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

  features: [],
};

export function getBattleTerrainForNode(
  nodeId: string
): BattleTerrainDefinition {
  const node =
    getActiveGameMap()
      .nodes[nodeId];

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