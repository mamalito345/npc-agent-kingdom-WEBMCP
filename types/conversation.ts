import type { Position, WorldMinute } from "@/types/simulation";

export type ConversationStatus = "open" | "closed";
export type ConversationSpeakerRole = "player" | "npc";

export interface ConversationTurn {
  id: string;
  speakerCharacterId: string;
  speakerRole: ConversationSpeakerRole;
  text: string;
  createdAtWorldTime: WorldMinute;
}

export interface ConversationSession {
  id: string;
  participantCharacterIds: string[];
  controllerPlayerId: string;
  targetCharacterId: string;
  openedAtWorldTime: WorldMinute;
  endedAtWorldTime?: WorldMinute;
  status: ConversationStatus;
  turns: ConversationTurn[];
  pauseReasonId: string;
}

export type CharacterPresenceKind = "army" | "traveling_party" | "council";

export interface CharacterPresenceContext {
  id: string;
  kind: CharacterPresenceKind;
  characterIds: string[];
  active: boolean;
  referenceId?: string;
}

export type CharacterMemoryType =
  | "CONVERSATION"
  | "RELATIONSHIP"
  | "PROMISE"
  | "POLITICAL"
  | "MILITARY"
  | "EVENT";

export interface CharacterMemory {
  id: string;
  characterId: string;
  type: CharacterMemoryType;
  summary: string;
  importance: number;
  createdAt: WorldMinute;
  relatedEntityIds: string[];
  sourceConversationId?: string;
  lastReferencedAt?: WorldMinute;
}

export type CharacterKnowledgeSource =
  | "direct_observation"
  | "courier"
  | "scout"
  | "strategic_briefing"
  | "system";

export type CharacterKnowledgeConfidence =
  | "confirmed"
  | "high"
  | "medium"
  | "low"
  | "rumor";

export interface CharacterKnowledgeFact {
  id: string;
  subjectId: string;
  kind:
    | "army"
    | "character"
    | "settlement"
    | "kingdom"
    | "battle"
    | "message"
    | "event";
  observedAt: WorldMinute;
  deliveredAt: WorldMinute;
  source: CharacterKnowledgeSource;
  confidence: CharacterKnowledgeConfidence;
  summary: string;
  data: Record<string, string | number | boolean | null>;
}

export interface CharacterKnowledgeState {
  characterId: string;
  facts: CharacterKnowledgeFact[];
}

export interface NpcPersonalityProfile {
  temperament: string;
  ambition: number;
  caution: number;
  honor: number;
}

export interface GmCharacterContext {
  worldTimeMinutes: WorldMinute;
  identity: {
    id: string;
    name: string;
    kingdomId: string;
    rank: string;
  };
  personality: NpcPersonalityProfile;
  physicalContext: {
    position: Position | null;
    presenceReason: string | null;
  };
  interlocutor: {
    characterId: string;
    relationship: number;
  } | null;
  knowledge: CharacterKnowledgeFact[];
  recentDeliveredMessages: Array<{
    id: string;
    senderId: string;
    content: string;
    createdAt: WorldMinute;
    deliveredAt: WorldMinute;
  }>;
  relevantMemories: CharacterMemory[];
  transcript: ConversationTurn[];
  rules: string[];
}

export interface GmCharacterModelResponse {
  text: string;
}

export interface GmCharacterModelAdapter {
  generateResponse(context: GmCharacterContext): Promise<GmCharacterModelResponse>;
}
