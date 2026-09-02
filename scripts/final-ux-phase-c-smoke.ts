import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  beginCampaign,
  validateCampaignSelection,
} from "../lib/demo/campaign";

import {
  serializeDemoSave,
  restoreDemoSave,
} from "../lib/demo/persistence";

async function main(): Promise<void> {
  const invalid =
    validateCampaignSelection({
      humanPlayerId:
        "player-edwyn",
      actorPlayerId:
        "player-edwyn",
    });

  assert.equal(
    invalid.ok,
    false
  );

  console.log(
    "PASS C-01: campaign setup rejects same Human/Actor realm"
  );

  const result =
    beginCampaign({
      humanPlayerId:
        "player-edwyn",
      actorPlayerId:
        "player-roderic",
    });

  if (!result.ok) {
    throw new Error(
      result.error
    );
  }

  const world =
    getRuntimeWorldState();

  assert.equal(
    world.session.localPlayerId,
    "player-edwyn"
  );

  assert.equal(
    world.session.players[
      "player-edwyn"
    ].controllerType,
    "human"
  );

  assert.equal(
    world.session.players[
      "player-roderic"
    ].controllerType,
    "webmcp_llm"
  );

  console.log(
    "PASS C-02: New Campaign binds Human and Actor LLM roles"
  );

  const save =
    serializeDemoSave();

  const originalTime =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      simulation: {
        ...current.simulation,
        worldTimeMinutes:
          originalTime + 777,
      },
    })
  );

  restoreDemoSave(
    save
  );

  assert.equal(
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes,
    originalTime
  );

  console.log(
    "PASS C-03: menu save/import foundation preserves canonical world"
  );

  assert.ok(
    save.includes(
      '"session"'
    )
  );

  assert.ok(
    save.includes(
      '"simulation"'
    )
  );

  console.log(
    "PASS C-04: downloadable save contains canonical session + simulation"
  );

  console.log("");
  console.log(
    "FINAL GAME UX PHASE C — GAME SHELL: PASS"
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
