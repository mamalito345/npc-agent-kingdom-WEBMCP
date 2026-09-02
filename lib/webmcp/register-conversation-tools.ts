import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  endConversation,
  inspectConversation,
  inspectPresentCharacters,
  talkToCharacter,
} from "@/lib/conversation/service";

const playerProperties = {
  session_id: { type: "string" },
  player_id: { type: "string" },
} as const;

const inspectPresentSchema = {
  type: "object",
  properties: {
    ...playerProperties,
  },
  required: ["session_id", "player_id"],
  additionalProperties: false,
} as const satisfies JsonSchemaForInference;

const talkSchema = {
  type: "object",
  properties: {
    ...playerProperties,
    character_id: { type: "string" },
    text: { type: "string" },
    conversation_id: { type: "string" },
  },
  required: [
    "session_id",
    "player_id",
    "character_id",
    "text",
  ],
  additionalProperties: false,
} as const satisfies JsonSchemaForInference;

const conversationSchema = {
  type: "object",
  properties: {
    ...playerProperties,
    conversation_id: { type: "string" },
  },
  required: [
    "session_id",
    "player_id",
    "conversation_id",
  ],
  additionalProperties: false,
} as const satisfies JsonSchemaForInference;

let registrationController: AbortController | null = null;

export async function registerConversationWebMCPTools():
  Promise<boolean> {
  if (!isWebMCPAvailable()) {
    return false;
  }

  const modelContext = document.modelContext;

  if (!modelContext) {
    return false;
  }

  if (registrationController) {
    return true;
  }

  const controller = new AbortController();
  registrationController = controller;

  try {
    await modelContext.registerTool(
      {
        name: "inspect_present_characters",
        description:
          "Inspect NPC characters who are physically/contextually present and can be spoken to now.",
        inputSchema: inspectPresentSchema,
        annotations: {
          readOnlyHint: true,
        },
        execute: async ({ session_id, player_id }) =>
          inspectPresentCharacters(session_id, player_id),
      },
      {
        signal: controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name: "talk_to_character",
        description:
          "Talk to a present NPC through the canonical conversation service. Distant characters require send_message/courier instead.",
        inputSchema: talkSchema,
        execute: async ({
          session_id,
          player_id,
          character_id,
          text,
          conversation_id,
        }) =>
          talkToCharacter(
            session_id,
            player_id,
            character_id,
            text,
            conversation_id
          ),
      },
      {
        signal: controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name: "inspect_conversation",
        description:
          "Inspect one conversation owned by this player.",
        inputSchema: conversationSchema,
        annotations: {
          readOnlyHint: true,
        },
        execute: async ({
          session_id,
          player_id,
          conversation_id,
        }) =>
          inspectConversation(
            session_id,
            player_id,
            conversation_id
          ),
      },
      {
        signal: controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name: "end_conversation",
        description:
          "Close a conversation, remove only its pause reason, and persist important subjective memories.",
        inputSchema: conversationSchema,
        execute: async ({
          session_id,
          player_id,
          conversation_id,
        }) =>
          endConversation(
            session_id,
            player_id,
            conversation_id
          ),
      },
      {
        signal: controller.signal,
      }
    );

    console.log("[WebMCP] conversation tools registered");
    return true;
  } catch (error) {
    controller.abort();
    registrationController = null;
    throw error;
  }
}

export function unregisterConversationWebMCPTools(): void {
  if (!registrationController) {
    return;
  }

  registrationController.abort();
  registrationController = null;
  console.log("[WebMCP] conversation tools unregistered");
}
