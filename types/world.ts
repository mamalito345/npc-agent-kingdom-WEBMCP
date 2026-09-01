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
  locationId: string;

  treasury: number;
  army: number;

  relationships: Record<string, number>;
}

export interface Location {
  id: string;
  name: string;
  kingdomId: string;
  type: "capital" | "castle" | "town";
}

export interface PlayerState {
  characterId: string;
  locationId: string;
}

export interface WorldState {
  kingdoms: Record<string, Kingdom>;
  characters: Record<string, Character>;
  locations: Record<string, Location>;
  player: PlayerState;
}