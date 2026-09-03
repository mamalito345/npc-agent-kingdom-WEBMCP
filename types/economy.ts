export type RoadSecurityState =
  | "safe"
  | "threatened"
  | "raided"
  | "blocked";

export interface RoadSecurityResult {
  edgeId: string;
  state: RoadSecurityState;
  multiplier: number;
  reasons: string[];
}

export interface SettlementTradeState {
  settlementId: string;
  connectedRoadCount: number;
  averageRoadMultiplier: number;
  occupationMultiplier: number;
  tradeMultiplier: number;

  /**
   * Legacy field name retained for all existing budget callers.
   * It now means total settlement income delivered to the realm:
   * local tax + market/trade income.
   */
  dailyTradeGold: number;

  dailyTaxGold: number;
  dailyMarketGold: number;
  grossEconomicGold: number;
}

export type MobilizationLevel =
  | "normal"
  | "major"
  | "full"
  | "emergency";

export interface KingdomStrategicEconomy {
  kingdomId: string;
  treasury: number;
  dailyTradeIncome: number;
  dailyMilitaryGoldCost: number;
  treasuryDaysRemaining: number;
  foodDaysRemaining: number;
  armySupplyDays: number;
  militaryCostIncomeRatio: number;
  tradeDisruptionRatio: number;
  mobilizationRatio: number;
  mobilizationLevel: MobilizationLevel;
}
