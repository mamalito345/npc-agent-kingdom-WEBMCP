import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

async function main():
  Promise<void> {
  const court =
    readFileSync(
      "app/court-panel.tsx",
      "utf8"
    );

  assert.ok(
    court.includes(
      "const presentCharacters ="
    )
  );

  assert.ok(
    court.includes(
      "function presentPetition("
    )
  );

  assert.equal(
    court.includes(
      "const present ="
    ),
    false
  );

  assert.equal(
    court.includes(
      "function present("
    ),
    false
  );

  assert.ok(
    court.includes(
      "presentCharacters.length"
    )
  );

  assert.ok(
    court.includes(
      "presentCharacters"
    )
  );

  assert.ok(
    court.includes(
      "presentPetition("
    )
  );

  const actors =
    readFileSync(
      "types/actors.ts",
      "utf8"
    );

  assert.ok(
    actors.includes(
      "audienceRequests?:"
    ),
    "LlmPlayerContext audienceRequests must remain optional so historical manually-built context fixtures do not all break again."
  );

  const politics =
    readFileSync(
      "types/politics.ts",
      "utf8"
    );

  assert.ok(
    politics.includes(
      "audienceRequests?:"
    ),
    "PoliticsRuntimeState audienceRequests must remain optional for old save/runtime initializers."
  );

  const phaseF =
    readFileSync(
      "scripts/final-ux-phase-f-smoke.ts",
      "utf8"
    );

  assert.ok(
    phaseF.includes(
      "campaignStatus:"
    ),
    "Historical Phase F LlmPlayerContext fixture must contain the Step 4 required campaignStatus field."
  );

  const provider =
    readFileSync(
      "app/webmcp-provider.tsx",
      "utf8"
    );

  assert.ok(
    provider.includes(
      "registerAudienceWebMCPTools"
    )
  );

  const audience =
    readFileSync(
      "lib/politics/audience.ts",
      "utf8"
    );

  assert.ok(
    audience.includes(
      "audienceRequests ??"
    ) ||
    audience.includes(
      ".audienceRequests ??"
    ),
    "Audience service must tolerate pre-Step-5 saves without audienceRequests."
  );

  console.log(
    "PASS C5-01: Court local identifiers do not collide"
  );

  console.log(
    "PASS C5-02: Step 4/5 context compatibility is preserved for historical smoke fixtures"
  );

  console.log(
    "PASS C5-03: pre-Step-5 politics state remains backward compatible"
  );

  console.log(
    "PASS C5-04: Audience WebMCP provider integration remains present"
  );

  console.log("");
  console.log(
    "FINAL GAMEPLAY STEP 5 — COMPATIBILITY AUDIT: PASS"
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
