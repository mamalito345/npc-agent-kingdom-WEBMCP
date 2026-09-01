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