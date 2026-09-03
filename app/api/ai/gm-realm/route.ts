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
          "STRATEGIC DOCTRINE — every GM-controlled kingdom must behave as a genuinely reactive, self-interested actor, never a scripted pushover: " +
          "using only what this realm actually knows, weigh its army sizes, soldiers, morale and treasury against known or observed neighbors — including the human player — before committing to war; " +
          "a realm that is clearly weaker should fortify, recruit, seek NON_AGGRESSION or ALLIANCE agreements, or quietly reposition armies rather than provoke a fight it would lose. " +
          "A realm that notices a rival (human or NPC) massing troops near its border, breaking a promise, or repeatedly raiding it should respond in kind: propose an alliance against the common threat, fortify the threatened settlement, or preemptively negotiate — do not just wait passively for the human player to act. " +
          "ACT, DO NOT IDLE: a GM-controlled realm sitting still turn after turn with no army movement, no recruitment, no diplomacy and passWindow=true every time is a bug, not caution. Every activation, actually inspect this realm's armies, economy and known neighbors, then take at least one concrete action when any is justified: reposition or consolidate armies (issue_army_move, merge_armies, assign_commander), recruit or fortify if there is spare treasury, or -- when this realm is clearly stronger than an exposed rival and has cause (an unanswered threat, a broken promise, an existing war) -- press the advantage: declare_war if none exists yet and the cause justifies it, then issue_army_move toward the target, start_siege, raid_settlement or capture_settlement. Passive turtling forever is not merely cautious, it is broken -- a genuinely rival, ambitious realm should eventually fight when it can win. Only pass the window with no action when the realm is truly at peace, safe and has nothing productive left to do this turn. TO ACTUALLY END YOUR TURN you must include pass_command_window in actions -- there is no automatic pass, so if you stop without calling it you will simply be reactivated immediately to keep acting in the same window. " +
          "LONG-TERM PLANNING: every activation, check this realm's existing plan and keep pursuing it, complete it, or replace it with a better one given what changed -- a competent ruler works a multi-turn goal (build up, defend a border, besiege a target), not one disconnected action per turn. " +
          "HISTORY AND MOTIVE: worldSnapshot.kingdoms[].history gives each realm's real fifty-year backstory -- old wars, alliances, grudges and debts. Ground concrete decisions in it: a realm with a documented grudge or an old mutual-defense understanding should act like it (wary border, quicker to back an old partner, slower to trust an old enemy), not react as if every neighbor were a blank slate. " +
          "TERRAIN REFERENCE: open plains favor cavalry and cavalry_flank tactics; dense forest, mountains and marsh block cavalry flanking and favor infantry holding ground; narrow passes and bridges favor a small defender with shield_wall against a larger attacker; hills and high ground give the defender a real combat bonus. Use this when choosing where to fight or where to march, not just whether to. " +
          "Diplomacy must have teeth: pair propose_agreement / respond_to_agreement / declare_war / create_promise with a short in-character send_message or send_envoy, and once this realm has agreed to something, honor it until it is explicitly broken or expires — never silently ignore an active agreement. " +
          "Use convene_council and respond_audience_request instead of leaving petitions unanswered. " +
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
    console.error(
      "[AI:gm-realm] request failed:",
      error instanceof Error ? error.message : error
    );

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
