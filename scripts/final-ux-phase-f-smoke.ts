import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  beginCampaign,
} from "../lib/demo/campaign";

import {
  getRealmControlLabel,
  getRealmControlRole,
} from "../lib/demo/realm-control";

import {
  buildGmWorldSnapshot,
} from "../lib/director/world-snapshot";

import {
  buildDirectorContext,
} from "../lib/director/context";

import {
  RemoteGmRealmAdapter,
} from "../lib/ai/remote-adapters";

async function main(): Promise<void> {
  const campaign =
    beginCampaign({
      humanPlayerId:
        "player-edwyn",
      actorPlayerId:
        "player-roderic",
    });

  if (!campaign.ok) {
    throw new Error(
      campaign.error
    );
  }

  assert.equal(
    getRealmControlRole(
      "northreach"
    ),
    "HUMAN"
  );

  assert.equal(
    getRealmControlRole(
      "eastvale"
    ),
    "ACTOR_LLM"
  );

  assert.equal(
    getRealmControlRole(
      "westmoor"
    ),
    "GM"
  );

  assert.equal(
    getRealmControlLabel(
      "ironhollow"
    ),
    "GM CONTROLLED"
  );

  console.log(
    "PASS F-01: campaign roles distinguish Human / Actor LLM / GM realms"
  );

  const snapshot =
    buildGmWorldSnapshot();

  assert.equal(
    snapshot.kingdoms.length,
    5
  );

  assert.ok(
    snapshot.settlements.length >=
      20
  );

  assert.ok(
    snapshot.armies.length >=
      15
  );

  assert.equal(
    snapshot.lords.length,
    10
  );

  assert.ok(
    snapshot.realmKnowledge
      .length >=
      5
  );

  assert.ok(
    "agreements" in
      snapshot.diplomacy
  );

  console.log(
    "PASS F-02: GM world brain receives kingdoms/resources/settlements/armies/lords/diplomacy/knowledge/events"
  );

  const director =
    buildDirectorContext();

  assert.ok(
    director.worldSnapshot
  );

  assert.equal(
    director.session.players
      .find(
        (player) =>
          player.kingdomId ===
          "westmoor"
      )
      ?.realmControlRole,
    "GM"
  );

  console.log(
    "PASS F-03: World Director context contains complete strategic snapshot and controller roles"
  );

  const gmRealmAdapter =
    new RemoteGmRealmAdapter({
      async post(
        _url,
        body: unknown
      ) {
        const request =
          body as {
            playerContext: {
              playerId: string;
            };
            worldSnapshot: {
              kingdoms: unknown[];
              realmKnowledge: unknown[];
            };
          };

        assert.equal(
          request.playerContext
            .playerId,
          "player-garran"
        );

        assert.equal(
          request.worldSnapshot
            .kingdoms.length,
          5
        );

        return {
          ok: true,
          decision: {
            decisionSummary:
              "Hold Westmoor while reviewing delivered intelligence.",
            actions: [
              {
                tool:
                  "inspect_known_world",
                args: {},
              },
            ],
            passWindow: true,
          },
        } as never;
      },
    });

  const decision =
    await gmRealmAdapter
      .generateDecision({
        sessionId:
          "demo-session",
        playerId:
          "player-garran",
        activationReason:
          "NORMAL_COMMAND_WINDOW",
        worldTimeMinutes:
          getRuntimeWorldState()
            .simulation
            .worldTimeMinutes,
        playerState: {},
        knownWorld: {},
        knownEnemyForces: {},
        messages: {},
        orders: {},
        battles: {},
        settlements: {},
        economy: {},
        presentCharacters: {},
        lords: {},
        lordOrders: {},
        relationships: {},
        agreements: {},
        diplomaticProposals: {},
        promises: {},
        activePlan: null,
        availableActions: [
          "inspect_known_world",
          "pass_command_window",
        ],
        rules: [],
      });

  assert.equal(
    decision.passWindow,
    true
  );

  console.log(
    "PASS F-04: GM-controlled realm receives full GM snapshot but returns ordinary canonical tool actions"
  );

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        presenceContexts: {
          ...current.session
            .presenceContexts,
          "smoke-army-presence": {
            id:
              "smoke-army-presence",
            kind:
              "army",
            characterIds: [
              "lord_theon",
            ],
            active:
              true,
            referenceId:
              "army-house-theon",
          },
        },
      },
    })
  );

  const presence =
    Object.values(
      getRuntimeWorldState()
        .session
        .presenceContexts
    ).find(
      (context) =>
        context.kind ===
          "army" &&
        context.referenceId ===
          "army-house-theon"
    );

  assert.ok(
    presence?.characterIds
      .includes(
        "lord_theon"
      )
  );

  console.log(
    "PASS F-05: army inspector can show canonical lords/characters physically attached to an army"
  );

  console.log("");
  console.log(
    "FINAL GAME UX PHASE F — CONTROL IDENTITY & GM WORLD BRAIN: PASS"
  );
}

main().catch(
  (error: unknown) => {
    console.error(
      error
    );
    process.exitCode =
      1;
  }
);
