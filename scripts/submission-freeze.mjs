import {
  spawnSync,
} from "node:child_process";

const commands = [
  ["npm", ["run", "build"]],
  ["npm", ["run", "lint"]],
  ["npx", ["tsx", "scripts/submission-smoke-compat-audit.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-1-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-2-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-3-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-4-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-5-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-6-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-7-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-8-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-9-smoke.ts"]],
  ["npx", ["tsx", "scripts/professional-gameplay-step-10-regression.ts"]],
  ["npx", ["tsx", "scripts/final-gameplay-big-step-6-smoke.ts"]],
];

for (
  const [
    command,
    args,
  ]
  of commands
) {
  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    `SUBMISSION FREEZE: ${command} ${args.join(" ")}`
  );
  console.log(
    "============================================================"
  );

  const result =
    spawnSync(
      command,
      args,
      {
        stdio:
          "inherit",
        shell:
          process.platform ===
          "win32",
      }
    );

  if (
    result.status !==
    0
  ) {
    console.error("");
    console.error(
      `SUBMISSION FREEZE FAILED at: ${command} ${args.join(" ")}`
    );

    process.exit(
      result.status ??
      1
    );
  }
}

console.log("");
console.log(
  "============================================================"
);
console.log(
  "SUBMISSION FREEZE — AUTOMATED REGRESSION PASS"
);
console.log(
  "============================================================"
);
console.log(
  "Do not add new features. Perform the live browser/WebMCP campaign checklist next."
);
