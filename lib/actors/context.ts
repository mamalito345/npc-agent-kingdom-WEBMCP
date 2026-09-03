import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getPlayerObservation,
  getPlayerKnownWorld,
  getPlayerKnownEnemyForces,
  getPlayerMessages,
  getPlayerBattlesView,
  getPlayerSettlementsView,
  getPlayerEconomyView,
} from "@/lib/session/observation";

import {
  getPlayerOrders,
} from "@/lib/session/orders";

import {
  inspectPresentCharacters,
} from "@/lib/conversation/service";

import {
  inspectKingdomLords,
  inspectLordOrders,
} from "@/lib/lords/service";

import {
  inspectAgreements,
  inspectDiplomaticProposals,
  inspectPromises,
  inspectRelationships,
} from "@/lib/politics/service";

import {
  inspectPlayerCampaignStatus,
} from "@/lib/session/campaign-observation";

import {
  inspectAudienceRequests,
} from "@/lib/politics/audience";

import type {
  LlmPlayerActivationReason,
  LlmPlayerContext,
  LlmPlayerToolName,
  StrategicPlan,
} from "@/types/actors";

const AVAILABLE_ACTIONS:
  LlmPlayerToolName[] = [
  "inspect_player_state",
  "inspect_known_world",
  "inspect_armies",
  "inspect_known_enemy_forces",
  "inspect_messages",
  "inspect_orders",
  "inspect_battles",
  "inspect_settlements",
  "inspect_economy",
  "inspect_present_characters",
  "inspect_kingdom_lords",
  "inspect_lord_orders",
  "inspect_relationships",
  "inspect_agreements",
  "inspect_diplomatic_proposals",
  "inspect_promises",
  "inspect_campaign_status",
  "inspect_audience_requests",
  "convene_council",
  "respond_audience_request",
  "issue_character_order",
  "issue_army_move",
  "issue_intercept",
  "cancel_order",
  "change_order",
  "split_army",
  "merge_armies",
  "support_army",
  "stop_army_support",
  "assign_commander",
  "fortify_settlement",
  "develop_settlement",
  "raid_settlement",
  "capture_settlement",
  "set_battle_tactic",
  "submit_battle_crisis_order",
  "recruit_units",
  "start_siege",
  "send_message",
  "send_envoy",
  "talk_to_character",
  "end_conversation",
  "propose_agreement",
  "respond_to_agreement",
  "create_promise",
  "resolve_promise",
  "pass_command_window",
];

function getActivePlan(
  playerId:
    string
): StrategicPlan | null {
  const world =
    getRuntimeWorldState();

  const planId =
    world.session
      .llmPlayers
      .activePlanByPlayerId[
        playerId
      ];

  if (!planId) {
    return null;
  }

  return (
    world.session
      .llmPlayers
      .plans[
        planId
      ] ??
    null
  );
}

export function buildLlmPlayerContext(
  playerId:
    string,
  activationReason:
    LlmPlayerActivationReason
): LlmPlayerContext | undefined {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[
      playerId
    ];

  if (!player?.active) {
    return undefined;
  }

  const playerState =
    getPlayerObservation(
      playerId
    );

  if (!playerState) {
    return undefined;
  }

  return {
    sessionId:
      world.session.id,

    playerId,

    activationReason,

    worldTimeMinutes:
      world.simulation
        .worldTimeMinutes,

    playerState,

    knownWorld:
      getPlayerKnownWorld(
        world.session.id,
        playerId
      ),

    knownEnemyForces:
      getPlayerKnownEnemyForces(
        world.session.id,
        playerId
      ),

    messages:
      getPlayerMessages(
        world.session.id,
        playerId
      ),

    orders: {
      ok:
        true,

      orders:
        getPlayerOrders(
          playerId
        ),
    },

    battles:
      getPlayerBattlesView(
        world.session.id,
        playerId
      ),

    settlements:
      getPlayerSettlementsView(
        world.session.id,
        playerId
      ),

    economy:
      getPlayerEconomyView(
        world.session.id,
        playerId
      ),

    presentCharacters:
      inspectPresentCharacters(
        world.session.id,
        playerId
      ),

    lords:
      inspectKingdomLords(
        world.session.id,
        playerId
      ),

    lordOrders:
      inspectLordOrders(
        world.session.id,
        playerId
      ),

    relationships:
      inspectRelationships(
        world.session.id,
        playerId
      ),

    agreements:
      inspectAgreements(
        world.session.id,
        playerId
      ),

    diplomaticProposals:
      inspectDiplomaticProposals(
        world.session.id,
        playerId
      ),

    promises:
      inspectPromises(
        world.session.id,
        playerId
      ),

    campaignStatus:
      inspectPlayerCampaignStatus(
        world.session.id,
        playerId
      ),

    audienceRequests:
      inspectAudienceRequests(
        world.session.id,
        playerId
      ),

    activePlan:
      getActivePlan(
        playerId
      ),

    availableActions: [
      ...AVAILABLE_ACTIONS,
    ],

    rules: [
      "You are a player, not the World Director.",
      "Use only player-safe information in this context and gameplay tools.",
      "Never assume hidden canonical enemy or political state.",
      "All mutations must go through normal player action services.",
      "Remote diplomacy and remote lord orders use physical couriers.",
      "Do not assume an undelivered proposal exists.",
      "An accepted military-support agreement never teleports armies.",
      "Army support requires the supporter to remain stationary on the target node or one directly adjacent strategic node.",
      "Army split and merge are physical operations; moving or battle-engaged armies cannot be reorganized.",
      "Direct commander assignment is limited to the player ruler; independent lords remain autonomous political actors.",
      "Economic development spends local settlement resources and improves only that settlement's production.",
      "Raid and capture actions require a real active war and physical army presence at the target settlement.",
      "Fortified settlements must be breached before capture.",
      "Campaign victory is derived from canonical capital control; there is no hidden instant-win action.",
      "Audience petitions are canonical political requests. You may inspect them, seek council advice, and accept/refuse/defer only when presented.",
      "Council advice is advisory; the ruler remains responsible for the final decision and its canonical consequences.",
      "Do not act outside your command window.",
      "Keep actions bounded and pass the command window when finished.",
    ],
  };
}
