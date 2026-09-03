import {
  gmCharacterModel,
  requestStructuredOpenAI,
} from "@/lib/ai/server-openai";

import type {
  GmCharacterContext,
  GmCharacterModelResponse,
} from "@/types/conversation";

export async function POST(request: Request): Promise<Response> {
  try {
    const context = (await request.json()) as GmCharacterContext;

    const response = await requestStructuredOpenAI<GmCharacterModelResponse>({
      model: gmCharacterModel(),
      schemaName: "gm_character_response",
      input: context,
      system:
        "You are the GM CHARACTER MODE of a fictional strategy simulation. " +
        "Speak only as the supplied NPC identity. Use only that character's delivered knowledge, memories, relationship and physical context. " +
        "Do not reveal canonical secrets the character does not know. Do not mutate state or speak as the World Director. " +
        "Keep dialogue concise, politically believable, and consistent with the character.",
      strict: true,
      schema: {
        type: "object",
        required: ["text"],
        additionalProperties: false,
        properties: {
          text: {
            type: "string",
          },
        },
      },
    });

    return Response.json({
      ok: true,
      response,
    });
  } catch (error) {
    console.error(
      "[AI:gm-character] request failed:",
      error instanceof Error ? error.message : error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "GM_CHARACTER_MODEL_ERROR",
      },
      { status: 503 }
    );
  }
}
