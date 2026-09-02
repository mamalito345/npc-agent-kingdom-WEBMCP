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

export interface Settlement {
  id: string;

  locationId: string;

  name: string;

  /**
   * Canonical political / legal owner kingdom.
   *
   * Capture does NOT immediately change this.
   */
  kingdomId: string;

  /**
   * Optional character / local lord owner.
   * Existing Package 2 field.
   */
  ownerId?: string;

  /**
   * Current military controller.
   *
   * Undefined means:
   * controller === kingdomId
   */
  controllerKingdomId?: string;

  /**
   * When foreign military occupation began.
   */
  occupiedAt?: WorldMinute;

  type: SettlementType;

  resources:
    ResourceStockpile;

  dailyProduction:
    ResourceStockpile;

  /**
   * One canonical fortification truth.
   * Block D2 activates construction.
   */
  fortificationLevel?: 0 | 1 | 2 | 3;

  /**
   * Current physical condition of the
   * existing fortification.
   *
   * 0   = destroyed
   * 100 = fully intact
   *
   * Undefined is interpreted as:
   * - 100 when fortificationLevel > 0
   * - 0 when fortificationLevel = 0
   */
  fortificationIntegrity?: number;
  /**
   * Production damage caused by raid / sack.
   */
  productionDamage?: {
    multiplier: number;
    until: WorldMinute;
    cause:
      | "raid"
      | "sack";
  };
}