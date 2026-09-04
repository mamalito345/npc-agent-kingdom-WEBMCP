import {
  getIdentityBoundWebMcpModelContext,
} from "@/lib/webmcp/identity-guard";

import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  breakAgreement,
  createPromise,
  inspectAgreements,
  inspectDiplomaticProposals,
  inspectPromises,
  inspectRelationships,
  proposeAgreement,
  respondToAgreement,
  resolvePromise,
} from "@/lib/politics/service";

import type {
  AgreementType,
  PromiseStatus,
} from "@/types/politics";

const baseReadSchema = {
  type:
    "object",
  properties: {
    session_id: {
      type:
        "string",
    },
    player_id: {
      type:
        "string",
    },
  },
  required: [
    "session_id",
    "player_id",
  ],
  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const proposeSchema = {
  type:
    "object",
  properties: {
    session_id: {
      type:
        "string",
    },
    player_id: {
      type:
        "string",
    },
    agreement_type: {
      type:
        "string",
      enum: [
        "ALLIANCE",
        "NON_AGGRESSION",
        "MILITARY_ACCESS",
        "MILITARY_SUPPORT",
        "PEACE",
      ],
    },
    target_kingdom_id: {
      type:
        "string",
    },
    terms: {
      type:
        "string",
    },
    expires_at: {
      type:
        "number",
    },
    secret: {
      type:
        "boolean",
    },
  },
  required: [
    "session_id",
    "player_id",
    "agreement_type",
    "target_kingdom_id",
  ],
  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const respondSchema = {
  type:
    "object",
  properties: {
    session_id: {
      type:
        "string",
    },
    player_id: {
      type:
        "string",
    },
    agreement_id: {
      type:
        "string",
    },
    accept: {
      type:
        "boolean",
    },
  },
  required: [
    "session_id",
    "player_id",
    "agreement_id",
    "accept",
  ],
  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const breakAgreementSchema = {
  type:
    "object",
  properties: {
    session_id: {
      type:
        "string",
    },
    player_id: {
      type:
        "string",
    },
    agreement_id: {
      type:
        "string",
    },
  },
  required: [
    "session_id",
    "player_id",
    "agreement_id",
  ],
  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const createPromiseSchema = {
  type:
    "object",
  properties: {
    session_id: {
      type:
        "string",
    },
    player_id: {
      type:
        "string",
    },
    promisee_character_id: {
      type:
        "string",
    },
    summary: {
      type:
        "string",
    },
    target_id: {
      type:
        "string",
    },
  },
  required: [
    "session_id",
    "player_id",
    "promisee_character_id",
    "summary",
  ],
  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const resolvePromiseSchema = {
  type:
    "object",
  properties: {
    session_id: {
      type:
        "string",
    },
    player_id: {
      type:
        "string",
    },
    promise_id: {
      type:
        "string",
    },
    status: {
      type:
        "string",
      enum: [
        "FULFILLED",
        "BROKEN",
        "CANCELLED",
      ],
    },
  },
  required: [
    "session_id",
    "player_id",
    "promise_id",
    "status",
  ],
  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

let registrationController:
  AbortController |
  null =
  null;

export async function registerPoliticsWebMCPTools():
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

  const readTools = [
    {
      name:
        "inspect_relationships",
      description:
        "Inspect relationships involving your player character.",
      execute:
        inspectRelationships,
    },
    {
      name:
        "inspect_agreements",
      description:
        "Inspect agreements involving your kingdom, including military access and peace/truce agreements.",
      execute:
        inspectAgreements,
    },
    {
      name:
        "inspect_diplomatic_proposals",
      description:
        "Inspect delivered diplomatic proposals visible to your kingdom.",
      execute:
        inspectDiplomaticProposals,
    },
    {
      name:
        "inspect_promises",
      description:
        "Inspect explicit promises involving your player character.",
      execute:
        inspectPromises,
    },
  ] as const;

  try {
    for (
      const tool
      of readTools
    ) {
      await modelContext.registerTool(
        {
          name:
            tool.name,
          description:
            tool.description,
          inputSchema:
            baseReadSchema,
          annotations: {
            readOnlyHint:
              true,
          },
          execute:
            async ({
              session_id,
              player_id,
            }) =>
              tool.execute(
                session_id,
                player_id
              ),
        },
        {
          signal:
            controller.signal,
        }
      );
    }

    await modelContext.registerTool(
      {
        name:
          "propose_agreement",
        description:
          "Send an alliance, non-aggression, military-access, military-support, or peace proposal by physical diplomatic courier. PEACE acts as a truce; expires_at may define its duration.",
        inputSchema:
          proposeSchema,
        execute:
          async ({
            session_id,
            player_id,
            agreement_type,
            target_kingdom_id,
            terms,
            expires_at,
            secret,
          }) =>
            proposeAgreement(
              session_id,
              player_id,
              agreement_type as
                AgreementType,
              target_kingdom_id,
              {
                terms,
                expiresAt:
                  expires_at,
                secret,
              }
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
          "respond_to_agreement",
        description:
          "Accept or reject a delivered diplomatic proposal.",
        inputSchema:
          respondSchema,
        execute:
          async ({
            session_id,
            player_id,
            agreement_id,
            accept,
          }) =>
            respondToAgreement(
              session_id,
              player_id,
              agreement_id,
              accept
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
          "break_agreement",
        description:
          "Formally break an active agreement your kingdom is party to (alliance, non-aggression, military-access, military-support, or a peace truce). This has real consequences: every other party's kingdom takes a lasting relations penalty against yours.",
        inputSchema:
          breakAgreementSchema,
        execute:
          async ({
            session_id,
            player_id,
            agreement_id,
          }) =>
            breakAgreement(
              session_id,
              player_id,
              agreement_id
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
          "create_promise",
        description:
          "Create an explicit political promise.",
        inputSchema:
          createPromiseSchema,
        execute:
          async ({
            session_id,
            player_id,
            promisee_character_id,
            summary,
            target_id,
          }) =>
            createPromise(
              session_id,
              player_id,
              promisee_character_id,
              summary,
              target_id
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
          "resolve_promise",
        description:
          "Mark your explicit promise as fulfilled, broken, or cancelled.",
        inputSchema:
          resolvePromiseSchema,
        execute:
          async ({
            session_id,
            player_id,
            promise_id,
            status,
          }) =>
            resolvePromise(
              session_id,
              player_id,
              promise_id,
              status as Exclude<
                PromiseStatus,
                "ACTIVE"
              >
            ),
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

export function unregisterPoliticsWebMCPTools():
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
