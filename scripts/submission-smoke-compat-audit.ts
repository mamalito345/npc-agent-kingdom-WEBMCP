import assert from "node:assert/strict";

import {
  existsSync,
  readFileSync,
} from "node:fs";

const checks = [
  {
    file: "scripts/professional-gameplay-step-1-smoke.ts",
    oldOnly: 'root.includes(\n      "<RealmCommandPanel />"\n    )\n  );',
    required: "StrategicCommandCenter",
  },
  {
    file: "scripts/professional-gameplay-step-3-smoke.ts",
    oldOnly: 'root.includes(\n      "<WarIntelligencePanel />"\n    )\n  );',
    required: "StrategicCommandCenter",
  },
  {
    file: "scripts/professional-gameplay-step-5-smoke.ts",
    oldOnly: 'root.includes(\n      "<DiplomaticLawPanel />"\n    )\n  );',
    required: "StrategicCommandCenter",
  },
  {
    file: "scripts/professional-gameplay-step-6-smoke.ts",
    oldOnly: 'root.includes(\n      "<SettlementInvestmentPanel />"\n    )\n  );',
    required: "StrategicCommandCenter",
  },
  {
    file: "scripts/professional-gameplay-step-7-smoke.ts",
    oldOnly: 'root.includes(\n      "<LordMilitaryPoliticsPanel />"\n    )\n  );',
    required: "StrategicCommandCenter",
  },
  {
    file: "scripts/professional-gameplay-step-8-smoke.ts",
    oldOnly: 'root.includes(\n      "<StrategicBriefingPanel />"\n    )\n  );',
    required: "StrategicCommandCenter",
  },
];

for (const check of checks) {
  assert.ok(
    existsSync(check.file),
    `Missing historical smoke: ${check.file}`
  );

  const text =
    readFileSync(
      check.file,
      "utf8"
    );

  assert.ok(
    text.includes(
      check.required
    ),
    `${check.file} is still pre-Step-9 and has no StrategicCommandCenter compatibility path`
  );

  /*
   * Direct mount support may remain as the left side of an OR expression.
   * What is forbidden is the old single-path assertion with no command-center
   * compatibility anywhere in the file.
   */
}

console.log(
  "PASS COMPAT-01: Step 1/3/5/6/7/8 historical smokes understand the Step 9 Strategic Command Center topology"
);

const root =
  readFileSync(
    "app/game-root.tsx",
    "utf8"
  );

const center =
  readFileSync(
    "app/strategic-command-center.tsx",
    "utf8"
  );

assert.ok(
  root.includes(
    "<StrategicCommandCenter />"
  )
);

for (
  const required
  of [
    '"REALM"',
    '"SETTLEMENT"',
    '"WAR"',
    '"DIPLOMACY"',
    '"LORDS"',
    '"BRIEFING"',
    "<SettlementInvestmentPanel",
    "<WarIntelligencePanel",
    "<DiplomaticLawPanel",
    "<LordMilitaryPoliticsPanel",
    "<StrategicBriefingPanel",
  ]
) {
  assert.ok(
    center.includes(
      required
    ),
    `StrategicCommandCenter missing ${required}`
  );
}

console.log(
  "PASS COMPAT-02: current Step 9 command center contains all strategic workspaces and embedded domain surfaces"
);

console.log("");
console.log(
  "SUBMISSION SMOKE COMPATIBILITY AUDIT: PASS"
);
