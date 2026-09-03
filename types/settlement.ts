import type {
  ResourceStockpile,
} from "@/types/resources";

import type {
  WorldMinute,
} from "@/types/simulation";

export type SettlementType =
  | "capital"
  | "city"
  | "castle"
  | "town"
  | "village"
  | "strategic_location";

export type SettlementDevelopmentLevel =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5;

export type SettlementDevelopmentFocus =
  | "food"
  | "gold"
  | "wood"
  | "stone"
  | "metal";

export type SettlementSpecialization =
  | "mixed"
  | "farming"
  | "pastoral"
  | "logging"
  | "mining"
  | "trade"
  | "military"
  | "oasis";

export type SettlementBuildingType =
  | "farms"
  | "market"
  | "lumber_yard"
  | "quarry"
  | "mine"
  | "warehouse"
  | "barracks"
  | "stables"
  | "walls"
  | "keep"
  | "watchtower";

export type SettlementBuildingLevel =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5;

export type SettlementBuildings =
  Partial<
    Record<
      SettlementBuildingType,
      SettlementBuildingLevel
    >
  >;

export interface Settlement {
  id: string;
  locationId: string;
  name: string;

  /**
   * Canonical political / legal owner kingdom.
   * Capture does NOT immediately change this.
   */
  kingdomId: string;

  ownerId?: string;

  /**
   * Current military controller.
   * Undefined means controller === kingdomId.
   */
  controllerKingdomId?: string;

  occupiedAt?: WorldMinute;

  type: SettlementType;

  resources: ResourceStockpile;

  /**
   * Scenario/base economic output before development, prosperity,
   * specialization and building multipliers.
   */
  dailyProduction: ResourceStockpile;

  developmentLevel?: SettlementDevelopmentLevel;
  developmentFocus?: SettlementDevelopmentFocus;

  /**
   * 0-100 civilian/economic health. High prosperity makes investment
   * and road access matter without becoming a hidden random modifier.
   */
  prosperity?: number;

  /**
   * 0-100 persistent structural damage / decline.
   * Temporary raid/sack damage continues to use productionDamage.
   */
  devastation?: number;

  specialization?: SettlementSpecialization;
  buildings?: SettlementBuildings;
  strategicRole?: string;

  fortificationLevel?: 0 | 1 | 2 | 3;
  fortificationIntegrity?: number;

  productionDamage?: {
    multiplier: number;
    until: WorldMinute;
    cause:
      | "raid"
      | "sack";
  };
}
