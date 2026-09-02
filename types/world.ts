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

import type {
  ResourceStockpile,
} from "@/types/resources";

import type {
  Army,
  ArmyContact,
  BattleResult,
  RecruitmentOrder,
  SettlementOperation,
  UnitBlock,
  FortificationOrder,
  FortificationRepairOrder,
  PersistentBattle,
  War,
} from "@/types/military";

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
   * Canonical army references.
   *
   * Real army state lives in:
   * WorldState.armies
   */
  armyIds: string[];

  treasury: number;

  /**
   * Legacy compatibility field.
   *
   * Do NOT use as the Package 3
   * canonical military source of truth.
   */
  army: number;

  food: number;

  stability: number;

  relations: Record<
    string,
    number
  >;
}

export interface Character {
  id: string;

  name: string;

  kingdomId: string;

  rank: CharacterRank;

  /**
   * Last/current settled location.
   *
   * Precise travelling position:
   * WorldState.simulation.entityPositions
   */
  locationId: string;

  treasury: number;

  /**
   * Legacy compatibility field.
   *
   * Real armies live in:
   * WorldState.armies
   */
  army: number;

  relationships: Record<
    string,
    number
  >;
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
  worldTimeMinutes:
    WorldMinute;

  paused: boolean;

  /**
   * Canonical exact position for
   * every moving entity:
   *
   * character
   * courier
   * army
   * future diplomat
   * future scout
   */
  entityPositions: Record<
    string,
    Position
  >;

  activeMovements: Record<
    string,
    ActiveMovement
  >;

  scheduledEvents:
    ScheduledEvent[];

  resolvedEvents:
    ResolvedEvent[];

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

  armyContacts: Record<
    string,
    ArmyContact
  >;
  battles: Record<
    string,
    PersistentBattle
  >;

  battleResults: Record<
    string,
    BattleResult
  >;

  /**
   * Reservation ledger.
   *
   * Settlement.resources = physical total.
   *
   * Available resources:
   * total - reserved
   */
  settlementResourceReservations:
    Record<
      string,
      ResourceStockpile
    >;

  settlementOperations:
    Record<
      string,
      SettlementOperation
    >;

  unitBlocks: Record<
    string,
    UnitBlock
  >;

  armies: Record<
    string,
    Army
  >;
  fortificationOrders:
    Record<
      string,
      FortificationOrder
    >;
  fortificationRepairOrders:
    Record<
      string,
      FortificationRepairOrder
    >;
  recruitmentOrders: Record<
    string,
    RecruitmentOrder
  >;

  wars: Record<
    string,
    War
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

  simulation:
    SimulationState;
}