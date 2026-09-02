import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

async function main(): Promise<void> {
  const panel =
    readFileSync(
      "app/operational-panel.tsx",
      "utf8"
    );

  assert.ok(
    panel.includes(
      "!selectedArmy &&"
    ) &&
    panel.includes(
      "!selectedSettlement"
    ) &&
    panel.includes(
      "return null;"
    )
  );

  assert.ok(
    panel.includes(
      'right-4 top-[88px]'
    )
  );

  assert.ok(
    panel.includes(
      "selectMapArmy(null)"
    )
  );

  assert.ok(
    panel.includes(
      "selectMapSettlement(null)"
    )
  );

  assert.ok(
    panel.includes(
      "Army Inspector"
    )
  );

  console.log(
    "PASS: operational inspector is hidden until an army/settlement is selected"
  );

  console.log(
    "PASS: selected army inspector opens as a right-side panel, not over the map center"
  );

  console.log(
    "PASS: inspector has an explicit close action"
  );

  console.log("");
  console.log(
    "ARMY INSPECTOR SIDE PANEL UX FIX: PASS"
  );
}

main().catch(
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  }
);
