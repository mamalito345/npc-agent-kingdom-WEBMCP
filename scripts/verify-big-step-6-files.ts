import {
  existsSync,
} from "node:fs";

const required = [
  "lib/ui/game-audio.ts",
  "app/game-audio.tsx",
  "app/conflict-layer.tsx",
  "app/strategy-map.tsx",
  "app/battle-board.tsx",
  "app/game-root.tsx",
  "lib/director/openai-adapter.ts",
  "scripts/live-openai-model-smoke.ts",
  "scripts/final-gameplay-big-step-6-smoke.ts",
];

async function main():
  Promise<void> {
  const missing =
    required.filter(
      (path) =>
        !existsSync(
          path
        )
    );

  if (
    missing.length >
    0
  ) {
    throw new Error(
      `STEP_6_FILES_MISSING:\n${missing.join("\n")}`
    );
  }

  console.log(
    "PASS: all Big Step 6 files are physically present"
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
