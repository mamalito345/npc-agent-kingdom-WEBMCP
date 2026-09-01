import type {
  ActiveMovement,
  Position,
  ResolvedEvent,
  ScheduledEvent,
  WorldMinute,
} from "@/types/simulation";

import type {
  Settlement,
} from "@/types/settlement";

import type {
  Courier,
  WorldMessage,
} from "@/types/courier";

export type CharacterRank =
  | "king"
  | "lord";

export interface Kingdom {
  id: string;

  name: string;

  rulerId: string;

  lordIds: string[];

  settlementIds: string[];

  /**
   * Package 3 will activate real army entities.
   * Keep the canonical relation now.
   */
  armyIds: string[];

  treasury: number;
  army: number;
  food: number;
  stability: number;

  relations: Record<string, number>;
}

export interface Character {
  id: string;

  name: string;

  kingdomId: string;

  rank: CharacterRank;

  /**
   * Last/current settled location.
   *
   * Precise travelling position lives inside:
   * WorldState.simulation.entityPositions
   */
  locationId: string;

  treasury: number;

  army: number;

  relationships: Record<string, number>;
}

export type LocationType =
  | "capital"
  | "castle"
  | "town"
  | "village"
  | "strategic_location";

export interface Location {
  id: string;

  name: string;

  kingdomId: string;

  type: LocationType;
}

export interface PlayerState {
  characterId: string;

  locationId: string;
}

export interface SimulationState {
  worldTimeMinutes: WorldMinute;

  paused: boolean;

  entityPositions: Record<
    string,
    Position
  >;

  activeMovements: Record<
    string,
    ActiveMovement
  >;

  scheduledEvents: ScheduledEvent[];

  resolvedEvents: ResolvedEvent[];

  nextSequence: number;
}

export interface WorldState {
  kingdoms: Record<
    string,
    Kingdom
  >;

  characters: Record<
    string,
    Character
  >;

  locations: Record<
    string,
    Location
  >;

  settlements: Record<
    string,
    Settlement
  >;

  couriers: Record<
    string,
    Courier
  >;

  messages: Record<
    string,
    WorldMessage
  >;

  player: PlayerState;

  simulation: SimulationState;
}