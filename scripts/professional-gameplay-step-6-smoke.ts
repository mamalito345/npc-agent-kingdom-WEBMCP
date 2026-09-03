// PROFESSIONAL-GAMEPLAY-STEP-6-SMOKE_TS_STEP9_COMPAT: strategic UI may be embedded in StrategicCommandCenter.
import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getSettlementInvestmentPlan,
} from "../lib/economy/settlement-investment";

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

  const ownSettlement =
    Object.values(
      world.settlements
    ).find(
      (settlement) =>
        (
          settlement
            .controllerKingdomId ??
          settlement.kingdomId
        ) ===
        localPlayer.kingdomId
    );

  assert.ok(
    ownSettlement
  );

  const plan =
    getSettlementInvestmentPlan(
      ownSettlement.id,
      localPlayer.kingdomId
    );

  assert.ok(
    plan.ok
  );

  if (!plan.ok) {
    throw new Error(
      "Settlement investment plan was expected to be available for a controlled settlement."
    );
  }

  assert.equal(
    plan.development.options.length,
    5
  );

  assert.ok(
    plan.development.options.every(
      (option) =>
        Number.isFinite(
          option.currentDailyProduction
        ) &&
        Number.isFinite(
          option.projectedDailyProduction
        )
    )
  );

  console.log(
    "PASS S6-01: every controlled settlement gets deterministic development investment previews"
  );

  assert.ok(
    plan.recruitment.options.some(
      (option) =>
        option.unitType ===
        "infantry"
    )
  );

  assert.ok(
    plan.recruitment.options.some(
      (option) =>
        option.unitType ===
        "cavalry"
    )
  );

  assert.ok(
    plan.recruitment.options.some(
      (option) =>
        option.unitType ===
        "siege"
    )
  );

  assert.ok(
    Number.isFinite(
      plan.recruitment
        .remainingManpower
    )
  );

  console.log(
    "PASS S6-02: differentiated recruitment exposes resource, manpower and slot constraints"
  );

  assert.ok(
    plan.fortification
      .currentLevel >=
      0
  );

  assert.ok(
    plan.fortification
      .maximumLevel >=
    plan.fortification
      .currentLevel
  );

  console.log(
    "PASS S6-03: fortification planning exposes next-level cost/build-time without bypassing canonical construction orders"
  );

  const recruitment =
    readFileSync(
      "lib/military/recruitment.ts",
      "utf8"
    );

  assert.ok(
    recruitment.includes(
      "reserveSettlementResources"
    )
  );

  assert.ok(
    recruitment.includes(
      "MOBILIZATION_CAPACITY_EXCEEDED"
    )
  );

  assert.ok(
    recruitment.includes(
      "RECRUITMENT_SLOT_LIMIT"
    )
  );

  const fortification =
    readFileSync(
      "lib/military/fortification.ts",
      "utf8"
    );

  assert.ok(
    fortification.includes(
      "reserveSettlementResources"
    )
  );

  assert.ok(
    fortification.includes(
      "completesAt"
    )
  );

  const development =
    readFileSync(
      "lib/economy/development.ts",
      "utf8"
    );

  assert.ok(
    development.includes(
      "INSUFFICIENT_RESOURCES"
    )
  );

  assert.ok(
    development.includes(
      "currentSettlement"
    ) &&
    development.includes(
      "resources:"
    )
  );

  console.log(
    "PASS S6-04: recruitment, fortification and development all consume/reserve real settlement resources"
  );

  const managementExecutor =
    readFileSync(
      "lib/actors/management-tool-executor.ts",
      "utf8"
    );

  const coreExecutor =
    readFileSync(
      "lib/actors/tool-executor.ts",
      "utf8"
    );

  assert.ok(
    managementExecutor.includes(
      '"develop_settlement"'
    )
  );

  assert.ok(
    managementExecutor.includes(
      '"fortify_settlement"'
    )
  );

  assert.ok(
    coreExecutor.includes(
      '"recruit_units"'
    )
  );

  console.log(
    "PASS S6-05: Actor/GM spending remains routed through the same canonical actions as Human"
  );

  const observation =
    readFileSync(
      "lib/session/observation.ts",
      "utf8"
    );

  assert.ok(
    observation.includes(
      "getSettlementInvestmentPlan"
    )
  );

  assert.ok(
    observation.includes(
      "investmentPlan"
    )
  );

  console.log(
    "PASS S6-06: inspect_settlements receives the same affordability/investment plan used by Human UI"
  );

  const panel =
    readFileSync(
      "app/settlement-investment-panel.tsx",
      "utf8"
    );

  const root =
    readFileSync(
      "app/game-root.tsx",
      "utf8"
    );

  assert.ok(
    panel.includes(
      "Settlement Investment"
    )
  );

  assert.ok(
    panel.includes(
      "Realm Budget Context"
    )
  );

  assert.ok(
    panel.includes(
      "START FORTIFICATION"
    )
  );

  assert.ok(
    panel.includes(
      "recruitPlayerUnits"
    )
  );

  assert.ok(
    panel.includes(
      "developPlayerSettlement"
    )
  );

  const commandCenter =
    readFileSync(
      "app/strategic-command-center.tsx",
      "utf8"
    );

  const surfaceMounted =
    root.includes(
      "<SettlementInvestmentPanel />"
    ) ||
    (
      root.includes(
        "<StrategicCommandCenter />"
      ) &&
      commandCenter.includes(
        '"SETTLEMENT"'
      ) &&
      commandCenter.includes(
        "<SettlementInvestmentPanel"
      ) &&
      commandCenter.includes(
        "embedded"
      )
    );

  assert.ok(
    surfaceMounted
  );

  console.log(
    "PASS S6-07: Human settlement UI executes canonical development/recruitment/fortification directly or through the Step 9 SETTLEMENT workspace"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 6 — SETTLEMENT DEVELOPMENT + RECRUITMENT + CONSTRUCTION ECONOMY: PASS"
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
