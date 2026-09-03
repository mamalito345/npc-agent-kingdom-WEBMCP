import { getIdentityBoundWebMcpModelContext } from "@/lib/webmcp/identity-guard";
import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  conveneCouncilForAudienceRequest,
  inspectAudienceRequests,
  presentAudienceRequest,
  respondToAudienceRequest,
} from "@/lib/politics/audience";

const baseProperties = {
  session_id: {
    type:
      "string",
  },

  player_id: {
    type:
      "string",
  },
} as const;

const inspectSchema = {
  type:
    "object",

  properties: {
    ...baseProperties,
  },

  required: [
    "session_id",
    "player_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const requestSchema = {
  type:
    "object",

  properties: {
    ...baseProperties,

    request_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "request_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const responseSchema = {
  type:
    "object",

  properties: {
    ...baseProperties,

    request_id: {
      type:
        "string",
    },

    response: {
      type:
        "string",

      enum: [
        "ACCEPT",
        "REFUSE",
        "DEFER",
      ],
    },
  },

  required: [
    "session_id",
    "player_id",
    "request_id",
    "response",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

let registrationController:
  AbortController |
  null =
  null;

export async function registerAudienceWebMCPTools():
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
          "inspect_audience_requests",

        description:
          "Inspect this ruler's canonical audience petitions and any recorded council advice.",

        inputSchema:
          inspectSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            inspectAudienceRequests(
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
          "convene_council",

        description:
          "Present an audience petition if needed, then ask the realm's major lords for deterministic advisory support/oppose/abstain guidance.",

        inputSchema:
          requestSchema,

        execute:
          async ({
            session_id,
            player_id,
            request_id,
          }) => {
            const presented =
              presentAudienceRequest(
                session_id,
                player_id,
                request_id
              );

            if (
              presented.ok ===
                false &&
              presented.error !==
                "AUDIENCE_REQUEST_NOT_PRESENTABLE"
            ) {
              return presented;
            }

            return conveneCouncilForAudienceRequest(
              session_id,
              player_id,
              request_id
            );
          },
      },

      {
        signal:
          controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name:
          "respond_audience_request",

        description:
          "Accept, refuse, or defer a presented audience petition. The response immediately applies its canonical political/economic consequence.",

        inputSchema:
          responseSchema,

        execute:
          async ({
            session_id,
            player_id,
            request_id,
            response,
          }) => {
            const presented =
              presentAudienceRequest(
                session_id,
                player_id,
                request_id
              );

            if (
              presented.ok ===
                false &&
              presented.error !==
                "AUDIENCE_REQUEST_NOT_PRESENTABLE"
            ) {
              return presented;
            }

            return respondToAudienceRequest(
              session_id,
              player_id,
              request_id,
              response
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
    registrationController =
      null;

    throw error;
  }
}
