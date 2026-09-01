import {
  getRuntimeWorldState,
  subscribeWorldState,
} from "@/lib/world/runtime";

export function getWorldState() {
  return getRuntimeWorldState();
}

export function getKingdom(kingdomId: string) {
  return getRuntimeWorldState().kingdoms[kingdomId];
}

export function getCharacter(characterId: string) {
  return getRuntimeWorldState().characters[characterId];
}

export function getLocation(locationId: string) {
  return getRuntimeWorldState().locations[locationId];
}

export function getLocations() {
  return Object.values(getRuntimeWorldState().locations);
}

export { subscribeWorldState };

export function getPlayerVisibleWorld() {
  const world = getRuntimeWorldState();
  const playerCharacter = world.characters[world.player.characterId];

  return {
    player: {
      characterId: world.player.characterId,
      locationId: world.player.locationId,
      role: playerCharacter?.rank ?? null,
    },

    kingdoms: Object.values(world.kingdoms).map((kingdom) => ({
      id: kingdom.id,
      name: kingdom.name,
    })),

    locations: Object.values(world.locations).map((location) => ({
      id: location.id,
      name: location.name,
      kingdomId: location.kingdomId,
      type: location.type,
    })),
  };
}

export function inspectLocation(locationId: string) {
  const location = getLocation(locationId);

  if (!location) {
    return {
      ok: false as const,
      error: "LOCATION_NOT_FOUND" as const,
    };
  }

  return {
    ok: true as const,
    location: {
      id: location.id,
      name: location.name,
      kingdomId: location.kingdomId,
      type: location.type,
    },
  };
}

export function inspectCharacter(characterId: string) {
  const character = getCharacter(characterId);

  if (!character) {
    return {
      ok: false as const,
      error: "CHARACTER_NOT_FOUND" as const,
    };
  }

  return {
    ok: true as const,
    character: {
      id: character.id,
      name: character.name,
      kingdomId: character.kingdomId,
      rank: character.rank,
      locationId: character.locationId,
      army: character.army,
      treasury: character.treasury,
    },
  };
}