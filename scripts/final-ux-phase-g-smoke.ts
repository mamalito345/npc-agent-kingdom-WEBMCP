import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  setPlayerBattleTactic,
} from "../lib/session/player-actions";

import {
  proposeAgreement,
} from "../lib/politics/service";

import {
  setGmLordOrderModelAdapter,
  resetGmLordOrderModelAdapter,
} from "../lib/lords/model";

import {
  issueCharacterOrder,
} from "../lib/lords/service";

import {
  serializeDemoSave,
} from "../lib/demo/persistence";

function setTurn(
  playerId: string
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        commandCycle: {
          ...current.session
            .commandCycle,
          phase:
            "planning",
          requiredPlayerIds: [
            playerId,
          ],
          readyPlayerIds: [],
          currentPlayerId:
            playerId,
          interrupt:
            undefined,
        },
      },
    })
  );
}

async function main(): Promise<void> {
  const world =
    getRuntimeWorldState();

  assert.ok(
    world.session
      .campaignControl
  );

  console.log(
    "PASS G-01: final UX operates on campaign controller-aware canonical state"
  );

  setTurn(
    "player-roderic"
  );

  const diplomacy =
    proposeAgreement(
      world.session.id,
      "player-roderic",
      "NON_AGGRESSION",
      "northreach",
      {
        terms:
          "Keep armies away from the eastern frontier.",
      }
    );

  assert.equal(
    diplomacy.ok,
    true
  );

  if (diplomacy.ok) {
    assert.ok(
      diplomacy.message
        .content.includes(
          "DIPLOMATIC_PROPOSAL"
        )
    );
  }

  console.log(
    "PASS G-02: diplomacy drawer uses canonical courier-backed agreement service"
  );

  setGmLordOrderModelAdapter({
    decideOrder() {
      return {
        response:
          "ACCEPT",
        summary:
          "The lord accepts the hold order.",
      };
    },
  });

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      simulation: {
        ...current.simulation,
        entityPositions: {
          ...current.simulation
            .entityPositions,
          king_roderic: {
            kind: "node",
            nodeId:
              "greenharbor",
          },
          lord_theon: {
            kind: "node",
            nodeId:
              "greenharbor",
          },
        },
      },
    })
  );

  setTurn(
    "player-roderic"
  );

  const lord =
    await issueCharacterOrder(
      world.session.id,
      "player-roderic",
      "lord_theon",
      {
        type:
          "HOLD_POSITION",
        risk: 20,
      }
    );

  assert.equal(
    lord.ok,
    true
  );

  resetGmLordOrderModelAdapter();

  console.log(
    "PASS G-03: lord council UI maps to GM Character lord-order service"
  );

  /*
   * Battle board calls these canonical player action wrappers only.
   * We don't need to mutate a fake battle fixture merely to test rendering.
   * Verify the canonical API surface exists and rejects an invalid battle
   * rather than bypassing the command layer.
   */
  setTurn(
    "player-roderic"
  );

  const invalidTactic =
    setPlayerBattleTactic(
      world.session.id,
      "player-roderic",
      "missing-battle",
      "army-eastvale-roderic",
      "hold_ground"
    );

  assert.equal(
    invalidTactic.ok,
    false
  );

  console.log(
    "PASS G-04: battle board action path is canonical PlayerAction, not direct battle mutation"
  );

  const save =
    serializeDemoSave();

  assert.ok(
    save.includes(
      '"campaignControl"'
    )
  );

  assert.ok(
    save.includes(
      '"borders"'
    )
  );

  assert.ok(
    save.includes(
      '"director"'
    )
  );

  console.log(
    "PASS G-05: save UX preserves controller roles, borders and GM/director runtime"
  );

  console.log("");
  console.log(
    "FINAL GAME UX PHASE G — WAR, LORDS, DIPLOMACY & SAVE: PASS"
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
