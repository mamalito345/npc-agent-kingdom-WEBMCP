import {
  playerModel,
  requestStructuredOpenAI,
} from "@/lib/ai/server-openai";

import type {
  LlmPlayerContext,
  LlmPlayerDecision,
} from "@/types/actors";

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
  "pass_command_window",
] as const;

export async function POST(request: Request): Promise<Response> {
  try {
    const context = (await request.json()) as LlmPlayerContext;

    const decision = await requestStructuredOpenAI<LlmPlayerDecision>({
      model: playerModel(),
      schemaName: "player_llm_decision",
      input: context,
      system:
        "You are a strategic PLAYER LLM in a fictional persistent strategy game. " +
        "You are not the GM. Use only the supplied player-safe information. " +
        "Return bounded gameplay tool calls; never invent hidden information, direct state mutation, or nonexistent entities. " +
        "Use inspections when uncertain. Finish the command window when your useful actions are complete.",
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
