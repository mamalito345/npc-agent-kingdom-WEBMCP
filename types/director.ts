import type {
  UnitType,
} from "@/types/military";

import type {
  WorldMinute,
} from "@/types/simulation";

import type {
  DirectorEventRuntimeState,
} from "@/types/events";

import type {
  RealmControlRole,
} from "@/types/session";

export type DirectorProposalType =
  | "npc_character_travel"
  | "npc_army_move"
  | "npc_recruit_units"
  | "npc_start_siege"
  | "npc_send_message"
  | "schedule_world_interrupt"
  | "kingdom_relation_delta"
  | "player_knowledge_report";

export type DirectorProposalStatus =
  | "accepted"
  | "rejected"
  | "applied"
  | "failed";

export interface NpcCharacterTravelProposalPayload {
  characterId: string;
  destinationNodeId: string;
}

export interface NpcArmyMoveProposalPayload {
  armyId: string;
  destinationNodeId: string;
}

export interface NpcRecruitUnitsProposalPayload {
  characterId: string;
  settlementId: string;
  unitType: UnitType;
  blocks: number;
}

export interface NpcStartSiegeProposalPayload {
  armyId: string;
  settlementId: string;
}

export interface NpcSendMessageProposalPayload {
  senderCharacterId: string;
  recipientCharacterId: string;
  content: string;
}

export interface ScheduleWorldInterruptProposalPayload {
  executeAt: WorldMinute;
  interruptType: string;
  message: string;
}

export interface KingdomRelationDeltaProposalPayload {
  kingdomId: string;
  targetKingdomId: string;
  delta: number;
  reason: string;
}

export type DirectorKnowledgeKind =
  | "army"
  | "character"
  | "settlement"
  | "kingdom"
  | "battle"
  | "message"
  | "event";

export type DirectorKnowledgeSource =
  | "direct_observation"
  | "courier"
  | "scout"
  | "strategic_briefing"
  | "system";

export type DirectorKnowledgeConfidence =
  | "confirmed"
  | "high"
  | "medium"
  | "low"
  | "rumor";

export interface PlayerKnowledgeReportProposalPayload {
  playerId: string;
  subjectId: string;
  kind: DirectorKnowledgeKind;
  source: DirectorKnowledgeSource;
  confidence: DirectorKnowledgeConfidence;
  summary: string;
  observedAt?: WorldMinute;
  deliveredAt?: WorldMinute;
  data?: Record<string, string | number | boolean | null>;
}

export type DirectorProposalPayload =
  | NpcCharacterTravelProposalPayload
  | NpcArmyMoveProposalPayload
  | NpcRecruitUnitsProposalPayload
  | NpcStartSiegeProposalPayload
  | NpcSendMessageProposalPayload
  | ScheduleWorldInterruptProposalPayload
  | KingdomRelationDeltaProposalPayload
  | PlayerKnowledgeReportProposalPayload;

export interface DirectorProposalDraft {
  type: DirectorProposalType;
  reason: string;
  payload: DirectorProposalPayload;
}

export interface DirectorProposal {
  id: string;
  type: DirectorProposalType;
  reason: string;
  payload: DirectorProposalPayload;
  proposedAt: WorldMinute;
  updatedAt: WorldMinute;
  status: DirectorProposalStatus;
  rejectionReason?: string;
  failureReason?: string;
  resultSummary?: string;
}

export interface DirectorState {
  proposals: Record<string, DirectorProposal>;
  events: DirectorEventRuntimeState;
  lastContextAt?: WorldMinute;
  lastTurnAt?: WorldMinute;
  lastAppliedProposalId?: string;
}

export interface GmWorldSnapshot {
  worldTimeMinutes: WorldMinute;

  campaignControl: {
    humanPlayerId?: string;
    actorPlayerId?: string;
    roleByKingdomId: Record<
      string,
      RealmControlRole
    >;
  };

  kingdoms: Array<{
    id: string;
    name: string;
    rulerId: string;
    treasury: number;
    food: number;
    stability: number;
    relations: Record<string, number>;
    /** Grounded in-character backstory for this realm -- why its relations, wealth and posture are what they are. See data/lore.ts. */
    history?: string;
    settlementIds: string[];
    armyIds: string[];
  }>;

  settlements: Array<{
    id: string;
    name: string;
    kingdomId: string;
    controllerKingdomId: string;
    ownerId?: string;
    type: string;
    fortificationLevel: number;
    resources: {
      food: number;
      gold: number;
      wood: number;
      stone: number;
      metal: number;
    };
    dailyProduction: {
      food: number;
      gold: number;
      wood: number;
      stone: number;
      metal: number;
    };
  }>;

  armies: Array<{
    id: string;
    ownerId: string;
    commanderId?: string;
    commanderName?: string;
    status: string;
    soldiers: number;
    infantry: number;
    cavalry: number;
    siege: number;
    morale: string;
    supplyState: string;
    foodSupply: number;
    fundingState: string;
    unpaidDays: number;
    position: unknown;
    movementDestination?: string;
    movementEta?: number;
    independentLordArmy: boolean;
  }>;

  lords: Array<{
    characterId: string;
    name: string;
    title: string;
    kingdomId: string;
    homeSettlementId: string;
    loyalty: number;
    politicalPower: number;
    relationshipToRuler: number;
    traits: Record<string, number>;
    controlledSettlementIds: string[];
    controlledArmyIds: string[];
  }>;

  lordOrders: unknown[];
  wars: unknown[];
  battles: unknown[];
  sieges: unknown[];

  diplomacy: {
    agreements: unknown[];
    promises: unknown[];
    relationships: unknown[];
  };

  borders: unknown[];

  realmKnowledge: Array<{
    playerId: string;
    kingdomId: string;
    facts: Array<{
      subjectId: string;
      kind: string;
      deliveredAt: WorldMinute;
      confidence: string;
      summary: string;
    }>;
  }>;

  activePlans: unknown[];
  recentMessages: unknown[];
  recentEvents: unknown[];

  directorRuntime: {
    eventBudget: unknown;
    cooldownCount: number;
    proposalCount: number;
  };
}

export interface DirectorContext {
  worldTimeMinutes: WorldMinute;

  session: {
    id: string;
    mapId: string;
    commandPhase: string;
    players: Array<{
      id: string;
      characterId: string;
      kingdomId: string;
      controllerType: string;
      realmControlRole: RealmControlRole;
    }>;
  };

  worldSnapshot: GmWorldSnapshot;

  kingdoms: Array<{
    id: string;
    treasury: number;
    food: number;
    stability: number;
    relations: Record<string, number>;
  }>;

  armies: Array<{
    id: string;
    ownerId: string;
    commanderId?: string;
    status: string;
    position: unknown;
  }>;

  wars: unknown[];
  battles: unknown[];
  sieges: unknown[];
  recentEvents: unknown[];
  recentMessages: unknown[];

  directorMemory: {
    recentProposals: DirectorProposal[];
  };

  rules: string[];
}

export interface DirectorModelAdapter {
  generateProposals(
    context: DirectorContext
  ): Promise<DirectorProposalDraft[]>;
}
