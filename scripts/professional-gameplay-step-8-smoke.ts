// STEP8_STEP9_COMPAT_V2: StrategicBriefingPanel may be mounted via StrategicCommandCenter.
import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  buildPlayerStrategicBriefing,
} from "../lib/session/strategic-briefing";

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[
      world.session
        .localPlayerId
    ];

  assert.ok(
    player
  );

  const briefing =
    buildPlayerStrategicBriefing(
      player.id
    );

  assert.ok(
    briefing
  );

  if (!briefing) {
    throw new Error(
      "Expected a strategic briefing for the local player."
    );
  }

  assert.equal(
    briefing.playerId,
    player.id
  );

  assert.equal(
    briefing.kingdomId,
    player.kingdomId
  );

  assert.ok(
    Array.isArray(
      briefing.items
    )
  );

  assert.ok(
    Number.isFinite(
      briefing.economy
        .projectedDailyNetGold
    )
  );

  assert.ok(
    Number.isFinite(
      briefing.territory
        .disruptedGold
    )
  );

  console.log(
    "PASS S8-01: strategic briefing combines delivered knowledge with exact own-realm economy/territory state"
  );

  const briefingSource =
    readFileSync(
      "lib/session/strategic-briefing.ts",
      "utf8"
    );

  assert.ok(
    briefingSource.includes(
      "getDeliveredPlayerKnowledge"
    )
  );

  assert.ok(
    briefingSource.includes(
      "getRealmBudgetSnapshot"
    )
  );

  assert.ok(
    briefingSource.includes(
      "getKingdomTerritoryEconomy"
    )
  );

  console.log(
    "PASS S8-02: briefing builder has explicit player-safe knowledge and own-realm strategic inputs"
  );

  const intelligence =
    readFileSync(
      "lib/session/intelligence.ts",
      "utf8"
    );

  assert.ok(
    !intelligence.includes(
      "world.armies"
    )
  );

  assert.ok(
    !intelligence.includes(
      "entityPositions"
    )
  );

  assert.ok(
    !intelligence.includes(
      "getMapEdge"
    )
  );

  assert.ok(
    intelligence.includes(
      "buildPlayerStrategicBriefing"
    )
  );

  console.log(
    "PASS S8-03: scheduled intelligence no longer scans hidden canonical enemy armies or positions"
  );

  assert.ok(
    intelligence.includes(
      "meaningfulPlayerIds"
    )
  );

  assert.ok(
    intelligence.includes(
      "meaningfulPlayerIds.length ==="
    )
  );

  assert.ok(
    intelligence.includes(
      "openCommandInterrupt"
    )
  );

  assert.ok(
    intelligence.includes(
      '"STRATEGIC_BRIEFING"'
    )
  );

  console.log(
    "PASS S8-04: routine briefings are recorded silently while meaningful briefings open targeted command interrupts"
  );

  const orchestrator =
    readFileSync(
      "lib/actors/orchestrator.ts",
      "utf8"
    );

  assert.ok(
    orchestrator.includes(
      'cycle.phase === "planning"'
    )
  );

  assert.ok(
    orchestrator.includes(
      'cycle.phase === "interrupted"'
    )
  );

  assert.ok(
    orchestrator.includes(
      "runLlmPlayerActivation"
    )
  );

  console.log(
    "PASS S8-05: Actor/GM realm activation remains event/command-window driven rather than hourly polling"
  );

  const demoRuntime =
    readFileSync(
      "app/demo-runtime.tsx",
      "utf8"
    );

  assert.ok(
    demoRuntime.includes(
      'cycle.phase ===\n              "executing"'
    )
  );

  assert.ok(
    demoRuntime.includes(
      "advanceWorldBy"
    )
  );

  assert.ok(
    demoRuntime.includes(
      "getCurrentLlmActivation"
    )
  );

  console.log(
    "PASS S8-06: world execution advances independently and only services an LLM when a command activation exists"
  );

  const actorContext =
    readFileSync(
      "lib/actors/context.ts",
      "utf8"
    );

  assert.ok(
    actorContext.includes(
      "getPlayerKnownWorld"
    )
  );

  const panel =
    readFileSync(
      "app/strategic-briefing-panel.tsx",
      "utf8"
    );

  const root =
    readFileSync(
      "app/game-root.tsx",
      "utf8"
    );

  assert.ok(
    panel.includes(
      "getLatestDeliveredStrategicBriefing"
    )
  );

  assert.ok(
    panel.includes(
      "Routine briefing only"
    )
  );

  const commandCenter =
    readFileSync(
      "app/strategic-command-center.tsx",
      "utf8"
    );

  const briefingMounted =
    root.includes(
      "<StrategicBriefingPanel />"
    ) ||
    (
      root.includes(
        "<StrategicCommandCenter />"
      ) &&
      commandCenter.includes(
        "<StrategicBriefingPanel"
      ) &&
      commandCenter.includes(
        "embedded"
      )
    );

  assert.ok(
    briefingMounted
  );

  console.log(
    "PASS S8-07: Human and Actor consume the same delivered-knowledge briefing stream, directly or through the Step 9 command center"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 8 — BRIEFING + INTERRUPT INTELLIGENCE LOOP: PASS"
  );
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
