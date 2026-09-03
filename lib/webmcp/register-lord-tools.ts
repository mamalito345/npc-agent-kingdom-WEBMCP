import { getIdentityBoundWebMcpModelContext } from "@/lib/webmcp/identity-guard";
import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  inspectKingdomLords,
  issueCharacterOrder,
} from "@/lib/lords/service";

import type {
  LordOrderType,
} from "@/types/lords";

const inspectSchema = {
  type: "object",
  properties: {
    session_id: {
      type: "string",
    },
    player_id: {
      type: "string",
    },
  },
  required: [
    "session_id",
    "player_id",
  ],
  additionalProperties: false,
} as const satisfies JsonSchemaForInference;

const issueOrderSchema = {
  type: "object",
  properties: {
    session_id: {
      type: "string",
    },
    player_id: {
      type: "string",
    },
    lord_character_id: {
      type: "string",
    },
    order_type: {
      type: "string",
      enum: [
        "REINFORCE",
        "DEFEND_SETTLEMENT",
        "BRING_ARMY",
        "RAISE_TROOPS",
        "HOLD_POSITION",
      ],
    },
    target_node_id: {
      type: "string",
    },
    target_settlement_id: {
      type: "string",
    },
    risk: {
      type: "number",
    },
    note: {
      type: "string",
    },
  },
  required: [
    "session_id",
    "player_id",
    "lord_character_id",
    "order_type",
  ],
  additionalProperties: false,
} as const satisfies JsonSchemaForInference;

let registrationController:
  AbortController |
  null = null;

export async function registerLordWebMCPTools(): Promise<boolean> {
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
          "inspect_kingdom_lords",
        description:
          "Inspect the major NPC lords of your own kingdom, including court-known loyalty, political power, home settlement and military association.",
        inputSchema:
          inspectSchema,
        annotations: {
          readOnlyHint: true,
        },
        execute: async ({
          session_id,
          player_id,
        }) =>
          inspectKingdomLords(
            session_id,
            player_id
          ),
      },
      {
        signal:
          controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name:
          "issue_character_order",
        description:
          "Issue a direct order to one of your own major NPC lords. Direct orders require physical/council presence. Distant lords require courier messaging.",
        inputSchema:
          issueOrderSchema,
        execute: async ({
          session_id,
          player_id,
          lord_character_id,
          order_type,
          target_node_id,
          target_settlement_id,
          risk,
          note,
        }) =>
          issueCharacterOrder(
            session_id,
            player_id,
            lord_character_id,
            {
              type:
                order_type as LordOrderType,
              targetNodeId:
                target_node_id,
              targetSettlementId:
                target_settlement_id,
              risk,
              note,
            }
          ),
      },
      {
        signal:
          controller.signal,
      }
    );

    console.log(
      "[WebMCP] lord tools registered"
    );

    return true;
  } catch (error) {
    controller.abort();
    registrationController =
      null;

    throw error;
  }
}

export function unregisterLordWebMCPTools(): void {
  if (
    !registrationController
  ) {
    return;
  }

  registrationController.abort();
  registrationController =
    null;

  console.log(
    "[WebMCP] lord tools unregistered"
  );
}
