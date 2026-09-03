import {
  executeLlmPlayerAction,
} from "@/lib/actors/tool-executor";

import {
  inspectPlayerCampaignStatus,
} from "@/lib/session/campaign-observation";

import {
  conveneCouncilForAudienceRequest,
  inspectAudienceRequests,
  presentAudienceRequest,
  respondToAudienceRequest,
} from "@/lib/politics/audience";

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

import type {
  LlmActionExecutionResult,
  LlmPlayerAction,
  LlmPlayerToolName,
} from "@/types/actors";

const MANAGEMENT_TOOLS:
  ReadonlySet<LlmPlayerToolName> =
  new Set([
    "split_army",
    "merge_armies",
    "support_army",
    "stop_army_support",
    "assign_commander",
    "fortify_settlement",
    "develop_settlement",
    "raid_settlement",
    "capture_settlement",
    "inspect_campaign_status",
    "inspect_audience_requests",
    "convene_council",
    "respond_audience_request",
  ]);

function stringArg(
  action:
    LlmPlayerAction,
  key:
    string
): string | undefined {
  const value =
    action.args[
      key
    ];

  return typeof value ===
    "string"
    ? value
    : undefined;
}

function resultOk(
  result:
    unknown
): boolean {
  return !(
    typeof result ===
      "object" &&
    result !==
      null &&
    "ok" in result &&
    (
      result as {
        ok?:
          unknown;
      }
    ).ok ===
      false
  );
}

function invalidArgs(
  tool:
    LlmPlayerToolName,
  message:
    string
) {
  return {
    ok:
      false as const,
    error:
      "INVALID_TOOL_ARGUMENTS",
    tool,
    message,
  };
}

export async function executeLlmPlayerActionWithManagement(
  sessionId:
    string,
  playerId:
    string,
  action:
    LlmPlayerAction
): Promise<LlmActionExecutionResult> {
  if (
    !MANAGEMENT_TOOLS.has(
      action.tool
    )
  ) {
    return executeLlmPlayerAction(
      sessionId,
      playerId,
      action
    );
  }

  let result:
    unknown;

  switch (
    action.tool
  ) {
    case "inspect_campaign_status":
      result =
        inspectPlayerCampaignStatus(
          sessionId,
          playerId
        );
      break;

    case "inspect_audience_requests":
      result =
        inspectAudienceRequests(
          sessionId,
          playerId
        );
      break;

    case "convene_council": {
      const requestId =
        stringArg(
          action,
          "request_id"
        );

      if (!requestId) {
        result =
          invalidArgs(
            action.tool,
            "request_id required"
          );
        break;
      }

      const presented =
        presentAudienceRequest(
          sessionId,
          playerId,
          requestId
        );

      result =
        presented.ok ===
          false &&
        presented.error !==
          "AUDIENCE_REQUEST_NOT_PRESENTABLE"
          ? presented
          : conveneCouncilForAudienceRequest(
              sessionId,
              playerId,
              requestId
            );
      break;
    }

    case "respond_audience_request": {
      const requestId =
        stringArg(
          action,
          "request_id"
        );

      const response =
        stringArg(
          action,
          "response"
        ) as
          | "ACCEPT"
          | "REFUSE"
          | "DEFER"
          | undefined;

      if (
        !requestId ||
        !response
      ) {
        result =
          invalidArgs(
            action.tool,
            "request_id and response required"
          );
        break;
      }

      const presented =
        presentAudienceRequest(
          sessionId,
          playerId,
          requestId
        );

      result =
        presented.ok ===
          false &&
        presented.error !==
          "AUDIENCE_REQUEST_NOT_PRESENTABLE"
          ? presented
          : respondToAudienceRequest(
              sessionId,
              playerId,
              requestId,
              response
            );
      break;
    }

    case "split_army": {
      const armyId =
        stringArg(
          action,
          "army_id"
        );

      const unitIdsCsv =
        stringArg(
          action,
          "unit_ids_csv"
        );

      const unitIds =
        unitIdsCsv
          ?.split(",")
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

      result =
        armyId &&
        unitIds &&
        unitIds.length >
          0
          ? splitPlayerArmy(
              sessionId,
              playerId,
              armyId,
              unitIds
            )
          : invalidArgs(
              action.tool,
              "army_id and unit_ids_csv required"
            );
      break;
    }

    case "merge_armies": {
      const targetArmyId =
        stringArg(
          action,
          "target_army_id"
        );

      const sourceArmyId =
        stringArg(
          action,
          "source_army_id"
        );

      result =
        targetArmyId &&
        sourceArmyId
          ? mergePlayerArmies(
              sessionId,
              playerId,
              targetArmyId,
              sourceArmyId
            )
          : invalidArgs(
              action.tool,
              "target_army_id and source_army_id required"
            );
      break;
    }

    case "support_army": {
      const supporterArmyId =
        stringArg(
          action,
          "supporter_army_id"
        );

      const targetArmyId =
        stringArg(
          action,
          "target_army_id"
        );

      result =
        supporterArmyId &&
        targetArmyId
          ? supportPlayerArmy(
              sessionId,
              playerId,
              supporterArmyId,
              targetArmyId
            )
          : invalidArgs(
              action.tool,
              "supporter_army_id and target_army_id required"
            );
      break;
    }

    case "stop_army_support": {
      const armyId =
        stringArg(
          action,
          "army_id"
        );

      result =
        armyId
          ? stopPlayerArmySupport(
              sessionId,
              playerId,
              armyId
            )
          : invalidArgs(
              action.tool,
              "army_id required"
            );
      break;
    }

    case "assign_commander": {
      const armyId =
        stringArg(
          action,
          "army_id"
        );

      const characterId =
        stringArg(
          action,
          "character_id"
        );

      result =
        armyId &&
        characterId
          ? assignPlayerArmyCommander(
              sessionId,
              playerId,
              armyId,
              characterId
            )
          : invalidArgs(
              action.tool,
              "army_id and character_id required"
            );
      break;
    }

    case "fortify_settlement": {
      const settlementId =
        stringArg(
          action,
          "settlement_id"
        );

      result =
        settlementId
          ? fortifyPlayerSettlement(
              sessionId,
              playerId,
              settlementId
            )
          : invalidArgs(
              action.tool,
              "settlement_id required"
            );
      break;
    }

    case "develop_settlement": {
      const settlementId =
        stringArg(
          action,
          "settlement_id"
        );

      const focus =
        stringArg(
          action,
          "focus"
        ) as
          | "food"
          | "gold"
          | "wood"
          | "stone"
          | "metal"
          | undefined;

      result =
        settlementId &&
        focus
          ? developPlayerSettlement(
              sessionId,
              playerId,
              settlementId,
              focus
            )
          : invalidArgs(
              action.tool,
              "settlement_id and focus required"
            );
      break;
    }

    case "raid_settlement": {
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
          ? raidPlayerSettlement(
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

    case "capture_settlement": {
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
          ? capturePlayerSettlement(
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

    default:
      result =
        invalidArgs(
          action.tool,
          "unsupported management tool"
        );
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
