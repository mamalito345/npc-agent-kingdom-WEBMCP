import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  travelTo,
} from "@/lib/world/actions";

import {
  fortify,
} from "@/lib/military/fortification";

import {
  repairFortification,
} from "@/lib/military/fortification-repair";

import {
  getPlayerVisibleWorld,
  inspectCharacter,
  inspectLocation,
} from "@/lib/world/state";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  inspectArmy,
  inspectSettlementMilitary,
  inspectSettlementResources,
} from "@/lib/military/inspection";

import {
  recruitUnits,
} from "@/lib/military/recruitment";

import {
  moveArmy,
} from "@/lib/military/army-movement";

import {
  supportArmy,
} from "@/lib/military/support";

import {
  fightArmies,
} from "@/lib/military/battle";

import {
  retreatArmyImmediately,
} from "@/lib/military/retreat";

import {
  captureSettlement,
} from "@/lib/military/conquest";

import {
  raidSettlement,
} from "@/lib/military/raid";

import {
  sackSettlement,
} from "@/lib/military/sack";

//
// ============================================================
// WEBMCP INPUT SCHEMAS
// ============================================================
//

const emptyInputSchema = {
  type: "object",
  properties: {},
  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const locationInputSchema = {
  type: "object",

  properties: {
    location_id: {
      type: "string",
    },
  },

  required: [
    "location_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const characterInputSchema = {
  type: "object",

  properties: {
    character_id: {
      type: "string",
    },
  },

  required: [
    "character_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const armyInputSchema = {
  type: "object",

  properties: {
    army_id: {
      type: "string",
    },
  },

  required: [
    "army_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const resourcesInputSchema = {
  type: "object",

  properties: {
    settlement_id: {
      type: "string",
    },
  },

  required: [
    "settlement_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const recruitInputSchema = {
  type: "object",

  properties: {
    settlement_id: {
      type: "string",
    },

    unit_type: {
      type: "string",

      enum: [
        "infantry",
        "cavalry",
        "siege",
        "ship",
      ],
    },

    blocks: {
      type: "number",
    },
  },

  required: [
    "settlement_id",
    "unit_type",
    "blocks",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const moveArmyInputSchema = {
  type: "object",

  properties: {
    army_id: {
      type: "string",
    },

    destination_node_id: {
      type: "string",
    },
  },

  required: [
    "army_id",
    "destination_node_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const supportArmyInputSchema = {
  type: "object",

  properties: {
    supporter_army_id: {
      type: "string",
    },

    target_army_id: {
      type: "string",
    },
  },

  required: [
    "supporter_army_id",
    "target_army_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const fightInputSchema = {
  type: "object",

  properties: {
    attacker_army_id: {
      type: "string",
    },

    defender_army_id: {
      type: "string",
    },

    contact_id: {
      type: "string",
    },
  },

  required: [
    "attacker_army_id",
    "defender_army_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const armySettlementInputSchema = {
  type: "object",

  properties: {
    army_id: {
      type: "string",
    },

    settlement_id: {
      type: "string",
    },
  },

  required: [
    "army_id",
    "settlement_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

//
// ============================================================
// REGISTRATION STATE
// ============================================================
//

let registrationController:
  AbortController |
  null =
  null;

//
// ============================================================
// REGISTER ALL TOOLS
// ============================================================
//

export async function registerWebMCPTools():
  Promise<boolean> {
  if (
    !isWebMCPAvailable()
  ) {
    console.log(
      "[WebMCP] unavailable"
    );

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
    //
    // WORLD
    //

    await modelContext.registerTool(
      {
        name:
          "inspect_world",

        description:
          "Inspect the political world and locations currently available to the player.",

        inputSchema:
          emptyInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async () =>
            getPlayerVisibleWorld(),
      },

      {
        signal:
          controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name:
          "inspect_location",

        description:
          "Inspect a location using its location ID.",

        inputSchema:
          locationInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            location_id,
          }) =>
            inspectLocation(
              location_id
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
          "inspect_character",

        description:
          "Inspect a character using its character ID.",

        inputSchema:
          characterInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            character_id,
          }) =>
            inspectCharacter(
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
          "travel_to",

        description:
          "Travel the player through the canonical world simulation.",

        inputSchema:
          locationInputSchema,

        execute:
          async ({
            location_id,
          }) =>
            travelTo(
              location_id
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // MILITARY INSPECTION
    //

    await modelContext.registerTool(
      {
        name:
          "inspect_army",

        description:
          "Inspect an army including units, position, movement, upkeep, supply and funding.",

        inputSchema:
          armyInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            army_id,
          }) =>
            inspectArmy(
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
          "inspect_resources",

        description:
          "Inspect total, reserved and available settlement resources.",

        inputSchema:
          resourcesInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            settlement_id,
          }) =>
            inspectSettlementResources(
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
          "inspect_settlement_military",

        description:
          "Inspect political ownership, military controller, occupation, garrison and fortification state.",

        inputSchema:
          resourcesInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            settlement_id,
          }) =>
            inspectSettlementMilitary(
              settlement_id
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // RECRUITMENT
    //

    await modelContext.registerTool(
      {
        name:
          "recruit_units",

        description:
          "Recruit military units through the canonical resource reservation and recruitment system.",

        inputSchema:
          recruitInputSchema,

        execute:
          async ({
            settlement_id,
            unit_type,
            blocks,
          }) =>
            recruitUnits({
              settlementId:
                settlement_id,

              unitType:
                unit_type as
                  | "infantry"
                  | "cavalry"
                  | "siege"
                  | "ship",

              blocks,
            }),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // ARMY OPERATIONS
    //

    await modelContext.registerTool(
      {
        name:
          "move_army",

        description:
          "Move an army using canonical map pathfinding and simulation movement.",

        inputSchema:
          moveArmyInputSchema,

        execute:
          async ({
            army_id,
            destination_node_id,
          }) =>
            moveArmy(
              army_id,
              destination_node_id
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
          "Order one friendly army to support another.",

        inputSchema:
          supportArmyInputSchema,

        execute:
          async ({
            supporter_army_id,
            target_army_id,
          }) =>
            supportArmy(
              supporter_army_id,
              target_army_id
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // COMBAT
    //

    await modelContext.registerTool(
      {
        name:
          "fight_armies",

        description:
          "Resolve deterministic canonical combat between two enemy armies at the same node.",

        inputSchema:
          fightInputSchema,

        execute:
          async ({
            attacker_army_id,
            defender_army_id,
            contact_id,
          }) =>
            fightArmies({
              attackerArmyId:
                attacker_army_id,

              defenderArmyId:
                defender_army_id,

              contactId:
                contact_id,
            }),
      },

      {
        signal:
          controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name:
          "retreat_army",

        description:
          "Retreat an army through the canonical deterministic retreat resolver.",

        inputSchema:
          armyInputSchema,

        execute:
          async ({
            army_id,
          }) =>
            retreatArmyImmediately(
              army_id
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // CONQUEST
    //

    await modelContext.registerTool(
      {
        name:
          "capture_settlement",

        description:
          "Establish military control over an enemy settlement after hostile defenders are removed. Political ownership remains unchanged.",

        inputSchema:
          armySettlementInputSchema,

        execute:
          async ({
            army_id,
            settlement_id,
          }) =>
            captureSettlement(
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
          "raid_settlement",

        description:
          "Begin a one-day raid against an enemy settlement. Completion is resolved by canonical simulation time.",

        inputSchema:
          armySettlementInputSchema,

        execute:
          async ({
            army_id,
            settlement_id,
          }) =>
            raidSettlement(
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
          "sack_settlement",

        description:
          "Sack an occupied settlement controlled by the acting army's kingdom.",

        inputSchema:
          armySettlementInputSchema,

        execute:
          async ({
            army_id,
            settlement_id,
          }) =>
            sackSettlement(
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
          "fortify",

        description:
          "Begin construction of the next fortification level at a controlled settlement. Resources are reserved immediately and construction completes through canonical simulation time.",

        inputSchema:
          resourcesInputSchema,

        execute:
          async ({
            settlement_id,
          }) =>
            fortify({
              settlementId:
              settlement_id,
          }),
      },

      {
        signal:
          controller.signal,
      }
    );
    await modelContext.registerTool(
      {
        name:
          "repair_fortification",

        description:
          "Repair damaged fortifications at a controlled settlement. Repair cost and duration scale with the percentage of fortification damage.",

        inputSchema:
          resourcesInputSchema,

        execute:
          async ({
            settlement_id,
          }) =>
            repairFortification({
              settlementId:
              settlement_id,
          }),
      },

      {
        signal:
          controller.signal,
      }
    );

    console.log(
      "[WebMCP] all tools registered"
    );

    return true;
  } catch (error) {
    if (
      controller.signal.aborted &&
      error instanceof
        DOMException &&
      error.name ===
        "AbortError"
    ) {
      return false;
    }

    registrationController =
      null;

    throw error;
  }
}

//
// ============================================================
// UNREGISTER
// ============================================================
//

export function unregisterWebMCPTools():
  void {
  const controller =
    registrationController;

  registrationController =
    null;

  if (
    !controller ||
    controller.signal
      .aborted
  ) {
    return;
  }

  controller.abort();
}