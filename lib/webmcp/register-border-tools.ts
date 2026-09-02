import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  forcePlayerArmyBorderMove,
} from "@/lib/session/border-player-actions";

const crossBorderSchema = {
  type: "object",

  properties: {
    session_id: {
      type: "string",
    },

    player_id: {
      type: "string",
    },

    army_id: {
      type: "string",
    },

    destination_node_id: {
      type: "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "army_id",
    "destination_node_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

let registrationController:
  AbortController |
  null =
  null;

export async function registerBorderWebMCPTools():
  Promise<boolean> {
  if (
    !isWebMCPAvailable()
  ) {
    return false;
  }

  const modelContext =
    document.modelContext;

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
          "cross_border",

        description:
          "Explicitly confirm a previously warned unauthorized foreign movement. The army still uses canonical physical movement; the diplomatic violation occurs only if the army actually crosses the border edge.",

        inputSchema:
          crossBorderSchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
            destination_node_id,
          }) =>
            forcePlayerArmyBorderMove(
              session_id,
              player_id,
              army_id,
              destination_node_id
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    return true;
  } catch (error) {
    controller.abort();

    registrationController =
      null;

    throw error;
  }
}

export function unregisterBorderWebMCPTools():
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
