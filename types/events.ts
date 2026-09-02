import type { WorldMinute } from "@/types/simulation";

export type DirectorEventCategory =
  | "TRAVEL"
  | "CAMPAIGN"
  | "BATTLE"
  | "SIEGE"
  | "POLITICAL"
  | "ECONOMIC"
  | "DIPLOMATIC";

export type DirectorEventTone =
  | "GOOD"
  | "BAD"
  | "NEUTRAL"
  | "CONTEXTUAL";

export type DirectorEventSeverity =
  | "minor"
  | "moderate"
  | "major";

export type DirectorEventResolutionMode =
  | "AUTO"
  | "RNG"
  | "PLAYER_DECISION"
  | "GM_NPC_DECISION";

export type EventEffect =
  | {
      type: "ARMY_SUPPLY_DELTA";
      targetBinding: string;
      amount: number;
    }
  | {
      type: "ARMY_MORALE_SET";
      targetBinding: string;
      value: "high" | "normal" | "low" | "broken";
    }
  | {
      type: "KINGDOM_TREASURY_DELTA";
      targetBinding: string;
      amount: number;
    }
  | {
      type: "KINGDOM_FOOD_DELTA";
      targetBinding: string;
      amount: number;
    }
  | {
      type: "KINGDOM_STABILITY_DELTA";
      targetBinding: string;
      amount: number;
    }
  | {
      type: "LORD_LOYALTY_DELTA";
      targetBinding: string;
      amount: number;
    }
  | {
      type: "RELATIONSHIP_DELTA";
      fromBinding: string;
      toBinding: string;
      amount: number;
    }
  | {
      type: "BATTLE_MOMENTUM_DELTA";
      targetBinding: string;
      amount: number;
    }
  | {
      type: "BATTLE_MORALE_PRESSURE_DELTA";
      targetBinding: string;
      side: "attacker" | "defender";
      amount: number;
    }
  | {
      type: "SIEGE_HISTORY_NOTE";
      targetBinding: string;
      summary: string;
    }
  | {
      type: "PLAYER_KNOWLEDGE";
      playerBinding: string;
      subjectBinding: string;
      summary: string;
      kind: "army" | "character" | "settlement" | "kingdom" | "battle" | "message" | "event";
      confidence: "confirmed" | "high" | "medium" | "low" | "rumor";
    }
  | {
      type: "NO_OP";
      summary: string;
    };

export interface EventOutcomeDefinition {
  id: string;
  label: string;
  weight: number;
  effects: EventEffect[];
}

export interface EventDefinition {
  id: string;
  name: string;
  category: DirectorEventCategory;
  tone: DirectorEventTone;
  requirements: string[];
  exclusions: string[];
  baseChance: number;
  weight: number;
  cooldownHours?: number;
  severity: DirectorEventSeverity;
  resolutionMode: DirectorEventResolutionMode;
  outcomes: EventOutcomeDefinition[];
}

export interface EventCandidate {
  candidateId: string;
  definitionId: string;
  category: DirectorEventCategory;
  name: string;
  severity: DirectorEventSeverity;
  resolutionMode: DirectorEventResolutionMode;
  bindings: Record<string, string>;
  kingdomId?: string;
  reason: string;
}

export interface EventOpportunity {
  id: string;
  category: DirectorEventCategory;
  reason: string;
  kingdomId?: string;
  candidates: EventCandidate[];
  createdAt: WorldMinute;
}

export type EventInstanceStatus =
  | "SELECTED"
  | "WAITING_PLAYER"
  | "RESOLVED"
  | "CANCELLED"
  | "FAILED";

export interface EventInstance {
  id: string;
  definitionId: string;
  createdAt: WorldMinute;
  resolvedAt?: WorldMinute;
  status: EventInstanceStatus;
  bindings: Record<string, string>;
  selectedBy: "WORLD_DIRECTOR";
  decisionSummary: string;
  outcomeId?: string;
  causeEventIds: string[];
  affectedEntityIds: string[];
  cancellationReason?: string;
  resultSummary?: string;
}

export interface EventDirectorContext {
  worldTimeMinutes: WorldMinute;
  opportunity: {
    id: string;
    category: DirectorEventCategory;
    reason: string;
    kingdomId?: string;
  };
  candidates: Array<{
    candidateId: string;
    definitionId: string;
    name: string;
    severity: DirectorEventSeverity;
    resolutionMode: DirectorEventResolutionMode;
    bindings: Record<string, string>;
  }>;
  recentEvents: Array<{
    id: string;
    definitionId: string;
    status: EventInstanceStatus;
    resultSummary?: string;
  }>;
  rules: string[];
}

export interface EventDirectorSelection {
  decisionSummary: string;
  selectedCandidateId: string | null;
}

export interface EventDirectorModelAdapter {
  selectEvent(
    context: EventDirectorContext
  ): Promise<EventDirectorSelection>;
}

export interface DirectorObserverTrace {
  id: string;
  timestamp: WorldMinute;
  activationReason: string;
  opportunityId: string;
  eligibleEventCount: number;
  selectedDefinitionId?: string;
  targetSummary?: string;
  validatorStatus: "PASS" | "REJECTED" | "NOT_RUN";
  canonicalResult?: string;
  playerKnowledge: string;
  decisionSummary?: string;
}

export interface DirectorEventRuntimeState {
  instances: Record<string, EventInstance>;
  traces: DirectorObserverTrace[];
  cooldownUntil: Record<string, WorldMinute>;
  dailyBudget: {
    dayIndex: number;
    globalCount: number;
    kingdomCounts: Record<string, number>;
  };
  nextChecks: Record<DirectorEventCategory, WorldMinute>;
}
