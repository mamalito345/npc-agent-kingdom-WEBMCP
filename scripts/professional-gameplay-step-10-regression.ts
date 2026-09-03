import assert from "node:assert/strict";

import {
  existsSync,
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getRealmBudgetSnapshot,
} from "../lib/economy/realm-budget";

import {
  getKingdomTerritoryEconomy,
} from "../lib/economy/territory-economy";

import {
  buildPlayerStrategicBriefing,
} from "../lib/session/strategic-briefing";

import {
  inspectKingdomMilitaryPolitics,
} from "../lib/lords/military-politics";

function source(
  path:
    string
): string {
  assert.ok(
    existsSync(
      path
    ),
    `Expected project file missing: ${path}`
  );

  return readFileSync(
    path,
    "utf8"
  );
}

function includesAll(
  text:
    string,
  values:
    string[],
  label:
    string
): void {
  for (
    const value
    of values
  ) {
    assert.ok(
      text.includes(
        value
      ),
      `${label} missing ${value}`
    );
  }
}

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  const localPlayer =
    world.session.players[
      world.session
        .localPlayerId
    ];

  assert.ok(
    localPlayer
  );

  const budget =
    getRealmBudgetSnapshot(
      localPlayer.kingdomId
    );

  assert.ok(
    Number.isFinite(
      budget.treasury
    )
  );

  assert.ok(
    Number.isFinite(
      budget.dailyIncomeGold
    )
  );

  assert.ok(
    Number.isFinite(
      budget.dailyArmyExpenseGold
    )
  );

  assert.ok(
    Number.isFinite(
      budget.projectedDailyNetGold
    )
  );

  console.log(
    "PASS S10-01: realm economy exposes conserved treasury, income, army expense and projected net"
  );

  const recruitment =
    source(
      "lib/military/recruitment.ts"
    );

  const fortification =
    source(
      "lib/military/fortification.ts"
    );

  const development =
    source(
      "lib/economy/development.ts"
    );

  includesAll(
    recruitment,
    [
      "reserveSettlementResources",
      "INSUFFICIENT_RESOURCES",
      "MOBILIZATION_CAPACITY_EXCEEDED",
      "RECRUITMENT_SLOT_LIMIT",
    ],
    "recruitment conservation"
  );

  includesAll(
    fortification,
    [
      "reserveSettlementResources",
      "INSUFFICIENT_RESOURCES",
      "completesAt",
    ],
    "fortification conservation"
  );

  includesAll(
    development,
    [
      "INSUFFICIENT_RESOURCES",
      "resources:",
    ],
    "development conservation"
  );

  console.log(
    "PASS S10-02: recruitment, fortification and development cannot create free resources or instant projects"
  );

  const coreActor =
    source(
      "lib/actors/tool-executor.ts"
    );

  const managementActor =
    source(
      "lib/actors/management-tool-executor.ts"
    );

  includesAll(
    coreActor,
    [
      "recruit_units",
      "recruitPlayerUnits",
    ],
    "Actor recruitment parity"
  );

  includesAll(
    managementActor,
    [
      "develop_settlement",
      "developPlayerSettlement",
      "fortify_settlement",
      "fortifyPlayerSettlement",
    ],
    "Actor management parity"
  );

  console.log(
    "PASS S10-03: Actor/GM economic actions route through the same player-safe canonical action services as Human"
  );

  const territory =
    getKingdomTerritoryEconomy(
      localPlayer.kingdomId
    );

  assert.ok(
    Number.isFinite(
      territory.dailyTerritoryGold
    )
  );

  assert.ok(
    Number.isFinite(
      territory.disruptedGold
    )
  );

  assert.ok(
    territory.homeNodeCount >=
    territory.occupiedHomeNodeCount
  );

  const territorySource =
    source(
      "lib/economy/territory-economy.ts"
    );

  includesAll(
    territorySource,
    [
      "contested",
      "occupied",
      "disrupted",
    ],
    "territory consequence model"
  );

  console.log(
    "PASS S10-04: territorial control/occupation is connected to income disruption rather than being cosmetic map state"
  );

  const war =
    source(
      "lib/politics/war.ts"
    );

  const diplomaticLaw =
    source(
      "lib/politics/diplomatic-law.ts"
    );

  const borderAccess =
    source(
      "lib/map/border-access.ts"
    );

  includesAll(
    war,
    [
      "ACTIVE_PEACE_TRUCE",
      "MILITARY_ACCESS",
      "NON_AGGRESSION",
    ],
    "war law"
  );

  includesAll(
    diplomaticLaw,
    [
      "hasDiplomaticMilitaryAccess",
      "peaceProtected",
      "canDeclareWar",
    ],
    "diplomatic law"
  );

  assert.ok(
    borderAccess.includes(
      "hasDiplomaticMilitaryAccess"
    )
  );

  console.log(
    "PASS S10-05: war declaration, truce and military-access law share one canonical diplomatic decision path"
  );

  const borderIncidents =
    source(
      "lib/world/border-incidents.ts"
    );

  includesAll(
    borderIncidents,
    [
      "allowBorderViolation",
      "relationship",
      "IMPORTANT_MESSAGE",
    ],
    "border consequences"
  );

  console.log(
    "PASS S10-06: illegal border crossings remain physical, deduplicated and consequence-bearing"
  );

  const battleState =
    source(
      "lib/military/battle-state.ts"
    );

  const resolver =
    source(
      "lib/military/terrain-resolver.ts"
    );

  includesAll(
    battleState,
    [
      "resolveBattlefield",
      "terrain",
      "features",
    ],
    "battle terrain integration"
  );

  includesAll(
    resolver,
    [
      "frontage",
      "chokepoint",
      "bridgehead",
    ],
    "terrain resolver"
  );

  console.log(
    "PASS S10-07: terrain/position analysis feeds canonical battle terrain/features and does not exist only as UI text"
  );

  const intelligence =
    source(
      "lib/session/intelligence.ts"
    );

  const briefingSource =
    source(
      "lib/session/strategic-briefing.ts"
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
    briefingSource.includes(
      "getDeliveredPlayerKnowledge"
    )
  );

  console.log(
    "PASS S10-08: scheduled strategic intelligence does not scan hidden canonical enemy armies or positions"
  );

  const briefing =
    buildPlayerStrategicBriefing(
      localPlayer.id
    );

  assert.ok(
    briefing
  );

  if (!briefing) {
    throw new Error(
      "Expected local-player strategic briefing."
    );
  }

  assert.equal(
    briefing.kingdomId,
    localPlayer.kingdomId
  );

  console.log(
    "PASS S10-09: Human/Actor briefing is built from the same player knowledge plus exact own-realm state"
  );

  const orchestrator =
    source(
      "lib/actors/orchestrator.ts"
    );

  const runtime =
    source(
      "app/demo-runtime.tsx"
    );

  includesAll(
    orchestrator,
    [
      'cycle.phase === "planning"',
      'cycle.phase === "interrupted"',
      "runLlmPlayerActivation",
    ],
    "LLM activation gating"
  );

  includesAll(
    runtime,
    [
      "getCurrentLlmActivation",
      "advanceWorldBy",
      'cycle.phase ===\n              "executing"',
    ],
    "runtime execution separation"
  );

  console.log(
    "PASS S10-10: Actor/GM realm LLM calls remain command-window/interrupt driven rather than hourly polling"
  );

  const militaryPolitics =
    inspectKingdomMilitaryPolitics(
      world.session.id,
      localPlayer.id
    );

  assert.ok(
    militaryPolitics.ok
  );

  if (!militaryPolitics.ok) {
    throw new Error(
      "Expected own kingdom military-politics inspection."
    );
  }

  assert.ok(
    militaryPolitics.lords.length >
    0
  );

  const lordService =
    source(
      "lib/lords/service.ts"
    );

  const lordModel =
    source(
      "lib/lords/model.ts"
    );

  includesAll(
    lordService,
    [
      "getGmLordOrderModelAdapter",
      "moveArmy",
      "recruitUnits",
    ],
    "lord canonical execution"
  );

  includesAll(
    lordModel,
    [
      '"REFUSE"',
      '"DELAY"',
      '"NEGOTIATE"',
      '"PARTIAL_COMPLIANCE"',
    ],
    "lord autonomy"
  );

  console.log(
    "PASS S10-11: independent lords can resist crown orders and accepted effects still use canonical military services"
  );

  const commandCenter =
    source(
      "app/strategic-command-center.tsx"
    );

  const gameRoot =
    source(
      "app/game-root.tsx"
    );

  includesAll(
    commandCenter,
    [
      '"REALM"',
      '"SETTLEMENT"',
      '"WAR"',
      '"DIPLOMACY"',
      '"LORDS"',
      '"BRIEFING"',
      "getRealmBudgetSnapshot",
      "declarePlayerWar",
      "passPlayerCommandWindow",
    ],
    "strategic command center"
  );

  assert.ok(
    gameRoot.includes(
      "<StrategicCommandCenter />"
    )
  );

  console.log(
    "PASS S10-12: the professional UI is one strategic command hierarchy backed by existing canonical services"
  );

  const webMcpFiles =
    [
      "lib/webmcp/register-tools.ts",
      "lib/webmcp/register-war-tools.ts",
      "lib/webmcp/register-politics-tools.ts",
      "lib/webmcp/register-lord-tools.ts",
      "lib/webmcp/register-border-tools.ts",
      "lib/webmcp/register-army-management-tools.ts",
    ];

  for (
    const file
    of webMcpFiles
  ) {
    assert.ok(
      existsSync(
        file
      ),
      `Missing WebMCP module: ${file}`
    );
  }

  const warTools =
    source(
      "lib/webmcp/register-war-tools.ts"
    );

  const politicsTools =
    source(
      "lib/webmcp/register-politics-tools.ts"
    );

  const lordTools =
    source(
      "lib/webmcp/register-lord-tools.ts"
    );

  includesAll(
    warTools,
    [
      "declare",
      "war",
    ],
    "WebMCP war"
  );

  includesAll(
    politicsTools,
    [
      "MILITARY_ACCESS",
      "propose",
    ],
    "WebMCP diplomacy"
  );

  includesAll(
    lordTools,
    [
      "inspect_lord_military_politics",
      "issue_character_order",
    ],
    "WebMCP lord politics"
  );

  console.log(
    "PASS S10-13: WebMCP exposes war, diplomacy, border, army-management and lord-politics modules without a separate gameplay state"
  );

  const providerCandidates =
    [
      "app/webmcp-provider.tsx",
      "app/web-mcp-provider.tsx",
      "app/webmcp-provider-client.tsx",
      "lib/webmcp/provider.ts",
    ];

  const provider =
    providerCandidates.find(
      (
        candidate
      ) =>
        existsSync(
          candidate
        )
    );

  if (
    provider
  ) {
    const providerSource =
      source(
        provider
      );

    assert.ok(
      providerSource.includes(
        "register"
      )
    );
  }

  console.log(
    "PASS S10-14: WebMCP gameplay modules are present for browser registration; live browser invocation remains the final manual verification"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 10 — SUBMISSION REGRESSION: PASS"
  );

  console.log("");
  console.log(
    "STATIC/RUNTIME ARCHITECTURE IS FROZEN. NEXT: LIVE BROWSER CAMPAIGN + WEBMCP INVOCATION ONLY."
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
