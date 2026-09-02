import type {
  UnitType,
} from "@/types/military";

import type {
  WorldMinute,
} from "@/types/simulation";

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
  characterId:
    string;

  destinationNodeId:
    string;
}

export interface NpcArmyMoveProposalPayload {
  armyId:
    string;

  destinationNodeId:
    string;
}

export interface NpcRecruitUnitsProposalPayload {
  characterId:
    string;

  settlementId:
    string;

  unitType:
    UnitType;

  blocks:
    number;
}

export interface NpcStartSiegeProposalPayload {
  armyId:
    string;

  settlementId:
    string;
}

export interface NpcSendMessageProposalPayload {
  senderCharacterId:
    string;

  recipientCharacterId:
    string;

  content:
    string;
}

export interface ScheduleWorldInterruptProposalPayload {
  executeAt:
    WorldMinute;

  interruptType:
    string;

  message:
    string;
}

export interface KingdomRelationDeltaProposalPayload {
  kingdomId:
    string;

  targetKingdomId:
    string;

  delta:
    number;

  reason:
    string;
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
  playerId:
    string;

  subjectId:
    string;

  kind:
    DirectorKnowledgeKind;

  source:
    DirectorKnowledgeSource;

  confidence:
    DirectorKnowledgeConfidence;

  summary:
    string;

  observedAt?:
    WorldMinute;

  deliveredAt?:
    WorldMinute;

  data?: Record<
    string,
    string |
    number |
    boolean |
    null
  >;
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
  type:
    DirectorProposalType;

  reason:
    string;

  payload:
    DirectorProposalPayload;
}

export interface DirectorProposal {
  id:
    string;

  type:
    DirectorProposalType;

  reason:
    string;

  payload:
    DirectorProposalPayload;

  proposedAt:
    WorldMinute;

  updatedAt:
    WorldMinute;

  status:
    DirectorProposalStatus;

  rejectionReason?:
    string;

  failureReason?:
    string;

  resultSummary?:
    string;
}

export interface DirectorState {
  proposals:
    Record<
      string,
      DirectorProposal
    >;

  lastContextAt?:
    WorldMinute;

  lastTurnAt?:
    WorldMinute;

  lastAppliedProposalId?:
    string;
}

export interface DirectorContext {
  worldTimeMinutes:
    WorldMinute;

  session: {
    id:
      string;

    mapId:
      string;

    commandPhase:
      string;

    players:
      Array<{
        id:
          string;

        characterId:
          string;

        kingdomId:
          string;

        controllerType:
          string;
      }>;
  };

  kingdoms:
    Array<{
      id:
        string;

      treasury:
        number;

      food:
        number;

      stability:
        number;

      relations:
        Record<
          string,
          number
        >;
    }>;

  armies:
    Array<{
      id:
        string;

      ownerId:
        string;

      commanderId?:
        string;

      status:
        string;

      position:
        unknown;
    }>;

  wars:
    unknown[];

  battles:
    unknown[];

  sieges:
    unknown[];

  recentEvents:
    unknown[];

  recentMessages:
    unknown[];

  directorMemory: {
    recentProposals:
      DirectorProposal[];
  };

  rules:
    string[];
}

export interface DirectorModelAdapter {
  generateProposals(
    context:
      DirectorContext
  ):
    Promise<
      DirectorProposalDraft[]
    >;
}