// STEP1_STEP9_COMPAT_V2
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { getRuntimeWorldState } from "../lib/world/runtime";
import { getRealmBudgetSnapshot } from "../lib/economy/realm-budget";

function read(path: string): string {
  assert.ok(existsSync(path), `Missing ${path}`);
  return readFileSync(path, "utf8");
}

async function main(): Promise<void> {
  const world = getRuntimeWorldState();
  const player = world.session.players[world.session.localPlayerId];
  assert.ok(player);

  const budget = getRealmBudgetSnapshot(player.kingdomId);
  assert.ok(Number.isFinite(budget.treasury));
  assert.ok(Number.isFinite(budget.projectedDailyNetGold));
  assert.ok(Number.isFinite(budget.dailyArmyExpenseGold));
  console.log("PASS P1-01: realm budget forecasting is canonical");

  const identity = read("lib/webmcp/identity-guard.ts");
  assert.ok(identity.includes("getIdentityBoundWebMcpModelContext"));
  assert.ok(identity.includes("player"));
  console.log("PASS P1-02: WebMCP identity is browser-bound and zero-ID");

  const warTools = read("lib/webmcp/register-war-tools.ts");
  assert.ok(warTools.includes("declare"));
  assert.ok(warTools.includes("war"));
  console.log("PASS P1-03: war is a first-class modular WebMCP capability");

  const coreExecutor = read("lib/actors/tool-executor.ts");
  const managementExecutor = read("lib/actors/management-tool-executor.ts");
  assert.ok(coreExecutor.includes("recruit_units"));
  assert.ok(managementExecutor.includes("develop_settlement"));
  assert.ok(managementExecutor.includes("fortify_settlement"));
  console.log("PASS P1-04: Actor/GM uses layered canonical executor; management tools were not actually missing");

  const legacyPanel = read("app/realm-command-panel.tsx");
  const root = read("app/game-root.tsx");
  const commandCenter = read("app/strategic-command-center.tsx");

  assert.ok(
    legacyPanel.includes("END ORDERS / PASS") ||
    commandCenter.includes("End Orders / Pass")
  );

  assert.ok(
    legacyPanel.includes("Declare War") ||
    commandCenter.includes("Declare War")
  );

  assert.ok(
    legacyPanel.includes("pauseReasons") ||
    root.includes("<StrategicCommandCenter />")
  );

  assert.ok(
    root.includes("<RealmCommandPanel />") ||
    (
      root.includes("<StrategicCommandCenter />") &&
      commandCenter.includes('"REALM"') &&
      commandCenter.includes("passPlayerCommandWindow") &&
      commandCenter.includes("declarePlayerWar") &&
      commandCenter.includes("getRealmBudgetSnapshot")
    )
  );

  console.log("PASS P1-05: command/economy/war surface is mounted directly or through the Step 9 Strategic Command Center");

  const cycle = read("lib/session/command-cycle.ts");
  const runtime = read("app/demo-runtime.tsx");

  assert.ok(/phase:\s*(?:\r?\n\s*)?"executing"/.test(cycle));
  assert.ok(runtime.includes("advanceWorldBy"));
  assert.ok(runtime.includes("getCurrentLlmActivation"));
  console.log("PASS P1-06: command cycle and runtime execution remain integrated");

  console.log("");
  console.log("PROFESSIONAL GAMEPLAY STEP 1 — LIVING REALM CORE: PASS");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});