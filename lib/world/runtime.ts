import type { WorldState } from "@/types/world";
import { kingdoms } from "@/data/kingdoms";
import { characters } from "@/data/characters";
import { locations } from "@/data/locations";

type Listener = () => void;

let worldState: WorldState = {
  kingdoms,
  characters,
  locations,

  player: {
    characterId: "lord_edwyn",
    locationId: "stoneford",
  },
};

const listeners = new Set<Listener>();

export function getRuntimeWorldState(): WorldState {
  return worldState;
}

export function setPlayerLocation(locationId: string): void {
  worldState = {
    ...worldState,
    player: {
      ...worldState.player,
      locationId,
    },
  };

  listeners.forEach((listener) => listener());
}

export function subscribeWorldState(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}