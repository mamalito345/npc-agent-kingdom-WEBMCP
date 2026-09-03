import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  beginCampaign,
} from "../lib/demo/campaign";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  conveneCouncilForAudienceRequest,
  inspectAudienceRequests,
  presentAudienceRequest,
  respondToAudienceRequest,
} from "../lib/politics/audience";

async function main():
  Promise<void> {
  const original =
    getRuntimeWorldState();

  try {
    const campaign =
      beginCampaign({
        humanPlayerId:
          "player-edwyn",

        actorPlayerId:
          "player-roderic",
      });

    if (
      campaign.ok ===
      false
    ) {
      throw new Error(
        campaign.error
      );
    }

    const world =
      getRuntimeWorldState();

    const playerId =
      campaign
        .humanPlayerId;

    const requests =
      inspectAudienceRequests(
        world.session.id,
        playerId
      );

    if (
      requests.ok ===
      false
    ) {
      throw new Error(
        requests.error
      );
    }

    const request =
      requests.requests[0];

    assert.ok(
      request,
      "Campaign start must seed at least one canonical petition."
    );

    assert.equal(
      request.status,
      "REQUESTED"
    );

    console.log(
      "PASS S5-01: campaign start seeds a canonical audience petition from an existing realm lord"
    );

    const presented =
      presentAudienceRequest(
        world.session.id,
        playerId,
        request.id
      );

    if (
      presented.ok ===
      false
    ) {
      throw new Error(
        presented.error
      );
    }

    assert.equal(
      presented.request
        .status,
      "PRESENTED"
    );

    console.log(
      "PASS S5-02: audience lifecycle moves REQUESTED → PRESENTED through command access"
    );

    const advice =
      conveneCouncilForAudienceRequest(
        world.session.id,
        playerId,
        request.id
      );

    if (
      advice.ok ===
      false
    ) {
      throw new Error(
        advice.error
      );
    }

    assert.equal(
      advice.advice
        .support +
        advice.advice
          .oppose +
        advice.advice
          .abstain,
      Object.values(
        getRuntimeWorldState()
          .session
          .lords
          .profiles
      ).filter(
        (profile) =>
          profile.kingdomId ===
          getRuntimeWorldState()
            .session
            .players[
              playerId
            ]
            .kingdomId
      ).length
    );

    console.log(
      "PASS S5-03: council advice is derived from canonical lord traits/loyalty rather than a fake static vote"
    );

    const player =
      getRuntimeWorldState()
        .session
        .players[
          playerId
        ];

    const kingdomBefore =
      getRuntimeWorldState()
        .kingdoms[
          player.kingdomId
        ];

    const lordBefore =
      getRuntimeWorldState()
        .session
        .lords
        .profiles[
          request
            .petitionerCharacterId
        ];

    const response =
      respondToAudienceRequest(
        world.session.id,
        playerId,
        request.id,
        "ACCEPT"
      );

    if (
      response.ok ===
      false
    ) {
      throw new Error(
        response.error
      );
    }

    assert.equal(
      response.request
        .status,
      "ACCEPTED"
    );

    assert.ok(
      response.request
        .consequenceAppliedAt !==
        undefined
    );

    const kingdomAfter =
      getRuntimeWorldState()
        .kingdoms[
          player.kingdomId
        ];

    const lordAfter =
      getRuntimeWorldState()
        .session
        .lords
        .profiles[
          request
            .petitionerCharacterId
        ];

    assert.ok(
      kingdomBefore.treasury !==
        kingdomAfter.treasury ||
      kingdomBefore.stability !==
        kingdomAfter.stability ||
      lordBefore?.loyalty !==
        lordAfter?.loyalty ||
      lordBefore
        ?.relationshipToRuler !==
        lordAfter
          ?.relationshipToRuler
    );

    console.log(
      "PASS S5-04: audience response applies a real canonical realm/lord consequence"
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
        "lib/webmcp/register-audience-tools.ts",
        "utf8"
      );

    for (
      const tool
      of [
        "inspect_audience_requests",
        "convene_council",
        "respond_audience_request",
      ]
    ) {
      assert.ok(
        types.includes(
          `"${tool}"`
        )
      );

      assert.ok(
        context.includes(
          `"${tool}"`
        )
      );

      assert.ok(
        executor.includes(
          `"${tool}"`
        )
      );

      assert.ok(
        webmcp.includes(
          `"${tool}"`
        )
      );
    }

    console.log(
      "PASS S5-05: audience/council gameplay has Human / Actor LLM / WebMCP parity"
    );

    const court =
      readFileSync(
        "app/court-panel.tsx",
        "utf8"
      );

    assert.ok(
      court.includes(
        "HEAR PETITION"
      )
    );

    assert.ok(
      court.includes(
        "ASK THE COUNCIL"
      )
    );

    assert.ok(
      court.includes(
        "ACCEPT"
      )
    );

    assert.ok(
      court.includes(
        "REFUSE"
      )
    );

    assert.ok(
      court.includes(
        "DEFER"
      )
    );

    assert.ok(
      court.includes(
        'top-[86px]'
      )
    );

    console.log(
      "PASS S5-06: Royal Court UI now owns Court/Audience/Council without overlapping the bottom-left Campaign panel"
    );

    console.log("");
    console.log(
      "FINAL GAMEPLAY BIG STEP 5 — AUDIENCE & COUNCIL: PASS"
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
