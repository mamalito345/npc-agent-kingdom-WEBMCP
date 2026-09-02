import type {
  WorldMinute,
} from "@/types/simulation";

export type PlayerControllerType =
  | "human"
  | "webmcp_llm";

export interface PlayerSlot {
  id:
    string;

  controllerType:
    PlayerControllerType;

  characterId:
    string;

  kingdomId:
    string;

  displayName:
    string;

  active:
    boolean;
}

export type CommandCyclePhase =
  | "planning"
  | "executing"
  | "interrupted";

export type StrategicOrderType =
  | "move_character"
  | "move_army"
  | "intercept_army"
  | "hold_army";

export type StrategicOrderStatus =
  | "queued"
  | "executing"
  | "completed"
  | "cancelled"
  | "failed";

export interface MoveCharacterOrderPayload {
  characterId:
    string;

  destinationNodeId:
    string;
}

export interface MoveArmyOrderPayload {
  armyId:
    string;

  destinationNodeId:
    string;
}

export interface InterceptArmyOrderPayload {
  armyId:
    string;

  targetArmyId:
    string;
}

export interface HoldArmyOrderPayload {
  armyId:
    string;
}

export type StrategicOrderPayload =
  | MoveCharacterOrderPayload
  | MoveArmyOrderPayload
  | InterceptArmyOrderPayload
  | HoldArmyOrderPayload;

export interface StrategicOrder {
  id:
    string;

  playerId:
    string;

  type:
    StrategicOrderType;

  payload:
    StrategicOrderPayload;

  issuedAt:
    WorldMinute;

  updatedAt:
    WorldMinute;

  status:
    StrategicOrderStatus;

  /*
   * Populated once the strategic
   * order starts a physical movement.
   */
  movementId?:
    string;

  startedAt?:
    WorldMinute;

  completedAt?:
    WorldMinute;

  failureReason?:
    string;
}

export type CommandInterruptType =
  | "BATTLE_STARTED"
  | "BATTLE_CRISIS"
  | "BATTLE_ENDED"
  | "ARMY_ARRIVED"
  | "CHARACTER_ARRIVED"
  | "ENEMY_SIGHTED"
  | "INTERCEPTION"
  | "STRATEGIC_BRIEFING"
  | "SIEGE_STARTED"
  | "SIEGE_ENDED"
  | "IMPORTANT_MESSAGE"
  | "ORDER_FAILED"
  | "MAJOR_WORLD_EVENT";

export interface CommandInterrupt {
  id:
    string;

  type:
    CommandInterruptType;

  createdAt:
    WorldMinute;

  affectedPlayerIds:
    string[];

  message:
    string;

  resolvedPlayerIds:
    string[];
}

export interface CommandCycleState {
  phase:
    CommandCyclePhase;

  playerOrder:
    string[];

  requiredPlayerIds:
    string[];

  readyPlayerIds:
    string[];

  currentPlayerId?:
    string;

  windowOpenedAt:
    WorldMinute;

  executionStartedAt?:
    WorldMinute;

  interrupt?:
    CommandInterrupt;
}

export type KnowledgeSource =
  | "direct_observation"
  | "courier"
  | "scout"
  | "strategic_briefing"
  | "system";

export type KnowledgeConfidence =
  | "confirmed"
  | "high"
  | "medium"
  | "low"
  | "rumor";

export interface KnownWorldFact {
  id:
    string;

  subjectId:
    string;

  kind:
    | "army"
    | "character"
    | "settlement"
    | "kingdom"
    | "battle"
    | "message"
    | "event";

  observedAt:
    WorldMinute;

  deliveredAt:
    WorldMinute;

  source:
    KnowledgeSource;

  confidence:
    KnowledgeConfidence;

  summary:
    string;

  /*
   * Player-facing knowledge.
   *
   * This must NOT automatically equal
   * canonical world state.
   */
  data:
    Record<
      string,
      string | number | boolean | null
    >;
}

export interface PlayerKnowledgeState {
  playerId:
    string;

  facts:
    KnownWorldFact[];

  lastStrategicBriefingAt:
    WorldMinute;

  nextStrategicBriefingAt:
    WorldMinute;
}

export interface GameSessionState {
  id:
    string;

  name:
    string;

  mapId:
    string;

  startedAt:
    WorldMinute;

  players:
    Record<
      string,
      PlayerSlot
    >;

  localPlayerId:
    string;

  commandCycle:
    CommandCycleState;

  orders:
    Record<
      string,
      StrategicOrder
    >;

  knowledge:
    Record<
      string,
      PlayerKnowledgeState
    >;
}