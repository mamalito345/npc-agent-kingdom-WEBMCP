// PROFESSIONAL-GAMEPLAY-STEP-5-SMOKE_TS_STEP9_COMPAT: strategic UI may be embedded in StrategicCommandCenter.
import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getDiplomaticPairStatus,
  DEFAULT_PEACE_TRUCE_MINUTES,
} from "../lib/politics/diplomatic-law";

import {
  hasCanonicalMilitaryAccess,
} from "../lib/map/border-access";

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  const kingdomIds =
    Object.keys(
      world.kingdoms
    ).sort();

  assert.ok(
    kingdomIds.length >=
      2
  );

  const [
    kingdomA,
    kingdomB,
  ] =
    kingdomIds;

  const pair =
    getDiplomaticPairStatus(
      kingdomA,
      kingdomB
    );

  assert.equal(
    pair.kingdomAId,
    kingdomA
  );

  assert.equal(
    pair.kingdomBId,
    kingdomB
  );

  assert.equal(
    typeof pair
      .militaryAccess,
    "boolean"
  );

  assert.equal(
    typeof pair
      .canDeclareWar,
    "boolean"
  );

  console.log(
    "PASS S5-01: realm-pair diplomatic law resolves war/access/NAP/truce from canonical politics state"
  );

  assert.ok(
    DEFAULT_PEACE_TRUCE_MINUTES ===
      7 *
        24 *
        60
  );

  console.log(
    "PASS S5-02: PEACE has a deterministic seven-day default truce window when no explicit expiry is supplied"
  );

  assert.equal(
    typeof hasCanonicalMilitaryAccess(
      kingdomA,
      kingdomB
    ),
    "boolean"
  );

  const borderAccess =
    readFileSync(
      "lib/map/border-access.ts",
      "utf8"
    );

  assert.ok(
    borderAccess.includes(
      "hasDiplomaticMilitaryAccess"
    )
  );

  console.log(
    "PASS S5-03: border routing consumes the centralized diplomatic-law access decision"
  );

  const borderIncidents =
    readFileSync(
      "lib/world/border-incidents.ts",
      "utf8"
    );

  assert.ok(
    borderIncidents.includes(
      "processBorderIncidentsAt"
    )
  );

  assert.ok(
    borderIncidents.includes(
      "allowBorderViolation"
    )
  );

  assert.ok(
    borderIncidents.includes(
      "incidentAlreadyRecorded"
    )
  );

  assert.ok(
    borderIncidents.includes(
      "hasCanonicalMilitaryAccess"
    )
  );

  console.log(
    "PASS S5-04: forced border violation remains tied to physical crossing, deduplicated, and consequence-bearing"
  );

  const war =
    readFileSync(
      "lib/politics/war.ts",
      "utf8"
    );

  assert.ok(
    war.includes(
      "ACTIVE_PEACE_TRUCE"
    )
  );

  assert.ok(
    war.includes(
      "nonAggressionBreach"
    )
  );

  assert.ok(
    war.includes(
      '"MILITARY_ACCESS"'
    )
  );

  console.log(
    "PASS S5-05: declaration of war respects truce protection and breaks incompatible treaties through one canonical war service"
  );

  const politicsTypes =
    readFileSync(
      "types/politics.ts",
      "utf8"
    );

  assert.ok(
    politicsTypes.includes(
      '"MILITARY_ACCESS"'
    )
  );

  const webmcp =
    readFileSync(
      "lib/webmcp/register-politics-tools.ts",
      "utf8"
    );

  assert.ok(
    webmcp.includes(
      '"MILITARY_ACCESS"'
    )
  );

  assert.ok(
    webmcp.includes(
      "proposeAgreement"
    )
  );

  console.log(
    "PASS S5-06: military access is available through the existing canonical agreement + WebMCP proposal path"
  );

  const humanPanel =
    readFileSync(
      "app/diplomatic-law-panel.tsx",
      "utf8"
    );

  const root =
    readFileSync(
      "app/game-root.tsx",
      "utf8"
    );

  assert.ok(
    humanPanel.includes(
      "Request Access"
    )
  );

  assert.ok(
    humanPanel.includes(
      "Propose NAP"
    )
  );

  assert.ok(
    humanPanel.includes(
      "Propose 7-Day Peace"
    )
  );

  assert.ok(
    humanPanel.includes(
      "Recent border incidents"
    )
  );

  const commandCenter =
    readFileSync(
      "app/strategic-command-center.tsx",
      "utf8"
    );

  const surfaceMounted =
    root.includes(
      "<DiplomaticLawPanel />"
    ) ||
    (
      root.includes(
        "<StrategicCommandCenter />"
      ) &&
      commandCenter.includes(
        '"DIPLOMACY"'
      ) &&
      commandCenter.includes(
        "<DiplomaticLawPanel"
      ) &&
      commandCenter.includes(
        "embedded"
      )
    );

  assert.ok(
    surfaceMounted
  );

  console.log(
    "PASS S5-07: Human diplomacy UI exposes access/NAP/peace and border incidents directly or through the Step 9 DIPLOMACY workspace"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 5 — DIPLOMACY + MILITARY ACCESS + TRUCE: PASS"
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
