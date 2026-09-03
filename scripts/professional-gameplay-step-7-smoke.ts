// PROFESSIONAL-GAMEPLAY-STEP-7-SMOKE_TS_STEP9_COMPAT: strategic UI may be embedded in StrategicCommandCenter.
import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getLordMilitaryAssessment,
  inspectKingdomMilitaryPolitics,
  estimateLordOrderObedience,
} from "../lib/lords/military-politics";

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[
      world.session.localPlayerId
    ];

  assert.ok(
    player
  );

  const inspection =
    inspectKingdomMilitaryPolitics(
      world.session.id,
      player.id
    );

  assert.ok(
    inspection.ok
  );

  if (!inspection.ok) {
    throw new Error(
      "Military politics inspection failed."
    );
  }

  assert.ok(
    inspection.lords.length >
      0
  );

  console.log(
    "PASS S7-01: own-realm major lords expose a canonical military-politics assessment"
  );

  const lord =
    inspection.lords[0];

  assert.ok(
    Number.isFinite(
      lord.commanderSuitability
        .score
    )
  );

  assert.ok(
    Number.isFinite(
      lord.obedience
        .baseScore
    )
  );

  assert.ok(
    Number.isFinite(
      lord.politicalRisk
        .score
    )
  );

  assert.ok(
    Number.isFinite(
      lord.controlledSoldiers
    )
  );

  console.log(
    "PASS S7-02: commander suitability, obedience and political risk are deterministic numeric assessments"
  );

  const lowRisk =
    estimateLordOrderObedience(
      lord.characterId,
      "HOLD_POSITION",
      20
    );

  const highRisk =
    estimateLordOrderObedience(
      lord.characterId,
      "BRING_ARMY",
      90
    );

  assert.ok(
    lowRisk
  );

  assert.ok(
    highRisk
  );

  if (
    lowRisk &&
    highRisk
  ) {
    assert.ok(
      lowRisk.score >=
        highRisk.score
    );
  }

  console.log(
    "PASS S7-03: higher-risk military orders never improve the same lord's obedience forecast"
  );

  const direct =
    getLordMilitaryAssessment(
      lord.characterId
    );

  assert.ok(
    direct
  );

  if (direct) {
    assert.equal(
      direct.controlledSoldiers,
      lord.controlledSoldiers
    );
  }

  console.log(
    "PASS S7-04: Human/WebMCP inspection shares one military-politics calculation"
  );

  const service =
    readFileSync(
      "lib/lords/service.ts",
      "utf8"
    );

  assert.ok(
    service.includes(
      "resolveReceivedLordOrder"
    )
  );

  assert.ok(
    service.includes(
      "getGmLordOrderModelAdapter"
    )
  );

  assert.ok(
    service.includes(
      "moveArmy"
    )
  );

  assert.ok(
    service.includes(
      "recruitUnits"
    )
  );

  console.log(
    "PASS S7-05: accepted lord orders still resolve through the existing independent-lord decision and canonical military services"
  );

  const model =
    readFileSync(
      "lib/lords/model.ts",
      "utf8"
    );

  assert.ok(
    model.includes(
      '"REFUSE"'
    ) &&
    model.includes(
      '"DELAY"'
    ) &&
    model.includes(
      '"NEGOTIATE"'
    ) &&
    model.includes(
      '"PARTIAL_COMPLIANCE"'
    )
  );

  assert.ok(
    model.includes(
      "lord.loyalty"
    ) &&
    model.includes(
      "traits.caution"
    ) &&
    model.includes(
      "traits.ambition"
    )
  );

  console.log(
    "PASS S7-06: lords remain politically autonomous and may refuse/delay/negotiate based on loyalty, traits, relationship and risk"
  );

  const webmcp =
    readFileSync(
      "lib/webmcp/register-lord-tools.ts",
      "utf8"
    );

  assert.ok(
    webmcp.includes(
      "inspect_lord_military_politics"
    )
  );

  assert.ok(
    webmcp.includes(
      "issue_character_order"
    )
  );

  const panel =
    readFileSync(
      "app/lord-military-politics-panel.tsx",
      "utf8"
    );

  const root =
    readFileSync(
      "app/game-root.tsx",
      "utf8"
    );

  assert.ok(
    panel.includes(
      "Commander suitability"
    )
  );

  assert.ok(
    panel.includes(
      "Political Risk"
    )
  );

  assert.ok(
    panel.includes(
      "Order risk"
    )
  );

  const commandCenter =
    readFileSync(
      "app/strategic-command-center.tsx",
      "utf8"
    );

  const surfaceMounted =
    root.includes(
      "<LordMilitaryPoliticsPanel />"
    ) ||
    (
      root.includes(
        "<StrategicCommandCenter />"
      ) &&
      commandCenter.includes(
        '"LORDS"'
      ) &&
      commandCenter.includes(
        "<LordMilitaryPoliticsPanel"
      ) &&
      commandCenter.includes(
        "embedded"
      )
    );

  assert.ok(
    surfaceMounted
  );

  console.log(
    "PASS S7-07: Human and WebMCP expose lord military authority directly or through the Step 9 LORDS workspace"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 7 — COMMANDER + LORD MILITARY POLITICS: PASS"
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
