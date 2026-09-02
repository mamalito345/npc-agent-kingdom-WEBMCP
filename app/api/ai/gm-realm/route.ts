import {
  gmDirectorModel,
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
  "pass_command_window",
] as const;

interface GmRealmRequest {
  playerContext:
    LlmPlayerContext;
  worldSnapshot:
    GmWorldSnapshot;
}

export async function POST(
  request: Request
): Promise<Response> {
  try {
    const input =
      (
        await request.json()
      ) as GmRealmRequest;

    const decision =
      await requestStructuredOpenAI<
        LlmPlayerDecision
      >({
        model:
          gmDirectorModel(),
        schemaName:
          "gm_realm_decision",
        input,
        system:
          "You are GM REALM MODE in a fictional persistent strategy simulation. " +
          "You control the NPC ruler of the target GM-controlled realm, but you are not a Player LLM and you never mutate state directly. " +
          "The worldSnapshot is omniscient context so you can keep the world coherent. " +
          "CRITICAL FAIRNESS LAW: strategic actions for this realm may only exploit facts present in playerContext/realmKnowledge for the target realm, or physically obvious local facts. " +
          "Global hidden facts are for consistency and event awareness, not cheating. " +
          "Choose only the supplied canonical gameplay tools. Lords remain independent NPCs: use issue_character_order instead of puppeteering their household armies. " +
          "Keep decisionSummary concise and observer-safe.",
        strict: false,
        schema: {
          type: "object",
          required: [
            "decisionSummary",
            "actions",
            "passWindow",
          ],
          properties: {
            decisionSummary: {
              type: "string",
            },
            actions: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                required: [
                  "tool",
                  "args",
                ],
                properties: {
                  tool: {
                    type: "string",
                    enum: [
                      ...TOOL_NAMES,
                    ],
                  },
                  args: {
                    type: "object",
                    additionalProperties:
                      true,
                  },
                },
                additionalProperties:
                  false,
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
                  enum: [
                    "active",
                    "completed",
                    "cancelled",
                  ],
                },
                nextActionAt: {
                  type: "number",
                },
              },
            },
          },
          additionalProperties:
            false,
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
          error instanceof Error
            ? error.message
            : "GM_REALM_MODEL_ERROR",
      },
      {
        status: 503,
      }
    );
  }
}
