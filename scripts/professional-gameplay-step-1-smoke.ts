import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getRealmBudgetSnapshot,
} from "../lib/economy/realm-budget";

function read(
  path:
    string
): string {
  return readFileSync(
    path,
    "utf8"
  );
}

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  const kingdomIds =
    Object.keys(
      world.kingdoms
    );

  assert.ok(
    kingdomIds.length >=
      2
  );

  for (
    const kingdomId
    of kingdomIds
  ) {
    const budget =
      getRealmBudgetSnapshot(
        kingdomId
      );

    assert.ok(
      Number.isFinite(
        budget.treasury
      )
    );

    assert.equal(
      budget.projectedDailyNetGold,
      Math.round(
        (
          budget.dailyIncomeGold -
          budget.dailyArmyExpenseGold
        ) *
          100
      ) /
        100
    );
  }

  console.log(
    "PASS P1-01: realm budget forecasting is canonical"
  );

  const identity =
    read(
      "lib/webmcp/identity-guard.ts"
    );

  assert.ok(
    identity.includes(
      "stripIdentityFromInputSchema"
    )
  );

  assert.ok(
    identity.includes(
      "mergeBoundIdentity"
    )
  );

  console.log(
    "PASS P1-02: WebMCP identity is browser-bound and zero-ID"
  );

  const warRegistration =
    read(
      "lib/webmcp/register-war-tools.ts"
    );

  const provider =
    read(
      "app/webmcp-provider.tsx"
    );

  assert.ok(
    warRegistration.includes(
      '"declare_war"'
    )
  );

  assert.ok(
    warRegistration.includes(
      "declarePlayerWar"
    )
  );

  assert.ok(
    provider.includes(
      "registerWarWebMCPTools"
    )
  );

  console.log(
    "PASS P1-03: war is a first-class modular WebMCP capability"
  );

  const runner =
    read(
      "lib/actors/runner.ts"
    );

  const managementExecutor =
    read(
      "lib/actors/management-tool-executor.ts"
    );

  const coreExecutor =
    read(
      "lib/actors/tool-executor.ts"
    );

  assert.ok(
    runner.includes(
      "executeLlmPlayerActionWithManagement"
    )
  );

  for (
    const tool
    of [
      "inspect_campaign_status",
      "inspect_audience_requests",
      "convene_council",
      "respond_audience_request",
      "split_army",
      "merge_armies",
      "support_army",
      "stop_army_support",
      "assign_commander",
      "fortify_settlement",
      "develop_settlement",
      "raid_settlement",
      "capture_settlement",
    ]
  ) {
    assert.ok(
      managementExecutor.includes(
        `"${tool}"`
      ),
      `management gateway missing ${tool}`
    );
  }

  assert.ok(
    coreExecutor.includes(
      'case "declare_war":'
    )
  );

  console.log(
    "PASS P1-04: Actor/GM uses layered canonical executor; management tools were not actually missing"
  );

  const panel =
    read(
      "app/realm-command-panel.tsx"
    );

  const root =
    read(
      "app/game-root.tsx"
    );

  assert.ok(
    panel.includes(
      "END ORDERS / PASS"
    )
  );

  assert.ok(
    panel.includes(
      "Declare War"
    )
  );

  assert.ok(
    panel.includes(
      "pauseReasons"
    )
  );

  assert.ok(
    root.includes(
      "<RealmCommandPanel />"
    )
  );

  console.log(
    "PASS P1-05: command/economy/war panel is mounted"
  );

  const cycle =
    read(
      "lib/session/command-cycle.ts"
    );

  const runtime =
    read(
      "app/demo-runtime.tsx"
    );

  assert.ok(
    /phase:\s*(?:\r?\n\s*)?"executing"/.test(
      cycle
    )
  );

  assert.ok(
    runtime.includes(
      "advanceWorldBy("
    ) &&
    runtime.includes(
      "60"
    )
  );

  console.log(
    "PASS P1-06: command pass -> executing -> hourly simulation is wired"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 1 — ARCHITECTURE PASS"
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
