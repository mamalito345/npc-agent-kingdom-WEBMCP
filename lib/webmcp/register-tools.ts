import type { JsonSchemaForInference } from "@mcp-b/webmcp-types";

import { travelTo } from "@/lib/world/actions";
import {
  getPlayerVisibleWorld,
  inspectCharacter,
  inspectLocation,
} from "@/lib/world/state";
import { isWebMCPAvailable } from "@/lib/webmcp/support";

const emptyInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JsonSchemaForInference;

const locationInputSchema = {
  type: "object",
  properties: {
    location_id: {
      type: "string",
    },
  },
  required: ["location_id"],
  additionalProperties: false,
} as const satisfies JsonSchemaForInference;

const characterInputSchema = {
  type: "object",
  properties: {
    character_id: {
      type: "string",
    },
  },
  required: ["character_id"],
  additionalProperties: false,
} as const satisfies JsonSchemaForInference;

let registrationController: AbortController | null = null;

export async function registerWebMCPTools(): Promise<boolean> {
  if (!isWebMCPAvailable()) {
    console.log("[WebMCP] unavailable");
    return false;
  }

  const modelContext = document.modelContext;

  console.log("[WebMCP] modelContext:", modelContext);

  if (!modelContext) {
    return false;
  }

  if (registrationController) {
    console.log("[WebMCP] already registered");
    return true;
  }

  const controller = new AbortController();
  registrationController = controller;

  try {
    await modelContext.registerTool(
      {
        name: "inspect_world",
        description:
          "Inspect the political world and locations currently available to the player.",
        inputSchema: emptyInputSchema,
        annotations: {
          readOnlyHint: true,
        },
        execute: async () => {
          return getPlayerVisibleWorld();
        },
      },
      {
        signal: controller.signal,
      }
    );

    console.log("[WebMCP] registered inspect_world");

    await modelContext.registerTool(
      {
        name: "inspect_location",
        description:
          "Inspect a location in the kingdom world using its location ID.",
        inputSchema: locationInputSchema,
        annotations: {
          readOnlyHint: true,
        },
        execute: async ({ location_id }) => {
          return inspectLocation(location_id);
        },
      },
      {
        signal: controller.signal,
      }
    );

    console.log("[WebMCP] registered inspect_location");

    await modelContext.registerTool(
      {
        name: "inspect_character",
        description:
          "Inspect the public information of a character using its character ID.",
        inputSchema: characterInputSchema,
        annotations: {
          readOnlyHint: true,
        },
        execute: async ({ character_id }) => {
          return inspectCharacter(character_id);
        },
      },
      {
        signal: controller.signal,
      }
    );

    console.log("[WebMCP] registered inspect_character");

    await modelContext.registerTool(
      {
        name: "travel_to",
        description:
          "Travel the player to a location using its location ID.",
        inputSchema: locationInputSchema,
        execute: async ({ location_id }) => {
          return travelTo(location_id);
        },
      },
      {
        signal: controller.signal,
      }
    );

    console.log("[WebMCP] registered travel_to");

    return true;
  } catch (error) {
    if (
      controller.signal.aborted &&
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      return false;
    }

    registrationController = null;
    throw error;
  }
}

export function unregisterWebMCPTools(): void {
  const controller = registrationController;

  registrationController = null;

  if (!controller || controller.signal.aborted) {
    return;
  }

  controller.abort();
}