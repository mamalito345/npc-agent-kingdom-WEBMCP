import type { WorldMinute } from "@/types/simulation";

export type LlmPlayerActivationReason =
  | "NORMAL_COMMAND_WINDOW"
  | "IMPORTANT_MESSAGE"
  | "ENEMY_CONTACT"
  | "BATTLE_CRISIS"
  | "OWN_SETTLEMENT_THREATENED"
  | "OWN_LAND_ATTACKED"
  | "MAJOR_ORDER_COMPLETED"
  | "IMPORTANT_INTERRUPT";

export type StrategicPlanGoal =
  | "DEFEND_REALM"
  | "BUILD_ARMY"
  | "ATTACK_TARGET"
  | "RELIEVE_SIEGE"
  | "SEEK_PEACE"
  | "HOLD_POSITION";

export type StrategicPlanStatus =
  | "active"
  | "completed"
  | "cancelled";

export interface StrategicPlan {
  id:
    string;
  playerId:
    string;
  goal:
    StrategicPlanGoal;
  targetId?:
    string;
  priority:
    number;
  status:
    StrategicPlanStatus;
  nextActionAt?:
    WorldMinute;
  createdAt:
    WorldMinute;
  updatedAt:
    WorldMinute;
}

export type LlmPlayerToolName =
  | "inspect_player_state"
  | "inspect_known_world"
  | "inspect_armies"
  | "inspect_known_enemy_forces"
  | "inspect_messages"
  | "inspect_orders"
  | "inspect_battles"
  | "inspect_settlements"
  | "inspect_economy"
  | "inspect_present_characters"
  | "inspect_kingdom_lords"
  | "inspect_lord_orders"
  | "inspect_relationships"
  | "inspect_agreements"
  | "inspect_diplomatic_proposals"
  | "inspect_promises"
  | "inspect_campaign_status"
  | "inspect_audience_requests"
  | "convene_council"
  | "respond_audience_request"
  | "issue_character_order"
  | "declare_war"
  | "issue_army_move"
  | "issue_intercept"
  | "cancel_order"
  | "change_order"
  | "split_army"
  | "merge_armies"
  | "support_army"
  | "stop_army_support"
  | "assign_commander"
  | "fortify_settlement"
  | "develop_settlement"
  | "raid_settlement"
  | "capture_settlement"
  | "set_battle_tactic"
  | "submit_battle_crisis_order"
  | "recruit_units"
  | "start_siege"
  | "send_message"
  | "send_envoy"
  | "talk_to_character"
  | "end_conversation"
  | "propose_agreement"
  | "respond_to_agreement"
  | "create_promise"
  | "resolve_promise"
  | "pass_command_window";

export interface LlmPlayerAction {
  tool:
    LlmPlayerToolName;
  args:
    Record<
      string,
      string |
      number |
      boolean |
      null |
      undefined
    >;
}

export interface LlmPlayerPlanUpdate {
  goal:
    StrategicPlanGoal;
  targetId?:
    string;
  priority:
    number;
  status?:
    StrategicPlanStatus;
  nextActionAt?:
    WorldMinute;
}

export interface LlmPlayerDecision {
  decisionSummary:
    string;
  actions:
    LlmPlayerAction[];
  planUpdate?:
    LlmPlayerPlanUpdate;
  passWindow?:
    boolean;
}

export interface LlmActionExecutionResult {
  tool:
    LlmPlayerToolName;
  ok:
    boolean;
  result:
    unknown;
}

export interface LlmDecisionRecord {
  id:
    string;
  playerId:
    string;
  activatedAt:
    WorldMinute;
  activationReason:
    LlmPlayerActivationReason;
  observationSummary:
    string;
  requestedActions:
    LlmPlayerAction[];
  actionResults:
    LlmActionExecutionResult[];
  decisionSummary:
    string;
  planId?:
    string;
}

export interface LlmPlayerRuntimeState {
  plans:
    Record<
      string,
      StrategicPlan
    >;
  activePlanByPlayerId:
    Record<
      string,
      string |
      undefined
    >;
  decisions:
    LlmDecisionRecord[];
  lastActivationAt:
    Record<
      string,
      WorldMinute |
      undefined
    >;
}

export interface LlmPlayerContext {
  sessionId:
    string;
  playerId:
    string;
  activationReason:
    LlmPlayerActivationReason;
  worldTimeMinutes:
    WorldMinute;
  playerState:
    unknown;
  knownWorld:
    unknown;
  knownEnemyForces:
    unknown;
  messages:
    unknown;
  orders:
    unknown;
  battles:
    unknown;
  settlements:
    unknown;
  economy:
    unknown;
  presentCharacters:
    unknown;
  lords:
    unknown;
  lordOrders:
    unknown;
  relationships:
    unknown;
  agreements:
    unknown;
  diplomaticProposals:
    unknown;
  promises:
    unknown;
  campaignStatus:
    unknown;
  audienceRequests?:
    unknown;
  activePlan:
    StrategicPlan | null;
  availableActions:
    LlmPlayerToolName[];
  rules:
    string[];
}

export interface LlmPlayerModelAdapter {
  generateDecision(
    context:
      LlmPlayerContext
  ):
    Promise<
      LlmPlayerDecision
    >;
}
