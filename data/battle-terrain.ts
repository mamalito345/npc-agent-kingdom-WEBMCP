import type {
  BattleFeature,
  BattleTerrain,
} from "@/types/military";

export interface BattleTerrainDefinition {
  terrain: BattleTerrain;
  features: BattleFeature[];
}

const DEFAULT_TERRAIN:
  BattleTerrainDefinition = {
  terrain:
    "plains",

  features: [],
};

export const battleTerrainByNode:
  Record<
    string,
    BattleTerrainDefinition
  > = {
  stoneford: {
    terrain:
      "hills",

    features: [
      "high_ground",
    ],
  },

  riverhold: {
    terrain:
      "river_crossing",

    features: [
      "bridge",
    ],
  },

  northwatch: {
    terrain:
      "hills",

    features: [
      "high_ground",
      "fortified_position",
    ],
  },

  highcrest: {
    terrain:
      "mountain",

    features: [
      "high_ground",
      "narrow_pass",
    ],
  },

  frostmere: {
    terrain:
      "forest",

    features: [],
  },

  eastkeep: {
    terrain:
      "plains",

    features: [
      "fortified_position",
    ],
  },

  greenharbor: {
    terrain:
      "plains",

    features: [],
  },

  elmstead: {
    terrain:
      "forest",

    features: [],
  },

  dawnfort: {
    terrain:
      "hills",

    features: [
      "fortified_position",
    ],
  },

  moorhall: {
    terrain:
      "marsh",

    features: [],
  },

  blackfen: {
    terrain:
      "marsh",

    features: [],
  },

  greywatch: {
    terrain:
      "hills",

    features: [
      "high_ground",
    ],
  },

  reedmere: {
    terrain:
      "marsh",

    features: [],
  },

  sunspire: {
    terrain:
      "plains",

    features: [
      "fortified_position",
    ],
  },

  goldmeadow: {
    terrain:
      "plains",

    features: [],
  },

  redfield: {
    terrain:
      "plains",

    features: [],
  },

  southgate: {
    terrain:
      "hills",

    features: [
      "narrow_pass",
    ],
  },

  ironhold: {
    terrain:
      "mountain",

    features: [
      "fortified_position",
      "narrow_pass",
    ],
  },

  emberfall: {
    terrain:
      "mountain",

    features: [],
  },

  stonevein: {
    terrain:
      "mountain",

    features: [
      "narrow_pass",
    ],
  },

  ashguard: {
    terrain:
      "dense_forest",

    features: [],
  },
};

export function getBattleTerrainForNode(
  nodeId: string
): BattleTerrainDefinition {
  return (
    battleTerrainByNode[
      nodeId
    ] ??
    DEFAULT_TERRAIN
  );
}