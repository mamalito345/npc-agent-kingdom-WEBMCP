import {
  gmDirectorModel,
  requestStructuredOpenAI,
} from "@/lib/ai/server-openai";

import type {
  DirectorContext,
  DirectorProposalDraft,
} from "@/types/director";

interface ProposalEnvelope {
  proposals: DirectorProposalDraft[];
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = (await request.json()) as DirectorContext;

    const envelope = await requestStructuredOpenAI<ProposalEnvelope>({
      model: gmDirectorModel(),
      schemaName: "world_director_proposals",
      input: context,
      system:
        "You are WORLD DIRECTOR MODE. You are not a kingdom player. " +
        "Return only bounded structured proposals supported by the existing Director schema. " +
        "Never control player characters/armies, choose battle winners, teleport entities, invent armies/resources, or reveal hidden information.",
      strict: false,
      schema: {
        type: "object",
        required: ["proposals"],
        properties: {
          proposals: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              required: ["type", "reason", "payload"],
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "npc_character_travel",
                    "npc_army_move",
                    "npc_recruit_units",
                    "npc_start_siege",
                    "npc_send_message",
                    "schedule_world_interrupt",
                    "kingdom_relation_delta",
                    "player_knowledge_report",
                  ],
                },
                reason: {
                  type: "string",
                },
                payload: {
                  type: "object",
                  additionalProperties: true,
                },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    });

    return Response.json({
      ok: true,
      proposals: envelope.proposals,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "GM_DIRECTOR_PROPOSAL_ERROR",
      },
      { status: 503 }
    );
  }
}
