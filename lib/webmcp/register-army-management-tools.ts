import { getIdentityBoundWebMcpModelContext } from "@/lib/webmcp/identity-guard";
import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  inspectPlayerCampaignStatus,
} from "@/lib/session/campaign-observation";

import {
  assignPlayerArmyCommander,
  capturePlayerSettlement,
  developPlayerSettlement,
  fortifyPlayerSettlement,
  mergePlayerArmies,
  raidPlayerSettlement,
  splitPlayerArmy,
  stopPlayerArmySupport,
  supportPlayerArmy,
} from "@/lib/session/management-player-actions";

const playerInputProperties = {
  session_id: {
    type:
      "string",
  },

  player_id: {
    type:
      "string",
  },
} as const;

const splitSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    army_id: {
      type:
        "string",
    },

    unit_ids: {
      type:
        "array",

      items: {
        type:
          "string",
      },

      minItems:
        1,
    },
  },

  required: [
    "session_id",
    "player_id",
    "army_id",
    "unit_ids",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const mergeSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    target_army_id: {
      type:
        "string",
    },

    source_army_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "target_army_id",
    "source_army_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const supportSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    supporter_army_id: {
      type:
        "string",
    },

    target_army_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "supporter_army_id",
    "target_army_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const armySchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    army_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "army_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const commanderSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    army_id: {
      type:
        "string",
    },

    character_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "army_id",
    "character_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const settlementSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    settlement_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "settlement_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;


const developSettlementSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    settlement_id: {
      type:
        "string",
    },

    focus: {
      type:
        "string",

      enum: [
        "food",
        "gold",
        "wood",
        "stone",
        "metal",
      ],
    },
  },

  required: [
    "session_id",
    "player_id",
    "settlement_id",
    "focus",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const settlementArmySchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    army_id: {
      type:
        "string",
    },

    settlement_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "army_id",
    "settlement_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

let registrationController:
  AbortController |
  null =
  null;

export async function registerArmyManagementWebMCPTools():
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
          "inspect_campaign_status",

        description:
          "Inspect this player's current canonical campaign objectives, capital-control progress and derived victory/defeat state.",

        inputSchema: {
          type:
            "object",

          properties: {
            ...playerInputProperties,
          },

          required: [
            "session_id",
            "player_id",
          ],

          additionalProperties:
            false,
        } as const satisfies JsonSchemaForInference,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            inspectPlayerCampaignStatus(
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
          "split_army",

        description:
          "Detach selected unit blocks into a new physical army at the same node. The source army must be stationary and outside battle.",

        inputSchema:
          splitSchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
            unit_ids,
          }) =>
            splitPlayerArmy(
              session_id,
              player_id,
              army_id,
              unit_ids
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
          "merge_armies",

        description:
          "Merge two controlled friendly armies that are physically at the same node and not moving or fighting.",

        inputSchema:
          mergeSchema,

        execute:
          async ({
            session_id,
            player_id,
            target_army_id,
            source_army_id,
          }) =>
            mergePlayerArmies(
              session_id,
              player_id,
              target_army_id,
              source_army_id
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
          "support_army",

        description:
          "Assign one stationary controlled army to support another controlled friendly army. Support is valid only from the same or directly adjacent strategic node.",

        inputSchema:
          supportSchema,

        execute:
          async ({
            session_id,
            player_id,
            supporter_army_id,
            target_army_id,
          }) =>
            supportPlayerArmy(
              session_id,
              player_id,
              supporter_army_id,
              target_army_id
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
          "stop_army_support",

        description:
          "Clear a controlled army's current support assignment.",

        inputSchema:
          armySchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
          }) =>
            stopPlayerArmySupport(
              session_id,
              player_id,
              army_id
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
          "assign_commander",

        description:
          "Assign the player's ruler as commander of a directly controlled stationary army when physically present at the same node. Independent lords cannot be silently reassigned.",

        inputSchema:
          commanderSchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
            character_id,
          }) =>
            assignPlayerArmyCommander(
              session_id,
              player_id,
              army_id,
              character_id
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
          "fortify_settlement",

        description:
          "Start the next canonical fortification upgrade at an owned settlement, consuming local resources and time.",

        inputSchema:
          settlementSchema,

        execute:
          async ({
            session_id,
            player_id,
            settlement_id,
          }) =>
            fortifyPlayerSettlement(
              session_id,
              player_id,
              settlement_id
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
          "develop_settlement",

        description:
          "Spend local settlement resources to permanently improve one chosen daily-production branch.",

        inputSchema:
          developSettlementSchema,

        execute:
          async ({
            session_id,
            player_id,
            settlement_id,
            focus,
          }) =>
            developPlayerSettlement(
              session_id,
              player_id,
              settlement_id,
              focus
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
          "raid_settlement",

        description:
          "Start a physical wartime raid with a directly controlled army already present at an enemy settlement.",

        inputSchema:
          settlementArmySchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
            settlement_id,
          }) =>
            raidPlayerSettlement(
              session_id,
              player_id,
              army_id,
              settlement_id
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
          "capture_settlement",

        description:
          "Occupy an enemy settlement with a directly controlled army physically present there. Active fortifications must already be breached.",

        inputSchema:
          settlementArmySchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
            settlement_id,
          }) =>
            capturePlayerSettlement(
              session_id,
              player_id,
              army_id,
              settlement_id
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
    registrationController =
      null;

    throw error;
  }
}
