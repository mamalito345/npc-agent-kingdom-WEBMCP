import type {
  ActiveMovement,
  Position,
  ResolvedEvent,
  ScheduledEvent,
  WorldMinute,
} from "@/types/simulation";

export type CharacterRank = "king" | "lord";

export interface Kingdom {
  id: string;
  name: string;
  rulerId: string;
  lordIds: string[];

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
   * Last settled location.
   *
   * While an entity is travelling, its precise physical position is stored
   * inside WorldState.entityPositions.
   */
  locationId: string;

  treasury: number;
  army: number;

  relationships: Record<string, number>;
}

export interface Location {
  id: string;
  name: string;
  kingdomId: string;

  type:
    | "capital"
    | "castle"
    | "town"
    | "village"
    | "crossroads";
}

export interface PlayerState {
  characterId: string;

  /**
   * Compatibility field representing the player's last/current settled node.
   *
   * Precise travelling position belongs to entityPositions.
   */
  locationId: string;
}

export interface SimulationState {
  worldTimeMinutes: WorldMinute;

  paused: boolean;

  entityPositions: Record<string, Position>;

  activeMovements: Record<string, ActiveMovement>;

  scheduledEvents: ScheduledEvent[];

  resolvedEvents: ResolvedEvent[];

  nextSequence: number;
}

export interface WorldState {
  kingdoms: Record<string, Kingdom>;

  characters: Record<string, Character>;

  locations: Record<string, Location>;

  player: PlayerState;

  simulation: SimulationState;
}