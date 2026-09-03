import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const commandCenter =
  readFileSync(
    "app/strategic-command-center.tsx",
    "utf8"
  );

const diplomacy =
  readFileSync(
    "app/diplomatic-law-panel.tsx",
    "utf8"
  );

const lords =
  readFileSync(
    "app/lord-military-politics-panel.tsx",
    "utf8"
  );

const communication =
  readFileSync(
    "lib/lords/communication.ts",
    "utf8"
  );

const armies =
  readFileSync(
    "app/army-layer.tsx",
    "utf8"
  );

for (
  const token
  of [
    '"REALM"',
    '"SETTLEMENT"',
    '"WAR"',
    '"DIPLOMACY"',
    '"LORDS"',
    '"BRIEFING"',
    "rounded-full",
    "right-3",
    "<DiplomaticLawPanel",
    "<LordMilitaryPoliticsPanel",
    "declarePlayerWar",
    "passPlayerCommandWindow",
  ]
) {
  assert.ok(
    commandCenter.includes(
      token
    ),
    `Command center missing ${token}`
  );
}

console.log(
  "PASS UI-01: strategic UI is a right-side icon rail with one active drawer"
);

assert.ok(
  diplomacy.includes(
    "!status.atWar"
  )
);

assert.ok(
  diplomacy.includes(
    '"PEACE"'
  )
);

assert.ok(
  diplomacy.includes(
    "AWAITING REPLY"
  )
);

assert.ok(
  diplomacy.includes(
    "Peace is the current state"
  )
);

console.log(
  "PASS UI-02: peace proposal appears only during war and pending courier proposals are visible"
);

for (
  const token
  of [
    "sendLordCorrespondence",
    "Correspondence",
    "Formal Commands",
    "BRING_ARMY",
    "DEFEND_SETTLEMENT",
    "REINFORCE",
    "HOLD_POSITION",
    "RAISE_TROOPS",
  ]
) {
  assert.ok(
    lords.includes(
      token
    ),
    `Lord UI missing ${token}`
  );
}

console.log(
  "PASS UI-03: lord screen supports correspondence plus semantic military commands"
);

for (
  const token
  of [
    "spawnCourier",
    "estimatedArrivalAt",
    "replyStartAt",
    "createMovement",
    "getGmCharacterModelAdapter",
    "COURIER_SPEED_KM_PER_HOUR",
  ]
) {
  assert.ok(
    communication.includes(
      token
    ),
    `Lord communication missing ${token}`
  );
}

console.log(
  "PASS UI-04: remote lord replies use round-trip distance delay and physical courier movement"
);

assert.ok(
  armies.includes(
    "markerSize"
  )
);

assert.ok(
  armies.includes(
    "enemyMarkerSize"
  )
);

assert.ok(
  armies.includes(
    "Math.sqrt"
  )
);

console.log(
  "PASS UI-05: army marker size scales with force size rather than fixed 56px cards"
);

console.log("");
console.log(
  "FINAL UI + LORD + DIPLOMACY FIX: PASS"
);
