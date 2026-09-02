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

import {
  endConversation,
  inspectPresentCharacters,
  talkToCharacter,
} from "@/lib/conversation/service";

import {
  inspectKingdomLords,
  issueCharacterOrder,
} from "@/lib/lords/service";

import type {
  BattleOrderType,
  BattleTactic,
  UnitType,
} from "@/types/military";

import type {
  LordOrderType,
} from "@/types/lords";

import type {
  LlmActionExecutionResult,
  LlmPlayerAction,
} from "@/types/actors";

function stringArg(
  action: LlmPlayerAction,
  key: string
): string | undefined {
  const value =
    action.args[key];

  return typeof value ===
    "string"
    ? value
    : undefined;
}

function numberArg(
  action: LlmPlayerAction,
  key: string
): number | undefined {
  const value =
    action.args[key];

  return typeof value ===
    "number"
    ? value
    : undefined;
}

function resultOk(
  result: unknown
): boolean {
  if (
    typeof result ===
      "object" &&
    result !== null &&
    "ok" in result
  ) {
    return (
      result as {
        ok?: unknown;
      }
    ).ok !== false;
  }

  return true;
}

function invalidArgs(
  tool:
    LlmPlayerAction[
      "tool"
    ],
  message: string
) {
  return {
    ok: false as const,
    error:
      "INVALID_TOOL_ARGUMENTS",
    tool,
    message,
  };
}

export async function executeLlmPlayerAction(
  sessionId: string,
  playerId: string,
  action: LlmPlayerAction
): Promise<LlmActionExecutionResult> {
  let result: unknown;

  try {
    switch (
      action.tool
    ) {
      case "inspect_player_state":
        result =
          getPlayerObservation(
            playerId
          ) ?? {
            ok: false,
            error:
              "PLAYER_NOT_FOUND",
          };
        break;

      case "inspect_known_world":
        result =
          getPlayerKnownWorld(
            sessionId,
            playerId
          );
        break;

      case "inspect_armies": {
        const observation =
          getPlayerObservation(
            playerId
          );

        result = {
          ok:
            Boolean(
              observation
            ),
          armies:
            observation
              ?.ownArmies ??
            [],
        };
        break;
      }

      case "inspect_known_enemy_forces":
        result =
          getPlayerKnownEnemyForces(
            sessionId,
            playerId
          );
        break;

      case "inspect_messages":
        result =
          getPlayerMessages(
            sessionId,
            playerId
          );
        break;

      case "inspect_orders":
        result = {
          ok: true,
          orders:
            getPlayerOrders(
              playerId
            ),
        };
        break;

      case "inspect_battles":
        result =
          getPlayerBattlesView(
            sessionId,
            playerId
          );
        break;

      case "inspect_settlements":
        result =
          getPlayerSettlementsView(
            sessionId,
            playerId
          );
        break;

      case "inspect_economy":
        result =
          getPlayerEconomyView(
            sessionId,
            playerId
          );
        break;

      case "inspect_present_characters":
        result =
          inspectPresentCharacters(
            sessionId,
            playerId
          );
        break;

      case "inspect_kingdom_lords":
        result =
          inspectKingdomLords(
            sessionId,
            playerId
          );
        break;

      case "issue_character_order": {
        const lordCharacterId =
          stringArg(
            action,
            "lord_character_id"
          );

        const orderType =
          stringArg(
            action,
            "order_type"
          ) as
            | LordOrderType
            | undefined;

        result =
          lordCharacterId &&
          orderType
            ? await issueCharacterOrder(
                sessionId,
                playerId,
                lordCharacterId,
                {
                  type:
                    orderType,
                  targetNodeId:
                    stringArg(
                      action,
                      "target_node_id"
                    ),
                  targetSettlementId:
                    stringArg(
                      action,
                      "target_settlement_id"
                    ),
                  risk:
                    numberArg(
                      action,
                      "risk"
                    ),
                  note:
                    stringArg(
                      action,
                      "note"
                    ),
                }
              )
            : invalidArgs(
                action.tool,
                "lord_character_id and order_type required"
              );
        break;
      }

      case "issue_army_move": {
        const armyId =
          stringArg(
            action,
            "army_id"
          );
        const destinationNodeId =
          stringArg(
            action,
            "destination_node_id"
          );

        result =
          armyId &&
          destinationNodeId
            ? issuePlayerArmyMove(
                sessionId,
                playerId,
                armyId,
                destinationNodeId
              )
            : invalidArgs(
                action.tool,
                "army_id and destination_node_id required"
              );
        break;
      }

      case "issue_intercept": {
        const armyId =
          stringArg(
            action,
            "army_id"
          );
        const targetArmyId =
          stringArg(
            action,
            "target_army_id"
          );

        result =
          armyId &&
          targetArmyId
            ? issuePlayerInterception(
                sessionId,
                playerId,
                armyId,
                targetArmyId
              )
            : invalidArgs(
                action.tool,
                "army_id and target_army_id required"
              );
        break;
      }

      case "cancel_order": {
        const orderId =
          stringArg(
            action,
            "order_id"
          );

        result =
          orderId
            ? cancelPlayerOrder(
                sessionId,
                playerId,
                orderId
              )
            : invalidArgs(
                action.tool,
                "order_id required"
              );
        break;
      }

      case "change_order": {
        const orderId =
          stringArg(
            action,
            "order_id"
          );
        const destinationNodeId =
          stringArg(
            action,
            "destination_node_id"
          );

        result =
          orderId &&
          destinationNodeId
            ? changeQueuedPlayerArmyOrder(
                sessionId,
                playerId,
                orderId,
                destinationNodeId
              )
            : invalidArgs(
                action.tool,
                "order_id and destination_node_id required"
              );
        break;
      }

      case "set_battle_tactic": {
        const battleId =
          stringArg(
            action,
            "battle_id"
          );
        const armyId =
          stringArg(
            action,
            "army_id"
          );
        const tactic =
          stringArg(
            action,
            "tactic"
          ) as
            | BattleTactic
            | undefined;

        result =
          battleId &&
          armyId &&
          tactic
            ? setPlayerBattleTactic(
                sessionId,
                playerId,
                battleId,
                armyId,
                tactic
              )
            : invalidArgs(
                action.tool,
                "battle_id, army_id and tactic required"
              );
        break;
      }

      case "submit_battle_crisis_order": {
        const battleId =
          stringArg(
            action,
            "battle_id"
          );
        const armyId =
          stringArg(
            action,
            "army_id"
          );
        const order =
          stringArg(
            action,
            "order"
          ) as
            | BattleOrderType
            | undefined;

        result =
          battleId &&
          armyId &&
          order
            ? submitPlayerBattleCrisisOrder(
                sessionId,
                playerId,
                battleId,
                armyId,
                order
              )
            : invalidArgs(
                action.tool,
                "battle_id, army_id and order required"
              );
        break;
      }

      case "recruit_units": {
        const settlementId =
          stringArg(
            action,
            "settlement_id"
          );
        const unitType =
          stringArg(
            action,
            "unit_type"
          ) as
            | UnitType
            | undefined;
        const blocks =
          numberArg(
            action,
            "blocks"
          );

        result =
          settlementId &&
          unitType &&
          blocks !== undefined
            ? recruitPlayerUnits(
                sessionId,
                playerId,
                settlementId,
                unitType,
                blocks
              )
            : invalidArgs(
                action.tool,
                "settlement_id, unit_type and blocks required"
              );
        break;
      }

      case "start_siege": {
        const armyId =
          stringArg(
            action,
            "army_id"
          );
        const settlementId =
          stringArg(
            action,
            "settlement_id"
          );

        result =
          armyId &&
          settlementId
            ? startPlayerSiege(
                sessionId,
                playerId,
                armyId,
                settlementId
              )
            : invalidArgs(
                action.tool,
                "army_id and settlement_id required"
              );
        break;
      }

      case "send_message": {
        const recipientCharacterId =
          stringArg(
            action,
            "recipient_character_id"
          );
        const content =
          stringArg(
            action,
            "content"
          );

        result =
          recipientCharacterId &&
          content
            ? sendPlayerMessage(
                sessionId,
                playerId,
                recipientCharacterId,
                content
              )
            : invalidArgs(
                action.tool,
                "recipient_character_id and content required"
              );
        break;
      }

      case "send_envoy": {
        const recipientCharacterId =
          stringArg(
            action,
            "recipient_character_id"
          );
        const proposal =
          stringArg(
            action,
            "proposal"
          );

        result =
          recipientCharacterId &&
          proposal
            ? sendPlayerEnvoy(
                sessionId,
                playerId,
                recipientCharacterId,
                proposal
              )
            : invalidArgs(
                action.tool,
                "recipient_character_id and proposal required"
              );
        break;
      }

      case "talk_to_character": {
        const characterId =
          stringArg(
            action,
            "character_id"
          );
        const text =
          stringArg(
            action,
            "text"
          );
        const conversationId =
          stringArg(
            action,
            "conversation_id"
          );

        result =
          characterId &&
          text
            ? await talkToCharacter(
                sessionId,
                playerId,
                characterId,
                text,
                conversationId
              )
            : invalidArgs(
                action.tool,
                "character_id and text required"
              );
        break;
      }

      case "end_conversation": {
        const conversationId =
          stringArg(
            action,
            "conversation_id"
          );

        result =
          conversationId
            ? endConversation(
                sessionId,
                playerId,
                conversationId
              )
            : invalidArgs(
                action.tool,
                "conversation_id required"
              );
        break;
      }

      case "pass_command_window":
        result =
          passPlayerCommandWindow(
            sessionId,
            playerId
          );
        break;
    }
  } catch (error) {
    result = {
      ok: false,
      error:
        "TOOL_EXECUTION_EXCEPTION",
      message:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }

  return {
    tool:
      action.tool,
    ok:
      resultOk(
        result
      ),
    result,
  };
}
