import { getIdentityBoundWebMcpModelContext } from "@/lib/webmcp/identity-guard";
import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  validatePlayerAccess,
} from "@/lib/session/access";

import {
  getPlayerObservation,
  getPlayerKnownWorld,
  getPlayerKnownEnemyForces,
  getPlayerMessages,
  getPlayerBattlesView,
  getPlayerSettlementsView,
  getPlayerEconomyView,
} from "@/lib/session/observation";

import {
  getPlayerOrders,
} from "@/lib/session/orders";

import {
  issuePlayerArmyMove,
  issuePlayerInterception,
  cancelPlayerOrder,
  changeQueuedPlayerArmyOrder,
  setPlayerBattleTactic,
  submitPlayerBattleCrisisOrder,
  recruitPlayerUnits,
  startPlayerSiege,
  sendPlayerMessage,
  sendPlayerEnvoy,
  passPlayerCommandWindow,
} from "@/lib/session/player-actions";

import type {
  BattleOrderType,
  BattleTactic,
  UnitType,
} from "@/types/military";

//
// ============================================================
// BASE SCHEMAS
// ============================================================
//

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

const playerSchema = {
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
} as const satisfies JsonSchemaForInference;

const moveArmySchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    army_id: {
      type:
        "string",
    },

    destination_node_id: {
      type:
        "string",
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

const interceptSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    army_id: {
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
    "army_id",
    "target_army_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const orderIdSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    order_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "order_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const changeOrderSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    order_id: {
      type:
        "string",
    },

    destination_node_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "order_id",
    "destination_node_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const battleTacticSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    battle_id: {
      type:
        "string",
    },

    army_id: {
      type:
        "string",
    },

    tactic: {
      type:
        "string",

      enum: [
        "hold_ground",
        "aggressive_push",
        "shield_wall",
        "cavalry_flank",
        "counterattack",
        "seize_high_ground",
        "orderly_retreat",
        "desperate_assault",
      ],
    },
  },

  required: [
    "session_id",
    "player_id",
    "battle_id",
    "army_id",
    "tactic",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const battleOrderSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    battle_id: {
      type:
        "string",
    },

    army_id: {
      type:
        "string",
    },

    order: {
      type:
        "string",

      enum: [
        "hold_position",
        "commit_reserve",
        "press_attack",
        "order_retreat",
      ],
    },
  },

  required: [
    "session_id",
    "player_id",
    "battle_id",
    "army_id",
    "order",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const recruitSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    settlement_id: {
      type:
        "string",
    },

    unit_type: {
      type:
        "string",

      enum: [
        "infantry",
        "cavalry",
        "siege",
        "ship",
      ],
    },

    blocks: {
      type:
        "number",
    },
  },

  required: [
    "session_id",
    "player_id",
    "settlement_id",
    "unit_type",
    "blocks",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const siegeSchema = {
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

const messageSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    recipient_character_id: {
      type:
        "string",
    },

    content: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "recipient_character_id",
    "content",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const envoySchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    recipient_character_id: {
      type:
        "string",
    },

    proposal: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "recipient_character_id",
    "proposal",
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
// REGISTER
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
    //
    // ========================================================
    // PLAYER STATE
    // ========================================================
    //

    await modelContext.registerTool(
      {
        name:
          "inspect_player_state",

        description:
          "Inspect only this player's canonical own state, command window, armies, orders and delivered knowledge.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) => {
            const access =
              validatePlayerAccess(
                session_id,
                player_id
              );

            if (
              access.ok ===
              false
            ) {
              return access;
            }

            return (
              getPlayerObservation(
                player_id
              ) ?? {
                ok:
                  false,

                error:
                  "PLAYER_NOT_FOUND",
              }
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
          "inspect_known_world",

        description:
          "Inspect world facts that have actually been delivered to this player. Does not expose omniscient canonical enemy state.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            getPlayerKnownWorld(
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
          "inspect_armies",

        description:
          "Inspect this player's own armies and their exact canonical positions.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) => {
            const access =
              validatePlayerAccess(
                session_id,
                player_id
              );

            if (
              access.ok ===
              false
            ) {
              return access;
            }

            const observation =
              getPlayerObservation(
                player_id
              );

            return {
              ok:
                true,

              armies:
                observation
                  ?.ownArmies ??
                [],
            };
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
          "inspect_known_enemy_forces",

        description:
          "Inspect only enemy force information actually known to this player through observation, scouts, couriers or intelligence.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            getPlayerKnownEnemyForces(
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
          "inspect_messages",

        description:
          "Inspect this player's sent messages and incoming messages that have physically arrived.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            getPlayerMessages(
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
          "inspect_orders",

        description:
          "Inspect this player's strategic order queue and lifecycle.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) => {
            const access =
              validatePlayerAccess(
                session_id,
                player_id
              );

            if (
              access.ok ===
              false
            ) {
              return access;
            }

            return {
              ok:
                true,

              orders:
                getPlayerOrders(
                  player_id
                ),
            };
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
          "inspect_battles",

        description:
          "Inspect exact battles involving this player's armies plus remotely known battle reports.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            getPlayerBattlesView(
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
          "inspect_settlements",

        description:
          "Inspect exact friendly-controlled settlements plus foreign settlements known through the intelligence layer.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            getPlayerSettlementsView(
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
          "inspect_economy",

        description:
          "Inspect the player's own kingdom economy without exposing foreign canonical treasuries.",

        inputSchema:
          playerSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            getPlayerEconomyView(
              session_id,
              player_id
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // ========================================================
    // STRATEGIC ORDERS
    // ========================================================
    //

    await modelContext.registerTool(
      {
        name:
          "issue_army_move",

        description:
          "Queue a canonical movement order for an army controlled by this player.",

        inputSchema:
          moveArmySchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
            destination_node_id,
          }) =>
            issuePlayerArmyMove(
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

    await modelContext.registerTool(
      {
        name:
          "issue_intercept",

        description:
          "Queue an interception order for one of this player's armies.",

        inputSchema:
          interceptSchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
            target_army_id,
          }) =>
            issuePlayerInterception(
              session_id,
              player_id,
              army_id,
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
          "cancel_order",

        description:
          "Cancel one of this player's strategic orders. Executing movement halts at its current physical position.",

        inputSchema:
          orderIdSchema,

        execute:
          async ({
            session_id,
            player_id,
            order_id,
          }) =>
            cancelPlayerOrder(
              session_id,
              player_id,
              order_id
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
          "change_order",

        description:
          "Replace a queued army movement order with another destination. Executing mid-road rerouting is intentionally not fabricated.",

        inputSchema:
          changeOrderSchema,

        execute:
          async ({
            session_id,
            player_id,
            order_id,
            destination_node_id,
          }) =>
            changeQueuedPlayerArmyOrder(
              session_id,
              player_id,
              order_id,
              destination_node_id
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // ========================================================
    // BATTLE
    // ========================================================
    //

    await modelContext.registerTool(
      {
        name:
          "set_battle_tactic",

        description:
          "Set the normal hourly tactic for one of this player's armies in an active battle.",

        inputSchema:
          battleTacticSchema,

        execute:
          async ({
            session_id,
            player_id,
            battle_id,
            army_id,
            tactic,
          }) =>
            setPlayerBattleTactic(
              session_id,
              player_id,
              battle_id,
              army_id,
              tactic as
                BattleTactic
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
          "submit_battle_crisis_order",

        description:
          "Submit an available crisis decision for one of this player's armies when the battle requests a decision.",

        inputSchema:
          battleOrderSchema,

        execute:
          async ({
            session_id,
            player_id,
            battle_id,
            army_id,
            order,
          }) =>
            submitPlayerBattleCrisisOrder(
              session_id,
              player_id,
              battle_id,
              army_id,
              order as
                BattleOrderType
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // ========================================================
    // ECONOMY / SIEGE
    // ========================================================
    //

    await modelContext.registerTool(
      {
        name:
          "recruit_units",

        description:
          "Recruit units as this player's canonical character using the normal settlement authorization and economy rules.",

        inputSchema:
          recruitSchema,

        execute:
          async ({
            session_id,
            player_id,
            settlement_id,
            unit_type,
            blocks,
          }) =>
            recruitPlayerUnits(
              session_id,
              player_id,
              settlement_id,
              unit_type as
                UnitType,
              blocks
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
          "start_siege",

        description:
          "Start a canonical siege using an army controlled by this player.",

        inputSchema:
          siegeSchema,

        execute:
          async ({
            session_id,
            player_id,
            army_id,
            settlement_id,
          }) =>
            startPlayerSiege(
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

    //
    // ========================================================
    // COMMUNICATION
    // ========================================================
    //

    await modelContext.registerTool(
      {
        name:
          "send_message",

        description:
          "Send a physical courier message from this player's character to another settled character.",

        inputSchema:
          messageSchema,

        execute:
          async ({
            session_id,
            player_id,
            recipient_character_id,
            content,
          }) =>
            sendPlayerMessage(
              session_id,
              player_id,
              recipient_character_id,
              content
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
          "send_envoy",

        description:
          "Send a diplomatic proposal by physical courier. NPC interpretation is handled by the World Director layer.",

        inputSchema:
          envoySchema,

        execute:
          async ({
            session_id,
            player_id,
            recipient_character_id,
            proposal,
          }) =>
            sendPlayerEnvoy(
              session_id,
              player_id,
              recipient_character_id,
              proposal
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    //
    // ========================================================
    // COMMAND CYCLE
    // ========================================================
    //

    await modelContext.registerTool(
      {
        name:
          "pass_command_window",

        description:
          "Finish issuing commands for this player's current command window. This does not advance one hour; execution begins only after all required players pass.",

        inputSchema:
          playerSchema,

        execute:
          async ({
            session_id,
            player_id,
          }) =>
            passPlayerCommandWindow(
              session_id,
              player_id
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

    console.log(
      "[WebMCP] player-scoped tools registered"
    );

    return true;
  } catch (error) {
    controller.abort();

    registrationController =
      null;

    throw error;
  }
}

export function unregisterWebMCPTools():
  void {
  if (
    !registrationController
  ) {
    return;
  }

  registrationController.abort();

  registrationController =
    null;

  console.log(
    "[WebMCP] tools unregistered"
  );
}