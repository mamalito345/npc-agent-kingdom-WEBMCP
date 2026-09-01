import type {
  ResourceStockpile,
} from "@/types/resources";

export type SettlementType =
  | "capital"
  | "castle"
  | "town"
  | "village";

export interface Settlement {
  id: string;

  locationId: string;

  name: string;

  kingdomId: string;

  ownerId?: string;

  type: SettlementType;

  resources: ResourceStockpile;

  dailyProduction: ResourceStockpile;
}