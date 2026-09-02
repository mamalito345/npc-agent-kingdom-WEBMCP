import {
  readdirSync,
} from "node:fs";

import {
  spawnSync,
} from "node:child_process";

const files =
  readdirSync(
    "scripts"
  )
    .filter(
      (name) =>
        name.endsWith(
          "smoke.ts"
        )
    )
    .sort();

if (
  files.length ===
  0
) {
  console.error(
    "No smoke scripts found."
  );

  process.exit(1);
}

console.log(
  `Running ${files.length} smoke scripts...`
);

for (
  const file
  of files
) {
  console.log(
    `\n=== ${file} ===`
  );

  /*
   * Windows cannot reliably execute npx.cmd directly through spawnSync
   * without a shell. The previous runner therefore returned status=null
   * before tsx ever started, making the first smoke look like a test failure.
   *
   * Shell mode is used only for the fixed local command `npx tsx` plus a
   * filename read from this repository's scripts directory.
   */
  const result =
    spawnSync(
      "npx",
      [
        "tsx",
        `scripts/${file}`,
      ],
      {
        stdio:
          "inherit",
        shell:
          process.platform ===
          "win32",
      }
    );

  if (
    result.error
  ) {
    console.error(
      `\nRUNNER ERROR: ${file}`
    );
    console.error(
      result.error
    );

    process.exit(1);
  }

  if (
    result.status !==
    0
  ) {
    console.error(
      `\nFAILED: ${file} (exit ${result.status ?? "unknown"})`
    );

    process.exit(
      result.status ??
      1
    );
  }
}

console.log(
  "\nALL SMOKE SCRIPTS PASSED"
);
