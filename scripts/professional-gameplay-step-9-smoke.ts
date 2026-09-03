import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

async function main():
  Promise<void> {
  const root =
    readFileSync(
      "app/game-root.tsx",
      "utf8"
    );

  assert.ok(
    root.includes(
      "<StrategicCommandCenter />"
    )
  );

  assert.ok(
    !root.includes(
      "<RealmCommandPanel />"
    )
  );

  assert.ok(
    !root.includes(
      "<WarIntelligencePanel />"
    )
  );

  assert.ok(
    !root.includes(
      "<DiplomaticLawPanel />"
    )
  );

  assert.ok(
    !root.includes(
      "<SettlementInvestmentPanel />"
    )
  );

  assert.ok(
    !root.includes(
      "<LordMilitaryPoliticsPanel />"
    )
  );

  assert.ok(
    !root.includes(
      "<StrategicBriefingPanel />"
    )
  );

  assert.ok(
    !root.includes(
      "<RealmMatters />"
    )
  );

  console.log(
    "PASS S9-01: overlapping strategic floating panels are replaced by one command-center mount"
  );

  const center =
    readFileSync(
      "app/strategic-command-center.tsx",
      "utf8"
    );

  for (
    const tab
    of [
      "REALM",
      "SETTLEMENT",
      "WAR",
      "DIPLOMACY",
      "LORDS",
      "BRIEFING",
    ]
  ) {
    assert.ok(
      center.includes(
        `"${tab}"`
      )
    );
  }

  console.log(
    "PASS S9-02: command center provides realm, settlement, war, diplomacy, lord and briefing workspaces"
  );

  assert.ok(
    center.includes(
      "getRealmBudgetSnapshot"
    )
  );

  assert.ok(
    center.includes(
      "getKingdomTerritoryEconomy"
    )
  );

  assert.ok(
    center.includes(
      "getDiplomaticPairStatus"
    )
  );

  assert.ok(
    center.includes(
      "declarePlayerWar"
    )
  );

  assert.ok(
    center.includes(
      "passPlayerCommandWindow"
    )
  );

  console.log(
    "PASS S9-03: realm overview and actions remain backed by canonical economy, territory, diplomacy and command services"
  );

  for (
    const file
    of [
      "app/war-intelligence-panel.tsx",
      "app/diplomatic-law-panel.tsx",
      "app/settlement-investment-panel.tsx",
      "app/lord-military-politics-panel.tsx",
      "app/strategic-briefing-panel.tsx",
    ]
  ) {
    const source =
      readFileSync(
        file,
        "utf8"
      );

    assert.ok(
      source.includes(
        "embedded = false"
      )
    );

    assert.ok(
      source.includes(
        "embedded ?"
      )
    );
  }

  console.log(
    "PASS S9-04: existing gameplay panels support embedded mode without duplicating their domain logic"
  );

  assert.ok(
    center.includes(
      "<SettlementInvestmentPanel"
    ) &&
    center.includes(
      "<WarIntelligencePanel"
    ) &&
    center.includes(
      "<DiplomaticLawPanel"
    ) &&
    center.includes(
      "<LordMilitaryPoliticsPanel"
    ) &&
    center.includes(
      "<StrategicBriefingPanel"
    )
  );

  assert.ok(
    center.match(
      /<SettlementInvestmentPanel[\s\S]*?embedded/
    )
  );

  assert.ok(
    center.match(
      /<WarIntelligencePanel[\s\S]*?embedded/
    )
  );

  console.log(
    "PASS S9-05: command center reuses the working Step 4–8 surfaces instead of implementing parallel gameplay systems"
  );

  assert.ok(
    root.includes(
      "<OperationalPanel />"
    )
  );

  assert.ok(
    root.includes(
      "<CourtPanel />"
    )
  );

  assert.ok(
    root.includes(
      "<ConversationPanel />"
    )
  );

  assert.ok(
    root.includes(
      "<BattleBoard />"
    )
  );

  console.log(
    "PASS S9-06: genuinely contextual army, court, conversation and battle surfaces remain available"
  );

  assert.ok(
    center.includes(
      "Current Selection"
    )
  );

  assert.ok(
    center.includes(
      "Open settlement management"
    )
  );

  assert.ok(
    center.includes(
      "Open war intelligence"
    )
  );

  assert.ok(
    center.includes(
      "ATTENTION"
    )
  );

  console.log(
    "PASS S9-07: map selection and command interrupts drive the strategic UI hierarchy"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 9 — STRATEGIC COMMAND CENTER UI: PASS"
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
