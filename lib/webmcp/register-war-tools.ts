import {
  getIdentityBoundWebMcpModelContext,
} from "@/lib/webmcp/identity-guard";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  declarePlayerWar,
} from "@/lib/session/player-actions";

import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

const declareWarSchema = {
  type:
    "object",

  properties: {
    /*
     * session_id / player_id deliberately do NOT appear in the public schema.
     *
     * The identity-bound WebMCP facade injects them immediately before
     * canonical execution. This keeps ChatGPT UX zero-ID while preserving
     * spoof protection and the normal PlayerAction authorization gateway.
     */
    target_kingdom_id: {
      type:
        "string",
    },

    reason: {
      type:
        "string",

      enum: [
        "BORDER_VIOLATION",
        "DEFENSE_OF_ALLY",
        "CLAIM",
        "RETALIATION",
        "AGGRESSION",
      ],
    },
  },

  required: [
    "target_kingdom_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

let registrationController:
  AbortController |
  null =
  null;

export async function registerWarWebMCPTools():
  Promise<boolean> {
  if (
    !isWebMCPAvailable()
  ) {
    return false;
  }

  const modelContext =
    getIdentityBoundWebMcpModelContext();

  if (!modelContext) {
    return false;
  }

  if (
    registrationController
  ) {
    return true;
  }

  const controller =
    new AbortController();

  registrationController =
    controller;

  try {
    await modelContext.registerTool(
      {
        name:
          "declare_war",

        description:
          "Declare canonical war on another kingdom during the bound player's command window. Identity is supplied automatically by the game, not by the model.",

        inputSchema:
          declareWarSchema,

        execute:
          async (
            input:
              Record<
                string,
                unknown
              >
          ) => {
            /*
             * The facade injects the canonical bound identifiers even though
             * they are hidden from the public schema.
             */
            const sessionId =
              input.session_id;

            const playerId =
              input.player_id;

            const targetKingdomId =
              input.target_kingdom_id;

            const reason =
              input.reason;

            if (
              typeof sessionId !==
                "string" ||
              typeof playerId !==
                "string" ||
              typeof targetKingdomId !==
                "string"
            ) {
              return {
                ok:
                  false as const,

                error:
                  "WEBMCP_BOUND_IDENTITY_OR_TARGET_MISSING",
              };
            }

            return declarePlayerWar(
              sessionId,
              playerId,
              targetKingdomId,
              typeof reason ===
                "string"
                ? reason as
                    | "BORDER_VIOLATION"
                    | "DEFENSE_OF_ALLY"
                    | "CLAIM"
                    | "RETALIATION"
                    | "AGGRESSION"
                : "AGGRESSION"
            );
          },
      },

      {
        signal:
          controller.signal,
      }
    );

    return true;
  } catch (
    error
  ) {
    controller.abort();

    registrationController =
      null;

    throw error;
  }
}

export function unregisterWarWebMCPTools():
  void {
  if (
    !registrationController
  ) {
    return;
  }

  registrationController.abort();

  registrationController =
    null;
}
