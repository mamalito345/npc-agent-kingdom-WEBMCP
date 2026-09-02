import type { WorldMinute } from "@/types/simulation";

export interface LordTraits {
  ambition: number;
  honor: number;
  aggression: number;
  caution: number;
  diplomacy: number;
  intrigue: number;
}

export interface LordProfile {
  characterId: string;
  kingdomId: string;
  title: string;
  homeSettlementId: string;
  controlledSettlementIds: string[];
  controlledArmyIds: string[];
  loyalty: number;
  politicalPower: number;
  relationshipToRuler: number;
  basicTraits: LordTraits;
}

export type LordOrderType =
  | "REINFORCE"
  | "DEFEND_SETTLEMENT"
  | "BRING_ARMY"
  | "RAISE_TROOPS"
  | "HOLD_POSITION";

export type LordOrderResponseType =
  | "ACCEPT"
  | "REFUSE"
  | "DELAY"
  | "NEGOTIATE"
  | "PARTIAL_COMPLIANCE";

export type LordOrderStatus =
  | "pending"
  | "resolved"
  | "cancelled";

export interface LordOrderRequest {
  id: string;
  playerId: string;
  rulerCharacterId: string;
  lordCharacterId: string;
  type: LordOrderType;
  targetNodeId?: string;
  targetSettlementId?: string;
  risk: number;
  note?: string;
  issuedAt: WorldMinute;
  status: LordOrderStatus;
  response?: LordOrderResponseType;
  responseSummary?: string;
  resolvedAt?: WorldMinute;
  canonicalEffect?: {
    applied: boolean;
    summary: string;
    referenceId?: string;
  };
}

export interface LordRuntimeState {
  profiles: Record<string, LordProfile>;
  orders: Record<string, LordOrderRequest>;
}

export interface GmLordOrderContext {
  worldTimeMinutes: WorldMinute;
  lord: LordProfile;
  order: LordOrderRequest;
  ruler: {
    characterId: string;
    relationship: number;
  };
  knownMilitarySituation: Array<{
    subjectId: string;
    summary: string;
    confidence: string;
    deliveredAt: WorldMinute;
  }>;
  relevantMemories: Array<{
    type: string;
    summary: string;
    importance: number;
    createdAt: WorldMinute;
  }>;
  rules: string[];
}

export interface GmLordOrderDecision {
  response: LordOrderResponseType;
  summary: string;
}

export interface GmLordOrderModelAdapter {
  decideOrder(
    context: GmLordOrderContext
  ): Promise<GmLordOrderDecision>;
}
