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
  GameSessionState,
} from "@/types/session";

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
  PersistentSiege,
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

  /*
   * Canonical army references.
   *
   * Actual army state lives in
   * WorldState.armies.
   */
  armyIds: string[];

  treasury: number;

  /*
   * Legacy compatibility only.
   */
  army: number;

  food: number;

  stability: number;

  relations:
    Record<
      string,
      number
    >;
}

export interface Character {
  id: string;

  name: string;

  kingdomId: string;

  rank:
    CharacterRank;

  /*
   * Last settled location.
   *
   * Exact physical position lives in:
   * simulation.entityPositions.
   */
  locationId: string;

  treasury: number;

  /*
   * Legacy compatibility only.
   */
  army: number;

  relationships:
    Record<
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

  type:
    LocationType;
}

/*
 * Legacy local-player projection.
 *
 * Do not use this as the canonical
 * multiplayer player model.
 *
 * Canonical multiplayer state:
 * WorldState.session.players
 */
export interface PlayerState {
  characterId: string;

  locationId: string;
}

export interface SimulationState {
  worldTimeMinutes:
    WorldMinute;

  paused: boolean;

  /*
   * Canonical physical position for:
   *
   * characters
   * armies
   * couriers
   * scouts
   * diplomats
   */
  entityPositions:
    Record<
      string,
      Position
    >;

  activeMovements:
    Record<
      string,
      ActiveMovement
    >;

  scheduledEvents:
    ScheduledEvent[];

  resolvedEvents:
    ResolvedEvent[];

  nextSequence:
    number;
}

export interface WorldState {
  kingdoms:
    Record<
      string,
      Kingdom
    >;

  characters:
    Record<
      string,
      Character
    >;

  locations:
    Record<
      string,
      Location
    >;

  settlements:
    Record<
      string,
      Settlement
    >;

  armyContacts:
    Record<
      string,
      ArmyContact
    >;

  battles:
    Record<
      string,
      PersistentBattle
    >;

  sieges:
    Record<
      string,
      PersistentSiege
    >;

  battleResults:
    Record<
      string,
      BattleResult
    >;

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

  unitBlocks:
    Record<
      string,
      UnitBlock
    >;

  armies:
    Record<
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

  recruitmentOrders:
    Record<
      string,
      RecruitmentOrder
    >;

  wars:
    Record<
      string,
      War
    >;

  couriers:
    Record<
      string,
      Courier
    >;

  messages:
    Record<
      string,
      WorldMessage
    >;

  /*
   * Canonical multiplayer /
   * command-system state.
   */
  session:
    GameSessionState;

  /*
   * Legacy UI projection.
   */
  player:
    PlayerState;

  simulation:
    SimulationState;
}