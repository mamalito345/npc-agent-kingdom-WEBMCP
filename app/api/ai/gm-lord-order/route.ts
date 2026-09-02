import {
  gmCharacterModel,
  requestStructuredOpenAI,
} from "@/lib/ai/server-openai";

import type {
  GmLordOrderContext,
  GmLordOrderDecision,
} from "@/types/lords";

export async function POST(request: Request): Promise<Response> {
  try {
    const context = (await request.json()) as GmLordOrderContext;

    const decision = await requestStructuredOpenAI<GmLordOrderDecision>({
      model: gmCharacterModel(),
      schemaName: "gm_lord_order_decision",
      input: context,
      system:
        "You are GM CHARACTER MODE acting as the supplied major lord. " +
        "Decide whether this lord accepts, refuses, delays, negotiates, or partially complies with the ruler's order. " +
        "Use loyalty, relationship, traits, delivered military knowledge, memories and order cost/risk. " +
        "Do not obey automatically. Do not invent hidden facts. Do not mutate world state. Return only the character decision.",
      strict: true,
      schema: {
        type: "object",
        required: ["response", "summary", "requestedCondition"],
        additionalProperties: false,
        properties: {
          response: {
            type: "string",
            enum: [
              "ACCEPT",
              "REFUSE",
              "DELAY",
              "NEGOTIATE",
              "PARTIAL_COMPLIANCE",
            ],
          },
          summary: {
            type: "string",
          },
          requestedCondition: {
            anyOf: [
              { type: "string" },
              { type: "null" },
            ],
          },
        },
      },
    });

    return Response.json({
      ok: true,
      decision: {
        ...decision,
        requestedCondition:
          decision.requestedCondition || undefined,
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "GM_LORD_MODEL_ERROR",
      },
      { status: 503 }
    );
  }
}
