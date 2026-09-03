import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "scripts/professional-gameplay-step-5-smoke.ts",
  "scripts/professional-gameplay-step-6-smoke.ts",
  "scripts/professional-gameplay-step-7-smoke.ts",
];

for (const file of files) {
  const text = readFileSync(file, "utf8");

  assert.ok(
    text.includes(
      'import assert from "node:assert/strict";'
    ),
    `${file}: assert import missing`
  );

  assert.ok(
    !text.includes(
      '\\nimport assert from "node:assert/strict";'
    ),
    `${file}: literal \\\\n still comments out assert import`
  );
}

console.log(
  "PASS COMPILE-COMPAT-01: Step 5/6/7 smoke assert imports are active TypeScript imports"
);
