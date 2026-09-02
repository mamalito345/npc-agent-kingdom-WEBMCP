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
  startBattle,
} from "@/lib/military/battle-state";

import {
  submitBattleOrder,
} from "@/lib/military/battle-orders";

import {
  startSiege,
  liftSiege,
} from "@/lib/military/siege";

import {
  inspectActiveBattles,
  inspectActiveSieges,
  inspectBattle,
  inspectKingdomEconomy,
  inspectRoad,
  inspectSiege,
  inspectWars,
} from "@/lib/military/operational-inspection";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";
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

const battleInputSchema = {
  type: "object",

  properties: {
    battle_id: {
      type: "string",
    },
  },

  required: [
    "battle_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const siegeInputSchema = {
  type: "object",

  properties: {
    siege_id: {
      type: "string",
    },
  },

  required: [
    "siege_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const battleOrderInputSchema = {
  type: "object",

  properties: {
    battle_id: {
      type: "string",
    },

    army_id: {
      type: "string",
    },

    order: {
      type: "string",

      enum: [
        "hold_position",
        "commit_reserve",
        "press_attack",
        "order_retreat",
      ],
    },
  },

  required: [
    "battle_id",
    "army_id",
    "order",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const kingdomInputSchema = {
  type: "object",

  properties: {
    kingdom_id: {
      type: "string",
    },
  },

  required: [
    "kingdom_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const roadInputSchema = {
  type: "object",

  properties: {
    edge_id: {
      type: "string",
    },
  },

  required: [
    "edge_id",
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
          "start_battle",

        description:
          "Start a persistent canonical battle between hostile armies at the same node. The battle then progresses through simulation time and may request player battle orders.",

        inputSchema:
          fightInputSchema,

        execute:
          async ({
            attacker_army_id,
            defender_army_id,
            contact_id,
          }) =>
            startBattle({
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
      "inspect_battles",

    description:
      "Inspect all currently active persistent battles and pending decision points.",

    inputSchema:
      emptyInputSchema,

    annotations: {
      readOnlyHint:
        true,
    },

    execute:
      async () =>
        inspectActiveBattles(),
  },

  {
    signal:
      controller.signal,
  }
);

    await modelContext.registerTool(
      {
        name:
          "inspect_battle",

        description:
          "Inspect one persistent battle including participants, phase, operational power, orders, history and final result.",

        inputSchema:
          battleInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            battle_id,
          }) =>
            inspectBattle(
              battle_id
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
          "submit_battle_order",

        description:
          "Submit the player's canonical order at a pending battle decision. Available orders are hold_position, commit_reserve, press_attack and order_retreat.",

        inputSchema:
          battleOrderInputSchema,

        execute:
          async ({
            battle_id,
            army_id,
            order,
          }) => {
            const world =
              getRuntimeWorldState();

            return submitBattleOrder({
              battleId:
                battle_id,

              armyId:
                army_id,

              actorType:
                "player",

              actorId:
                world.player
                  .characterId,

              order:
                order as
                  | "hold_position"
                  | "commit_reserve"
                  | "press_attack"
                  | "order_retreat",
            });
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
    await modelContext.registerTool(
      {
        name:
          "start_siege",

        description:
          "Begin a persistent siege against a fortified enemy settlement while an active war exists.",

        inputSchema:
          armySettlementInputSchema,

        execute:
          async ({
            army_id,
            settlement_id,
          }) =>
            startSiege({
              armyId:
                army_id,

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
          "inspect_sieges",

        description:
          "Inspect all currently active persistent sieges.",

        inputSchema:
          emptyInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async () =>
            inspectActiveSieges(),
      },

      {
        signal:
          controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name:
          "inspect_siege",

        description:
          "Inspect a siege including its phase, war linkage, attacker armies and fortification integrity.",

        inputSchema:
          siegeInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            siege_id,
          }) =>
            inspectSiege(
              siege_id
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
          "lift_siege",

        description:
          "Lift an active persistent siege and release its attacking armies.",

        inputSchema:
          siegeInputSchema,

        execute:
          async ({
            siege_id,
          }) =>
            liftSiege(
              siege_id
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
          "inspect_wars",

        description:
          "Inspect canonical wars and their participating realms.",

        inputSchema:
          emptyInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async () =>
            inspectWars(),
      },

      {
        signal:
          controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name:
          "inspect_strategic_economy",

        description:
          "Inspect a kingdom's treasury, military burden, trade disruption, supply horizon and mobilization pressure.",

        inputSchema:
          kingdomInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            kingdom_id,
          }) =>
            inspectKingdomEconomy(
              kingdom_id
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
          "inspect_road_security",

        description:
          "Inspect a map road's current SAFE, THREATENED, RAIDED or BLOCKED strategic security state and trade multiplier.",

        inputSchema:
          roadInputSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            edge_id,
          }) =>
            inspectRoad(
              edge_id
            ),
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