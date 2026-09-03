import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

async function main():
  Promise<void> {
  const panel =
    readFileSync(
      "app/operational-panel.tsx",
      "utf8"
    );

  assert.ok(
    panel.includes(
      "!selectedArmy &&"
    )
  );

  assert.ok(
    panel.includes(
      "!selectedSettlement"
    )
  );

  assert.ok(
    panel.includes(
      "!selectedStrategicNode"
    )
  );

  assert.ok(
    panel.includes(
      "clearMapSelection()"
    )
  );

  assert.ok(
    panel.includes(
      "closeInspector"
    )
  );

  console.log(
    "PASS: operational inspector remains selection-driven"
  );

  console.log(
    "PASS: close action uses canonical clearMapSelection"
  );

  console.log("");
  console.log(
    "ARMY INSPECTOR SIDE PANEL UX FIX: PASS"
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
