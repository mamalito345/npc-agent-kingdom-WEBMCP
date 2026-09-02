import {
  gmDirectorModel,
  requestStructuredOpenAI,
} from "@/lib/ai/server-openai";

import type {
  EventDirectorContext,
  EventDirectorSelection,
} from "@/types/events";

export async function POST(request: Request): Promise<Response> {
  try {
    const context = (await request.json()) as EventDirectorContext;
    const allowed = context.candidates.map((candidate) => candidate.candidateId);

    const selection = await requestStructuredOpenAI<EventDirectorSelection>({
      model: gmDirectorModel(),
      schemaName: "world_director_event_selection",
      input: context,
      system:
        "You are WORLD DIRECTOR MODE, separate from players and NPC characters. " +
        "Select only one supplied predefined event candidate or null. " +
        "Never invent events, bindings, resources, armies, winners, knowledge delivery or player actions. " +
        "Prefer contextually meaningful variety and avoid event spam.",
      strict: true,
      schema: {
        type: "object",
        required: ["decisionSummary", "selectedCandidateId"],
        additionalProperties: false,
        properties: {
          decisionSummary: {
            type: "string",
          },
          selectedCandidateId: {
            anyOf: [
              {
                type: "string",
                enum: allowed,
              },
              {
                type: "null",
              },
            ],
          },
        },
      },
    });

    return Response.json({
      ok: true,
      selection,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "GM_DIRECTOR_MODEL_ERROR",
      },
      { status: 503 }
    );
  }
}
