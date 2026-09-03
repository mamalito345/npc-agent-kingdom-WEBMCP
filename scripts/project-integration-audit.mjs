import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";

import {
  join,
  relative,
} from "node:path";

function read(path) {
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, "utf8");
}

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) {
    return out;
  }

  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full.replaceAll("\\", "/"));
    }
  }

  return out;
}

function status(ok, label, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

function warn(label, detail = "") {
  console.log(`WARN ${label}${detail ? ` — ${detail}` : ""}`);
}

function section(title) {
  console.log("");
  console.log("=".repeat(78));
  console.log(title);
  console.log("=".repeat(78));
}

let failures = 0;
let warnings = 0;

function check(ok, label, detail = "") {
  if (!status(ok, label, detail)) {
    failures += 1;
  }
}

function warning(label, detail = "") {
  warnings += 1;
  warn(label, detail);
}

section("A. STEP 1 PARTIAL MIGRATION STATE");

const step1Checks = [
  ["lib/economy/realm-budget.ts", "getRealmBudgetSnapshot"],
  ["lib/politics/war.ts", "declareWar"],
  ["lib/military/army-queries.ts", "getArmyCampaignCostMultiplier"],
  ["lib/webmcp/identity-guard.ts", "stripIdentityFromInputSchema"],
  ["app/realm-command-panel.tsx", "Realm Command"],
  ["lib/session/player-actions.ts", "declarePlayerWar"],
  ["lib/session/observation.ts", "getRealmBudgetSnapshot"],
  ["types/actors.ts", '"declare_war"'],
  ["lib/actors/tool-executor.ts", 'case "declare_war":'],
  ["lib/webmcp/register-tools.ts", '"declare_war"'],
  ["app/game-root.tsx", "<RealmCommandPanel />"],
];

for (const [path, needle] of step1Checks) {
  const text = read(path);
  check(
    Boolean(text && text.includes(needle)),
    path,
    needle
  );
}

section("B. EXACT CURRENT STEP-1 SMOKE FAILURE");

const stepSmoke = read("scripts/professional-gameplay-step-1-smoke.ts");
const coreRegister = read("lib/webmcp/register-tools.ts");

check(
  Boolean(stepSmoke),
  "professional-gameplay-step-1-smoke.ts exists"
);

if (stepSmoke) {
  const lines = stepSmoke.split(/\r?\n/);
  const line130 = lines[129] ?? "";
  console.log(`INFO smoke line 130: ${line130.trim()}`);

  if (
    line130.includes("assert.ok") &&
    coreRegister &&
    !coreRegister.includes('"declare_war"')
  ) {
    warning(
      "P1-03 failure explained",
      'lib/webmcp/register-tools.ts still lacks "declare_war"'
    );
  }
}

section("C. WEBMCP REGISTRATION TOPOLOGY");

const webmcpFiles = walk("lib/webmcp")
  .filter((path) => /register-.*\.ts$/.test(path))
  .sort();

console.log(`INFO register modules: ${webmcpFiles.length}`);

const toolToFiles = new Map();

for (const path of webmcpFiles) {
  const text = read(path) ?? "";
  const usesFacade =
    text.includes("getIdentityBoundWebMcpModelContext");

  check(
    usesFacade,
    `${path} uses identity-bound facade`
  );

  const names = [
    ...text.matchAll(
      /name:\s*(?:\r?\n\s*)?"([^"]+)"/g
    ),
  ].map((m) => m[1]);

  console.log(
    `INFO ${path}: ${names.length} tool names`
  );

  for (const name of names) {
    const arr = toolToFiles.get(name) ?? [];
    arr.push(path);
    toolToFiles.set(name, arr);
  }
}

for (const [tool, files] of [...toolToFiles.entries()].sort()) {
  if (files.length > 1) {
    warning(
      `duplicate WebMCP tool name: ${tool}`,
      files.join(", ")
    );
  }
}

const provider = read("app/webmcp-provider.tsx") ?? "";

for (const path of webmcpFiles) {
  const base = path.split("/").pop();
  if (base === "register-tools.ts") {
    check(
      provider.includes("registerWebMCPTools"),
      "provider mounts core WebMCP registration"
    );
    continue;
  }

  const exportedFns = [
    ...(read(path) ?? "").matchAll(
      /export (?:async )?function ([A-Za-z0-9_]+)\(/g
    ),
  ].map((m) => m[1]);

  const registerFn =
    exportedFns.find(
      (name) =>
        name.startsWith("register") &&
        name.includes("WebMCP")
    );

  if (registerFn) {
    check(
      provider.includes(registerFn),
      `provider mounts ${registerFn}`
    );
  }
}

section("D. ACTOR / GM / WEBMCP TOOL PARITY");

const actorTypes = read("types/actors.ts") ?? "";
const executor = read("lib/actors/tool-executor.ts") ?? "";

const actorToolNames = [
  ...actorTypes.matchAll(
    /\|\s+"([^"]+)"/g
  ),
].map((m) => m[1]);

const executorCases = [
  ...executor.matchAll(
    /case\s+"([^"]+)":/g
  ),
].map((m) => m[1]);

const webmcpToolNames =
  new Set(toolToFiles.keys());

const actionLike = actorToolNames.filter(
  (name) =>
    !name.startsWith("inspect_") &&
    name !== "convene_council"
);

for (const tool of actorToolNames) {
  check(
    executorCases.includes(tool),
    `Actor executor handles ${tool}`
  );
}

for (const tool of actionLike) {
  if (!webmcpToolNames.has(tool)) {
    warning(
      `Actor action not exposed through WebMCP: ${tool}`
    );
  }
}

check(
  actorToolNames.includes("declare_war"),
  "Actor type includes declare_war"
);

check(
  executorCases.includes("declare_war"),
  "Actor/GM executor handles declare_war"
);

check(
  webmcpToolNames.has("declare_war"),
  "WebMCP exposes declare_war"
);

section("E. ZERO-ID WEBMCP CONTRACT");

const identity = read("lib/webmcp/identity-guard.ts") ?? "";

check(
  identity.includes("stripIdentityFromInputSchema"),
  "identity facade strips identity fields from public schemas"
);

check(
  identity.includes("mergeBoundIdentity"),
  "identity facade injects bound identity at execute time"
);

check(
  !identity.includes("Object.defineProperty"),
  "identity facade does not monkey-patch host registerTool"
);

for (const path of webmcpFiles) {
  const text = read(path) ?? "";

  if (
    text.includes("document.modelContext") &&
    !text.includes("getIdentityBoundWebMcpModelContext")
  ) {
    warning(
      `${path} touches document.modelContext directly`
    );
  }
}

section("F. CLOCK / COMMAND CYCLE");

const runtime = read("app/demo-runtime.tsx") ?? "";
const commandCycle = read("lib/session/command-cycle.ts") ?? "";
const sim = read("lib/world/simulation.ts") ?? "";
const config = read("lib/demo/config.ts") ?? "";

check(
  runtime.includes("advanceWorldBy") &&
  runtime.includes("60"),
  "DemoRuntime advances execution by 60 minutes"
);

check(
  runtime.includes('cycle.phase ===') &&
  runtime.includes('"executing"'),
  "DemoRuntime only advances during executing phase"
);

check(
  runtime.includes("world.simulation") &&
  runtime.includes("paused"),
  "DemoRuntime respects canonical pause state"
);

check(
  commandCycle.includes('phase:\n            "executing"') ||
  commandCycle.includes('phase: "executing"'),
  "passCommandWindow can enter executing phase"
);

check(
  sim.includes("processDailyBoundary") &&
  sim.includes("processCourierArrivals") &&
  sim.includes("processBattlePhases"),
  "world simulation advances economy/couriers/battle"
);

check(
  config.includes("running: true"),
  "game setup can start runtime"
);

section("G. ECONOMY CONTRACT");

const daily = read("lib/world/processors/daily-boundary.ts") ?? "";
const militaryDaily = read("lib/military/daily.ts") ?? "";
const production = read("lib/economy/production.ts") ?? "";
const trade = read("lib/economy/trade.ts") ?? "";
const development = read("lib/economy/development.ts") ?? "";
const budget = read("lib/economy/realm-budget.ts") ?? "";

check(
  daily.includes("processDailySettlementProduction") &&
  daily.includes("processDailyTradeIncome") &&
  daily.includes("processDailyMilitaryEconomy"),
  "daily boundary connects production + trade + army expenses"
);

check(
  militaryDaily.includes("getArmyDailyCosts"),
  "military daily uses shared army daily cost query"
);

check(
  production.includes("dailyProduction"),
  "settlement production exists"
);

check(
  trade.includes("getKingdomDailyTradeIncome"),
  "kingdom trade income exists"
);

check(
  development.includes("INSUFFICIENT_RESOURCES"),
  "settlement development spends real resources"
);

check(
  budget.includes("recommendedReserveGold") &&
  budget.includes("spendableGold") &&
  budget.includes("projectedDailyNetGold"),
  "realm budget exposes reserve/spendable/net forecast"
);

section("H. WAR CONTRACT");

const war = read("lib/politics/war.ts") ?? "";
const playerActions = read("lib/session/player-actions.ts") ?? "";

check(
  war.includes("areKingdomsAtWar") &&
  war.includes("declareWar"),
  "canonical war service exists"
);

check(
  playerActions.includes("declarePlayerWar") &&
  playerActions.includes("validatePlayerCommandAccess"),
  "player war declaration is command-authorized"
);

if (
  war.includes("reason") &&
  !read("types/military.ts")?.includes("reason")
) {
  warning(
    "War reason may be returned but not persisted on War type",
    "acceptable for Step 1, but should be normalized before diplomacy expansion"
  );
}

section("I. SMOKE SUITE HEALTH / BRITTLENESS");

const smokeFiles = walk("scripts")
  .filter((path) =>
    /smoke\.(ts|mjs)$/.test(path)
  )
  .sort();

console.log(`INFO smoke files: ${smokeFiles.length}`);

let staticSubstringSmokes = 0;

for (const path of smokeFiles) {
  const text = read(path) ?? "";

  const staticIncludesCount =
    (
      text.match(
        /\.includes\(/g
      ) ?? []
    ).length;

  if (staticIncludesCount >= 2) {
    staticSubstringSmokes += 1;
  }
}

console.log(
  `INFO static substring-heavy smokes: ${staticSubstringSmokes}`
);

const armyInspectorSmoke =
  read("scripts/army-inspector-side-panel-smoke.ts");

const opPanel =
  read("app/operational-panel.tsx");

if (
  armyInspectorSmoke &&
  opPanel
) {
  const assumptions = [
    "!selectedArmy &&",
    "!selectedSettlement",
    "return null;",
    'right-4 top-[88px]',
    "selectMapArmy(null)",
    "selectMapSettlement(null)",
    "Army Inspector",
  ];

  for (const assumption of assumptions) {
    const present =
      opPanel.includes(
        assumption
      );

    if (!present) {
      warning(
        `army-inspector smoke stale assumption`,
        assumption
      );
    }
  }

  if (
    opPanel.includes(
      "clearMapSelection()"
    ) &&
    (
      !opPanel.includes(
        "selectMapArmy(null)"
      ) ||
      !opPanel.includes(
        "selectMapSettlement(null)"
      )
    )
  ) {
    warning(
      "army-inspector smoke likely stale",
      "UI now closes via clearMapSelection(), but old smoke expects two implementation-specific calls"
    );
  }
}

section("J. MIGRATION SCRIPT BRITTLENESS");

const migrationFiles = walk("scripts")
  .filter(
    (path) =>
      path.includes("apply-") &&
      path.endsWith(".mjs")
  )
  .sort();

for (const path of migrationFiles) {
  const text =
    read(path) ?? "";

  const anchorChecks =
    (
      text.match(
        /ANCHOR_NOT_FOUND|includes\(anchor\)|replace\(\s*anchor/g
      ) ?? []
    ).length;

  if (anchorChecks > 0) {
    warning(
      `${path} uses exact textual anchors`,
      "safe for one known source snapshot, brittle after later packages"
    );
  }
}

section("SUMMARY");

console.log(`FAILURES: ${failures}`);
console.log(`WARNINGS: ${warnings}`);

if (failures === 0) {
  console.log(
    "AUDIT STATUS: STRUCTURAL PASS (review warnings before next package)"
  );
} else {
  console.log(
    "AUDIT STATUS: INTEGRATION FAIL — do not start Step 2 yet"
  );
}

process.exitCode =
  failures === 0 ? 0 : 1;
