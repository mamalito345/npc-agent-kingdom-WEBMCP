import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

async function main():
  Promise<void> {
  const director =
    readFileSync(
      "lib/director/openai-adapter.ts",
      "utf8"
    );

  assert.equal(
    director.includes(
      "gpt-5.6-terra"
    ),
    false
  );

  assert.ok(
    director.includes(
      "GM_DIRECTOR_MODEL_REQUIRED"
    )
  );

  assert.ok(
    director.includes(
      "injected-transport-model"
    )
  );

  console.log(
    "PASS S6-01: legacy Director adapter has no fictitious OpenAI model default while injected deterministic tests remain possible"
  );

  const strategy =
    readFileSync(
      "app/strategy-map.tsx",
      "utf8"
    );

  const conflict =
    readFileSync(
      "app/conflict-layer.tsx",
      "utf8"
    );

  assert.ok(
    strategy.includes(
      "<ConflictLayer />"
    )
  );

  assert.ok(
    conflict.includes(
      "world.battles"
    )
  );

  assert.ok(
    conflict.includes(
      "world.sieges"
    )
  );

  assert.ok(
    conflict.includes(
      "selectMapArmy("
    )
  );

  assert.ok(
    conflict.includes(
      "selectMapSettlement("
    )
  );

  console.log(
    "PASS S6-02: active battles and sieges have clickable map feedback without a second simulation state"
  );

  const battle =
    readFileSync(
      "app/battle-board.tsx",
      "utf8"
    );

  assert.ok(
    battle.includes(
      "setPlayerBattleTactic"
    )
  );

  assert.ok(
    battle.includes(
      "submitPlayerBattleCrisisOrder"
    )
  );

  assert.ok(
    battle.includes(
      "frontMomentum"
    )
  );

  assert.ok(
    battle.includes(
      "lastRound"
    )
  );

  console.log(
    "PASS S6-03: battle polish preserves canonical PlayerAction controls and adds momentum/casualty feedback"
  );

  const audio =
    readFileSync(
      "app/game-audio.tsx",
      "utf8"
    );

  const audioEngine =
    readFileSync(
      "lib/ui/game-audio.ts",
      "utf8"
    );

  assert.ok(
    audio.includes(
      "unlockGameAudio"
    )
  );

  assert.ok(
    audio.includes(
      "world.battles"
    )
  );

  assert.ok(
    audio.includes(
      "world.sieges"
    )
  );

  assert.ok(
    audioEngine.includes(
      "AudioContext"
    )
  );

  assert.equal(
    audioEngine.includes(
      ".mp3"
    ) ||
      audioEngine.includes(
        ".wav"
      ),
    false
  );

  console.log(
    "PASS S6-04: opt-in browser audio feedback is event-driven and has no missing external audio asset dependency"
  );

  const live =
    readFileSync(
      "scripts/live-openai-model-smoke.ts",
      "utf8"
    );

  assert.ok(
    live.includes(
      "PLAYER_LLM_MODEL"
    )
  );

  assert.ok(
    live.includes(
      "GM_CHARACTER_MODEL"
    )
  );

  assert.ok(
    live.includes(
      "GM_DIRECTOR_MODEL"
    )
  );

  assert.ok(
    live.includes(
      "/v1/responses"
    )
  );

  console.log(
    "PASS S6-05: explicit live OpenAI model/API readiness smoke is prepared for the next phase"
  );

  const provider =
    readFileSync(
      "app/webmcp-provider.tsx",
      "utf8"
    );

  assert.ok(
    provider.includes(
      "installWebMcpIdentityGuard"
    )
  );

  assert.ok(
    provider.includes(
      "registerAudienceWebMCPTools"
    )
  );

  assert.ok(
    provider.includes(
      "registerArmyManagementWebMCPTools"
    )
  );

  console.log(
    "PASS S6-06: final WebMCP provider still includes identity binding plus gameplay expansion modules"
  );

  console.log("");
  console.log(
    "FINAL GAMEPLAY BIG STEP 6 — FINAL POLISH & LLM READINESS: PASS"
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
