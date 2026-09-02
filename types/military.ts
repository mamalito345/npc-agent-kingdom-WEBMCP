import type {
  ResourceStockpile,
} from "@/types/resources";

import type {
  WorldMinute,
} from "@/types/simulation";

export type UnitType =
  | "infantry"
  | "cavalry"
  | "siege"
  | "ship";

export type MoraleState =
  | "high"
  | "normal"
  | "low"
  | "broken";

export type SupplyState =
  | "supplied"
  | "low_supply"
  | "critical_supply"
  | "starving";

export type FundingState =
  | "funded"
  | "underfunded"
  | "arrears"
  | "collapse_risk";

export type ArmyStatus =
  | "field"
  | "garrison"
  | "retreating"
  | "battle"
  | "destroyed";

export type CommanderRating =
  | "poor"
  | "average"
  | "good"
  | "excellent";

export type TerrainDefense =
  | "normal"
  | "defensive"
  | "strong";

export type BattleOutcomeBand =
  | "stalemate"
  | "narrow"
  | "clear"
  | "major"
  | "rout";

export interface UnitBlock {
  id: string;
  type: UnitType;
  currentSoldiers: number;
}

export interface ArmySupplyState {
  foodSupply: number;
  state: SupplyState;
}

export interface ArmyFundingState {
  unpaidDays: number;
  state: FundingState;
}

export interface Army {
  id: string;

  /**
   * Kingdom / realm ID.
   */
  ownerId: string;

  /**
   * Character ID.
   */
  commanderId?: string;

  unitIds: string[];

  morale: MoraleState;

  supply:
    ArmySupplyState;

  funding:
    ArmyFundingState;

  status:
    ArmyStatus;

  supportTargetArmyId?: string;
}

export interface War {
  id: string;

  attackerRealmIds:
    string[];

  defenderRealmIds:
    string[];

  startedAt:
    WorldMinute;

  status:
    | "active"
    | "ended";
}

export type RecruitmentOrderStatus =
  | "active"
  | "completed"
  | "cancelled";

export interface RecruitmentOrder {
  id: string;
  settlementId: string;
  actorId: string;
  unitType: UnitType;
  blocks: number;
  startedAt: WorldMinute;
  completesAt: WorldMinute;
  reservedResources: ResourceStockpile;
  status: RecruitmentOrderStatus;
}

export interface ArmyContact {
  id: string;

  armyAId: string;
  armyBId: string;

  nodeId: string;

  detectedAt:
    WorldMinute;

  status:
    | "pending"
    | "resolved"
    | "avoided";
}

export interface BattleSideResult {
  armyId: string;

  basePower: number;

  commanderModifier:
    number;

  moraleModifier:
    number;

  supplyModifier:
    number;

  terrainModifier:
    number;

  fortificationModifier:
    number;

  randomRoll:
    number;

  totalPower:
    number;

  casualtyPercent:
    number;

  soldiersBefore:
    number;

  soldiersLost:
    number;

  soldiersAfter:
    number;
}

export interface BattleResult {
  id: string;

  contactId?: string;

  attackerArmyId:
    string;

  defenderArmyId:
    string;

  nodeId: string;

  resolvedAt:
    WorldMinute;

  band:
    BattleOutcomeBand;

  winnerArmyId?: string;

  loserArmyId?: string;

  attacker:
    BattleSideResult;

  defender:
    BattleSideResult;

  retreatNodeId?: string;

  seed: number;
}

export type SettlementOperationType =
  | "raid";

export type SettlementOperationStatus =
  | "active"
  | "completed"
  | "cancelled";

export interface SettlementOperation {
  id: string;

  type:
    SettlementOperationType;

  armyId: string;

  settlementId:
    string;

  startedAt:
    WorldMinute;

  completesAt:
    WorldMinute;

  status:
    SettlementOperationStatus;
}

export type FortificationLevel =
  0 | 1 | 2 | 3;

export type FortificationOrderStatus =
  | "active"
  | "completed"
  | "cancelled";

export interface FortificationOrder {
  id: string;

  settlementId:
    string;

  actorId:
    string;

  fromLevel:
    FortificationLevel;

  toLevel:
    FortificationLevel;

  startedAt:
    WorldMinute;

  completesAt:
    WorldMinute;

  reservedResources:
    ResourceStockpile;

  status:
    FortificationOrderStatus;
}

export type FortificationRepairOrderStatus =
  | "active"
  | "completed"
  | "cancelled";

export interface FortificationRepairOrder {
  id: string;

  settlementId: string;

  actorId: string;

  fortificationLevel:
    FortificationLevel;

  fromIntegrity: number;

  toIntegrity: number;

  startedAt:
    WorldMinute;

  completesAt:
    WorldMinute;

  reservedResources:
    ResourceStockpile;

  status:
    FortificationRepairOrderStatus;
}

export type BattlePhase =
  | "contact"
  | "deployment"
  | "engagement"
  | "crisis"
  | "resolution"
  | "retreat"
  | "ended";
export type BattleOrderType =
  | "hold_position"
  | "commit_reserve"
  | "press_attack"
  | "order_retreat";

export type BattleDecisionActor =
  | "player"
  | "commander";

export interface BattleOrder {
  id: string;

  battleId: string;

  armyId: string;

  actorType:
    BattleDecisionActor;

  actorId: string;

  type:
    BattleOrderType;

  issuedAt:
    WorldMinute;
}

export interface PendingBattleDecision {
  id: string;

  battleId: string;

  armyId: string;

  requestedAt:
    WorldMinute;

  availableOrders:
    BattleOrderType[];
}
export type PersistentBattleStatus =
  | "active"
  | "ended";

export interface BattleHistoryEntry {
  id: string;

  timestamp: WorldMinute;

  type:
    | "battle_started"
    | "phase_changed"
    | "decision_requested"
    | "order_issued"
    | "battle_ended";

  summary: string;
}

export interface PersistentBattle {
  id: string;

  contactId?: string;

  warId?: string;

  nodeId: string;

  attackerArmyIds: string[];

  defenderArmyIds: string[];

  startedAt: WorldMinute;

  currentPhase: BattlePhase;

  nextPhaseAt?: WorldMinute;

  status:
    PersistentBattleStatus;

  activeOrders:
    BattleOrder[];

  pendingDecision?:
    PendingBattleDecision;

  history:
    BattleHistoryEntry[];

  finalBattleResultId?: string;
}