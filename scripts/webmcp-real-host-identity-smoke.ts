import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  validateBoundWebMcpIdentity,
} from "../lib/webmcp/identity-guard";

async function main():
  Promise<void> {
  const guard =
    readFileSync(
      "lib/webmcp/identity-guard.ts",
      "utf8"
    );

  assert.equal(
    guard.includes(
      'Object.defineProperty(\n      modelContext,\n      "registerTool"'
    ),
    false
  );

  assert.ok(
    guard.includes(
      "getIdentityBoundWebMcpModelContext"
    )
  );

  console.log(
    "PASS WM-01: identity binding no longer monkey-patches host registerTool"
  );

  const files = [
    "lib/webmcp/register-tools.ts",
    "lib/webmcp/register-conversation-tools.ts",
    "lib/webmcp/register-lord-tools.ts",
    "lib/webmcp/register-politics-tools.ts",
    "lib/webmcp/register-border-tools.ts",
    "lib/webmcp/register-army-management-tools.ts",
    "lib/webmcp/register-audience-tools.ts",
  ];

  for (
    const path
    of files
  ) {
    const text =
      readFileSync(
        path,
        "utf8"
      );

    assert.ok(
      text.includes(
        "getIdentityBoundWebMcpModelContext"
      ),
      `${path} must use the identity facade`
    );

    assert.equal(
      /const\s+modelContext\s*=\s*document\.modelContext\s*;/.test(
        text
      ),
      false,
      `${path} still binds directly to document.modelContext`
    );
  }

  console.log(
    "PASS WM-02: every gameplay registration module uses the identity-bound facade"
  );

  const world =
    getRuntimeWorldState();

  const correct =
    validateBoundWebMcpIdentity({
      session_id:
        world.session.id,

      player_id:
        world.session
          .localPlayerId,
    });

  assert.equal(
    correct.ok,
    true
  );

  const wrongPlayer =
    validateBoundWebMcpIdentity({
      session_id:
        world.session.id,

      player_id:
        "__spoofed_player__",
    });

  assert.equal(
    wrongPlayer.ok,
    false
  );

  if (
    wrongPlayer.ok ===
    false
  ) {
    assert.equal(
      wrongPlayer.error,
      "WEBMCP_PLAYER_IDENTITY_MISMATCH"
    );
  }

  const wrongSession =
    validateBoundWebMcpIdentity({
      session_id:
        "__spoofed_session__",

      player_id:
        world.session
          .localPlayerId,
    });

  assert.equal(
    wrongSession.ok,
    false
  );

  if (
    wrongSession.ok ===
    false
  ) {
    assert.equal(
      wrongSession.error,
      "WEBMCP_SESSION_IDENTITY_MISMATCH"
    );
  }

  console.log(
    "PASS WM-03: spoofed WebMCP session/player identities remain rejected"
  );

  const provider =
    readFileSync(
      "app/webmcp-provider.tsx",
      "utf8"
    );

  assert.ok(
    provider.includes(
      "identity-bound facade registration"
    )
  );

  console.log(
    "PASS WM-04: provider uses the non-mutating identity-facade registration flow"
  );

  console.log("");
  console.log(
    "WEBMCP REAL HOST IDENTITY FIX: PASS"
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
