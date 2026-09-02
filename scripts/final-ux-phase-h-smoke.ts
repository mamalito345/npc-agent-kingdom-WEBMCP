import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  validateBoundWebMcpIdentity,
} from "../lib/webmcp/identity-guard";

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        localPlayerId:
          "player-edwyn",
      },
    })
  );

  const correct =
    validateBoundWebMcpIdentity({
      session_id:
        world.session.id,
      player_id:
        "player-edwyn",
    });

  assert.equal(
    correct.ok,
    true
  );

  const spoofPlayer =
    validateBoundWebMcpIdentity({
      session_id:
        world.session.id,
      player_id:
        "player-roderic",
    });

  assert.equal(
    spoofPlayer.ok,
    false
  );

  if (
    spoofPlayer.ok ===
    false
  ) {
    assert.equal(
      spoofPlayer.error,
      "WEBMCP_PLAYER_IDENTITY_MISMATCH"
    );
  }

  const spoofSession =
    validateBoundWebMcpIdentity({
      session_id:
        "attacker-session",
      player_id:
        "player-edwyn",
    });

  assert.equal(
    spoofSession.ok,
    false
  );

  if (
    spoofSession.ok ===
    false
  ) {
    assert.equal(
      spoofSession.error,
      "WEBMCP_SESSION_IDENTITY_MISMATCH"
    );
  }

  console.log(
    "PASS H-01: WebMCP identity binding rejects player/session spoofing"
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
    !provider.includes(
      "unregisterWebMCPTools()"
    )
  );

  assert.ok(
    !provider.includes(
      "unregisterConversationWebMCPTools()"
    )
  );

  console.log(
    "PASS H-02: root provider installs guard and avoids StrictMode unregister/AbortError race"
  );

  const openAi =
    readFileSync(
      "lib/ai/server-openai.ts",
      "utf8"
    );

  assert.ok(
    !openAi.includes(
      "gpt-5.6-terra"
    )
  );

  assert.ok(
    openAi.includes(
      "PLAYER_LLM_MODEL"
    )
  );

  assert.ok(
    openAi.includes(
      "GM_CHARACTER_MODEL"
    )
  );

  assert.ok(
    openAi.includes(
      "GM_DIRECTOR_MODEL"
    )
  );

  console.log(
    "PASS H-03: AI runtime has no unverified hard-coded model default"
  );

  const strategyMap =
    readFileSync(
      "app/strategy-map.tsx",
      "utf8"
    );

  assert.ok(
    !strategyMap.includes(
      "advanceWorldBy("
    )
  );

  console.log(
    "PASS H-04: StrategyMap does not own a second simulation clock"
  );

  const operationalPanel =
    readFileSync(
      "app/operational-panel.tsx",
      "utf8"
    );

  for (
    const forbidden
    of [
      "moveArmy(",
      "startBattle(",
      "startSiege(",
      "submitBattleOrder(",
      "setBattleTactic(",
    ]
  ) {
    assert.ok(
      !operationalPanel.includes(
        forbidden
      ),
      `Human UI bypass remains: ${forbidden}`
    );
  }

  assert.ok(
    operationalPanel.includes(
      "issuePlayerArmyMove("
    )
  );

  console.log(
    "PASS H-05: map Human movement uses PlayerAction boundary, not direct simulation mutation"
  );

  const gameRoot =
    readFileSync(
      "app/game-root.tsx",
      "utf8"
    );

  assert.ok(
    gameRoot.includes(
      'demo.mode === "player"'
    )
  );

  assert.ok(
    gameRoot.includes(
      "<ObserverArena />"
    )
  );

  console.log(
    "PASS H-06: Player and omniscient Observer presentation remain mode-separated"
  );

  const borderTools =
    readFileSync(
      "lib/webmcp/register-border-tools.ts",
      "utf8"
    );

  assert.ok(
    borderTools.includes(
      'name:\n          "cross_border"'
    )
  );

  assert.ok(
    borderTools.includes(
      "forcePlayerArmyBorderMove("
    )
  );

  console.log(
    "PASS H-07: WebMCP has explicit canonical border-violation confirmation tool"
  );

  console.log("");
  console.log(
    "FINAL GAME UX PHASE H — HARDENING: PASS"
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
