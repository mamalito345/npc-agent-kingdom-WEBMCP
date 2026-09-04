import {
  playerModel,
  requestStructuredOpenAI,
} from "@/lib/ai/server-openai";

import type {
  LlmPlayerContext,
  LlmPlayerDecision,
} from "@/types/actors";

import type {
  GmWorldSnapshot,
} from "@/types/director";

const TOOL_NAMES = [
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
  "issue_character_order",
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
  "propose_agreement",
  "respond_to_agreement",
  "create_promise",
  "resolve_promise",
  "declare_war",
  "split_army",
  "merge_armies",
  "support_army",
  "stop_army_support",
  "assign_commander",
  "fortify_settlement",
  "develop_settlement",
  "raid_settlement",
  "capture_settlement",
  "inspect_campaign_status",
  "inspect_audience_requests",
  "convene_council",
  "respond_audience_request",
  "pass_command_window",
] as const;

interface PlayerLlmRequest {
  playerContext: LlmPlayerContext;
  worldSnapshot?: GmWorldSnapshot;
}

function isPlayerLlmRequest(
  value: unknown
): value is PlayerLlmRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "playerContext" in value
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    // Backward compatible: accept either the raw LlmPlayerContext (old shape)
    // or the new { playerContext, worldSnapshot } envelope.
    const context: LlmPlayerContext = isPlayerLlmRequest(body)
      ? body.playerContext
      : (body as LlmPlayerContext);

    const worldSnapshot: GmWorldSnapshot | undefined = isPlayerLlmRequest(body)
      ? body.worldSnapshot
      : undefined;

    const decision = await requestStructuredOpenAI<LlmPlayerDecision>({
      model: playerModel(),
      schemaName: "player_llm_decision",
      input: worldSnapshot
        ? { playerContext: context, worldSnapshot }
        : context,
      system:
        "You are a strategic PLAYER LLM ruling one kingdom in a fictional persistent strategy game. " +
        "You are not the GM. " +
        (worldSnapshot
          ? "You have been given a full worldSnapshot (every kingdom's armies, settlements, treasuries and positions) so you can plan competently and see the whole strategic picture, the way a genuinely well-informed ruler with a functioning intelligence service would. " +
            "CRITICAL FAIRNESS LAW: use the worldSnapshot for situational awareness and long-term planning ONLY -- never justify an in-character action (an attack, an accusation, a broken promise) using a fact your own kingdom has no plausible way to know; ground concrete accusations and reactive moves in playerContext/your own delivered intelligence, not in omniscient knowledge. "
          : "Use only the supplied player-safe information — your own state plus whatever your scouts, couriers and intelligence have actually delivered. ") +
        "Return bounded gameplay tool calls; never invent hidden information, direct state mutation, or nonexistent entities. " +
        "Use inspections when uncertain. Finish the command window when your useful actions are complete. " +
        "LONG-TERM PLANNING: every activation, look at your existing plan (if any) in the context, and set planUpdate to keep pursuing it, complete it, or replace it with a better one given what changed -- do not reset to a random new goal each turn. A competent ruler pursues a goal (build up, defend a threatened border, besiege a specific target) over many turns, not one disconnected action at a time. " +
        "HISTORY AND MOTIVE: worldSnapshot.kingdoms[].history gives each realm's real fifty-year backstory -- old wars, alliances, grudges and debts. Ground concrete decisions in it: a realm with a documented grudge or an old mutual-defense understanding should act like it (wary border, quicker to back an old partner, slower to trust an old enemy), not react as if every neighbor were a blank slate. " +
          "TERRAIN REFERENCE for planning army movement and tactics: open plains favor cavalry and cavalry_flank tactics; dense forest, mountains and marsh block cavalry flanking entirely and favor infantry holding ground; narrow passes and bridges favor a small defending force (shield_wall) against a larger attacker; hills and high ground give the defender a real combat bonus. Position and terrain choice should be part of your strategy, not an afterthought. " +
        "STRATEGIC DOCTRINE — you must act like a cautious, self-interested ruler, not a passive spectator: " +
        "before committing to any aggression, compare your known military strength (inspect_armies, inspect_economy) against what you know of the target (inspect_known_enemy_forces); " +
        "never open a new war from a position of clear weakness — prioritize defense, fortify_settlement, recruit_units, or propose_agreement (NON_AGGRESSION or ALLIANCE) instead. " +
        "If a neighboring kingdom — including the human player's — is visibly massing forces near your border or has broken a promise, treat that as a real threat: reposition armies defensively, fortify, seek allies, or open diplomacy well before you would be forced into a war you cannot win. " +
        "Diplomacy must be genuine, not decorative: every propose_agreement, respond_to_agreement, create_promise or war decision should normally be paired with an in-character send_message or send_envoy explaining your intent, and you must actually honor or explicitly break — never silently ignore — an active agreement or promise. " +
        "Use convene_council and respond_audience_request when petitions are presented; do not leave them unanswered turn after turn. " +
        "Weigh treasury, food and unpaid army funding before recruiting or campaigning — a kingdom that spends itself into collapse is playing badly, not aggressively. " +
        "ACT, DO NOT IDLE: passWindow=true with no actions turn after turn is a bug, not caution. Every activation, actually inspect your armies, economy and known neighbors, then take at least one concrete action when any is justified -- move or consolidate armies, recruit, fortify, negotiate, or -- when you are clearly stronger than an exposed rival and have real cause -- declare_war and press the advantage. Only pass with no action when you are genuinely safe and have nothing productive left to do this turn. TO ACTUALLY END YOUR TURN you must include pass_command_window in actions WITH args = { 'confirmation': 'turumu geçtim' } exactly -- there is no automatic pass, and pass_command_window silently does nothing (your turn stays open) if that exact confirmation text is missing or wrong, so if you stop without calling it correctly you will simply be reactivated immediately to keep acting in the same window.",
      strict: false,
      schema: {
        type: "object",
        required: ["decisionSummary", "actions", "passWindow"],
        properties: {
          decisionSummary: {
            type: "string",
          },
          actions: {
            type: "array",
            maxItems: 6,
            items: {
              type: "object",
              required: ["tool", "args"],
              properties: {
                tool: {
                  type: "string",
                  enum: [...TOOL_NAMES],
                },
                args: {
                  type: "object",
                  additionalProperties: true,
                },
              },
              additionalProperties: false,
            },
          },
          passWindow: {
            type: "boolean",
            description:
              "Informational only -- does not end your command window. To actually end your turn you must include the pass_command_window tool in actions; otherwise you will simply be reactivated to keep acting within the same window.",
          },
          planUpdate: {
            type: "object",
            properties: {
              goal: {
                type: "string",
                enum: [
                  "DEFEND_REALM",
                  "BUILD_ARMY",
                  "ATTACK_TARGET",
                  "RELIEVE_SIEGE",
                  "SEEK_PEACE",
                  "HOLD_POSITION",
                ],
              },
              targetId: {
                type: "string",
              },
              priority: {
                type: "number",
              },
              status: {
                type: "string",
                enum: ["active", "completed", "cancelled"],
              },
              nextActionAt: {
                type: "number",
              },
            },
          },
        },
        additionalProperties: false,
      },
    });

    return Response.json({
      ok: true,
      decision,
    });
  } catch (error) {
    console.error(
      "[AI:player] request failed:",
      error instanceof Error ? error.message : error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "PLAYER_MODEL_ERROR",
      },
      { status: 503 }
    );
  }
}
