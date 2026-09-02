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

import type {
  LlmPlayerActivationReason,
  LlmPlayerContext,
  LlmPlayerToolName,
  StrategicPlan,
} from "@/types/actors";

const AVAILABLE_ACTIONS: LlmPlayerToolName[] = [
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
  "issue_army_move",
  "issue_intercept",
  "cancel_order",
  "change_order",
  "set_battle_tactic",
  "submit_battle_crisis_order",
  "recruit_units",
  "start_siege",
  "send_message",
  "send_envoy",
  "talk_to_character",
  "end_conversation",
  "pass_command_window",
];

function getActivePlan(playerId: string): StrategicPlan | null {
  const world = getRuntimeWorldState();
  const planId = world.session.llmPlayers.activePlanByPlayerId[playerId];

  if (!planId) {
    return null;
  }

  return world.session.llmPlayers.plans[planId] ?? null;
}

export function buildLlmPlayerContext(
  playerId: string,
  activationReason: LlmPlayerActivationReason
): LlmPlayerContext | undefined {
  const world = getRuntimeWorldState();
  const player = world.session.players[playerId];

  if (!player?.active) {
    return undefined;
  }

  const playerState = getPlayerObservation(playerId);
  if (!playerState) {
    return undefined;
  }

  /*
   * Enemy/world information comes exclusively from player-safe readers.
   * No canonical enemy armies, routes, foreign treasuries or secret messages
   * are copied into this context.
   */
  return {
    sessionId: world.session.id,
    playerId,
    activationReason,
    worldTimeMinutes: world.simulation.worldTimeMinutes,
    playerState,
    knownWorld: getPlayerKnownWorld(world.session.id, playerId),
    knownEnemyForces: getPlayerKnownEnemyForces(world.session.id, playerId),
    messages: getPlayerMessages(world.session.id, playerId),
    orders: {
      ok: true,
      orders: getPlayerOrders(playerId),
    },
    battles: getPlayerBattlesView(world.session.id, playerId),
    settlements: getPlayerSettlementsView(world.session.id, playerId),
    economy: getPlayerEconomyView(world.session.id, playerId),
    presentCharacters: inspectPresentCharacters(world.session.id, playerId),
    activePlan: getActivePlan(playerId),
    availableActions: [...AVAILABLE_ACTIONS],
    rules: [
      "You are a player, not the World Director.",
      "Use only player-safe information in this context and gameplay tools.",
      "Never assume hidden canonical enemy state.",
      "All mutations must go through normal player action services.",
      "Do not act outside your command window.",
      "Distant communication uses couriers; distant NPC conversation is not allowed.",
      "Keep actions bounded and pass the command window when finished.",
    ],
  };
}
