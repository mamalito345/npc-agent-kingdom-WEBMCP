import fiveKingdomsRaw
  from "@/data/map/five-kingdoms.json";

import type {
  GameMapDefinition,
} from "@/types/map";

const fiveKingdoms =
  fiveKingdomsRaw as
    GameMapDefinition;

const maps:
  Record<
    string,
    GameMapDefinition
  > = {
  [fiveKingdoms.id]:
    fiveKingdoms,
};

export function getGameMap(
  mapId: string
): GameMapDefinition | undefined {
  return maps[mapId];
}

export function getRequiredGameMap(
  mapId: string
): GameMapDefinition {
  const map =
    getGameMap(mapId);

  if (!map) {
    throw new Error(
      `Unknown game map: ${mapId}`
    );
  }

  return map;
}

export function getActiveGameMap():
  GameMapDefinition {
  return getRequiredGameMap(
    "five-kingdoms"
  );
}