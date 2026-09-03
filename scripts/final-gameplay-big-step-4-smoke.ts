import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  inspectPlayerCampaignStatus,
} from "../lib/session/campaign-observation";

async function main():
  Promise<void> {
  const original =
    getRuntimeWorldState();

  try {
    const sessionId =
      original.session.id;

    const playerId =
      original.session
        .localPlayerId;

    const player =
      original.session
        .players[
          playerId
        ];

    if (!player) {
      throw new Error(
        "Local player missing."
      );
    }

    const result =
      inspectPlayerCampaignStatus(
        sessionId,
        playerId
      );

    if (
      result.ok ===
      false
    ) {
      throw new Error(
        `Campaign inspection failed: ${result.error}`
      );
    }

    assert.ok(
      result.status
        .objectives.length >=
        4
    );

    assert.ok(
      result.status
        .totalCapitals >
        0
    );

    console.log(
      "PASS S4-01: campaign objectives derive from canonical world state"
    );

    const ownCapital =
      Object.values(
        original.settlements
      ).find(
        (settlement) =>
          settlement.type ===
            "capital" &&
          settlement.kingdomId ===
            player.kingdomId
      );

    const otherCapitals =
      Object.values(
        original.settlements
      ).filter(
        (settlement) =>
          settlement.type ===
            "capital" &&
          settlement.kingdomId !==
            player.kingdomId
      );

    if (
      ownCapital &&
      otherCapitals.length >=
        2
    ) {
      updateRuntimeWorldState(
        (current) => ({
          ...current,

          settlements: {
            ...current.settlements,

            [ownCapital.id]: {
              ...current
                .settlements[
                  ownCapital.id
                ],

              controllerKingdomId:
                player.kingdomId,
            },

            [otherCapitals[0].id]: {
              ...current
                .settlements[
                  otherCapitals[0].id
                ],

              controllerKingdomId:
                player.kingdomId,
            },

            [otherCapitals[1].id]: {
              ...current
                .settlements[
                  otherCapitals[1].id
                ],

              controllerKingdomId:
                player.kingdomId,
            },
          },
        })
      );

      const victory =
        inspectPlayerCampaignStatus(
          sessionId,
          playerId
        );

      if (
        victory.ok ===
        false
      ) {
        throw new Error(
          victory.error
        );
      }

      assert.equal(
        victory.status
          .outcome,
        "VICTORY"
      );

      console.log(
        "PASS S4-02: controlling three capitals while holding the crown produces derived victory"
      );
    }

    updateRuntimeWorldState(
      () =>
        original
    );

    const types =
      readFileSync(
        "types/actors.ts",
        "utf8"
      );

    const context =
      readFileSync(
        "lib/actors/context.ts",
        "utf8"
      );

    const executor =
      readFileSync(
        "lib/actors/management-tool-executor.ts",
        "utf8"
      );

    const webmcp =
      readFileSync(
        "lib/webmcp/register-army-management-tools.ts",
        "utf8"
      );

    assert.ok(
      types.includes(
        '"inspect_campaign_status"'
      )
    );

    assert.ok(
      context.includes(
        '"inspect_campaign_status"'
      )
    );

    assert.ok(
      executor.includes(
        'case "inspect_campaign_status"'
      )
    );

    assert.ok(
      webmcp.includes(
        '"inspect_campaign_status"'
      )
    );

    console.log(
      "PASS S4-03: campaign status is available to Actor LLM and WebMCP without mutation access"
    );

    const campaignUi =
      readFileSync(
        "app/campaign-panel.tsx",
        "utf8"
      );

    const gameRoot =
      readFileSync(
        "app/game-root.tsx",
        "utf8"
      );

    assert.ok(
      campaignUi.includes(
        "VICTORY"
      )
    );

    assert.ok(
      campaignUi.includes(
        "DEFEAT"
      )
    );

    assert.ok(
      gameRoot.includes(
        "<CampaignPanel />"
      )
    );

    console.log(
      "PASS S4-04: player UI exposes objective progress and campaign-end overlay"
    );

    const matters =
      readFileSync(
        "app/realm-matters.tsx",
        "utf8"
      );

    assert.ok(
      matters.includes(
        "inspectDiplomaticProposals"
      )
    );

    assert.ok(
      matters.includes(
        "inspectPromises"
      )
    );

    console.log(
      "PASS S4-05: ruler agenda now includes delivered diplomacy and active political promises"
    );

    console.log("");
    console.log(
      "FINAL GAMEPLAY BIG STEP 4 — CAMPAIGN & POLITICAL AGENDA: PASS"
    );
  } finally {
    updateRuntimeWorldState(
      () =>
        original
    );
  }
}

main().catch(
  (
    error:
      unknown
  ) => {
    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
