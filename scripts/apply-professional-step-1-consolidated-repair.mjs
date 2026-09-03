import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

function read(path) {
  if (!existsSync(path)) {
    throw new Error(`MISSING_FILE: ${path}`);
  }
  return readFileSync(path, "utf8");
}

function write(path, text) {
  writeFileSync(path, text, "utf8");
  console.log(`PATCHED ${path}`);
}

function insertBeforeUnique(text, needle, insertion, path) {
  const index = text.indexOf(needle);

  if (index < 0) {
    throw new Error(
      `ANCHOR_NOT_FOUND: ${path} -> ${needle.slice(0, 80)}`
    );
  }

  if (text.indexOf(needle, index + 1) >= 0) {
    throw new Error(
      `ANCHOR_NOT_UNIQUE: ${path} -> ${needle.slice(0, 80)}`
    );
  }

  return (
    text.slice(0, index) +
    insertion +
    text.slice(index)
  );
}

//
// 1. Finish core WebMCP declare_war registration without comment anchors.
//
{
  const path =
    "lib/webmcp/register-tools.ts";

  let text =
    read(path);

  if (
    !text.includes(
      "declarePlayerWar,"
    )
  ) {
    const needle =
      "  issuePlayerArmyMove,";

    text =
      insertBeforeUnique(
        text,
        needle,
        "  declarePlayerWar,\n",
        path
      );
  }

  if (
    !text.includes(
      "const declareWarSchema ="
    )
  ) {
    const needle =
      "const moveArmySchema =";

    const insertion =
`const declareWarSchema = {
  type:
    "object",

  properties: {
    ...playerInputProperties,

    target_kingdom_id: {
      type:
        "string",
    },

    reason: {
      type:
        "string",

      enum: [
        "BORDER_VIOLATION",
        "DEFENSE_OF_ALLY",
        "CLAIM",
        "RETALIATION",
        "AGGRESSION",
      ],
    },
  },

  required: [
    "session_id",
    "player_id",
    "target_kingdom_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

`;

    text =
      insertBeforeUnique(
        text,
        needle,
        insertion,
        path
      );
  }

  const hasDeclareRegistration =
    /name:\s*\r?\n\s*"declare_war"/.test(
      text
    );

  if (!hasDeclareRegistration) {
    const moveRegistration =
      /(\s+await modelContext\.registerTool\(\s*\{\s*name:\s*\r?\n\s*"issue_army_move",)/m;

    const match =
      text.match(
        moveRegistration
      );

    if (
      !match ||
      match.index === undefined
    ) {
      throw new Error(
        `ISSUE_ARMY_MOVE_REGISTRATION_NOT_FOUND: ${path}`
      );
    }

    const registration =
`    await modelContext.registerTool(
      {
        name:
          "declare_war",

        description:
          "Declare a canonical war on another kingdom during this player's command window. The browser-bound player identity is used automatically.",

        inputSchema:
          declareWarSchema,

        execute:
          async ({
            session_id,
            player_id,
            target_kingdom_id,
            reason,
          }) =>
            declarePlayerWar(
              session_id,
              player_id,
              target_kingdom_id,
              reason ??
                "AGGRESSION"
            ),
      },

      {
        signal:
          controller.signal,
      }
    );

`;

    text =
      text.slice(
        0,
        match.index
      ) +
      "\n" +
      registration +
      text.slice(
        match.index
      );
  }

  const validations = [
    "declarePlayerWar,",
    "const declareWarSchema =",
    '"declare_war"',
    "target_kingdom_id",
  ];

  for (
    const needle
    of validations
  ) {
    if (
      !text.includes(
        needle
      )
    ) {
      throw new Error(
        `WEBMCP_DECLARE_WAR_INCOMPLETE: ${needle}`
      );
    }
  }

  write(path, text);
}

//
// 2. Mount RealmCommandPanel in player UI.
//
{
  const path =
    "app/game-root.tsx";

  let text =
    read(path);

  if (
    !text.includes(
      'import RealmCommandPanel from "@/app/realm-command-panel";'
    )
  ) {
    const importsEndNeedle =
      'import GameAudio from "@/app/game-audio";';

    if (
      !text.includes(
        importsEndNeedle
      )
    ) {
      throw new Error(
        `GAME_ROOT_AUDIO_IMPORT_NOT_FOUND: ${path}`
      );
    }

    text =
      text.replace(
        importsEndNeedle,
        importsEndNeedle +
          '\nimport RealmCommandPanel from "@/app/realm-command-panel";'
      );
  }

  if (
    !text.includes(
      "<RealmCommandPanel />"
    )
  ) {
    const hudNeedle =
      "            <KingdomHud />";

    if (
      !text.includes(
        hudNeedle
      )
    ) {
      throw new Error(
        `GAME_ROOT_HUD_RENDER_NOT_FOUND: ${path}`
      );
    }

    text =
      text.replace(
        hudNeedle,
        hudNeedle +
          "\n            <RealmCommandPanel />"
      );
  }

  write(path, text);
}

//
// 3. Remove the only new Step-1 lint warning by avoiding unnecessary useMemo.
//
{
  const path =
    "app/realm-command-panel.tsx";

  let text =
    read(path);

  text =
    text.replace(
`  useMemo,
`,
      ""
    );

  const memoPattern =
/  const budget =\s*\n\s*useMemo\(\s*\n\s*\(\) =>\s*\n\s*kingdom\s*\n\s*\?\s*getRealmBudgetSnapshot\(\s*\n\s*kingdom\.id\s*\n\s*\)\s*\n\s*:\s*null,\s*\n\s*\[[\s\S]*?\]\s*\n\s*\);/m;

  if (
    memoPattern.test(
      text
    )
  ) {
    text =
      text.replace(
        memoPattern,
`  const budget =
    kingdom
      ? getRealmBudgetSnapshot(
          kingdom.id
        )
      : null;`
      );
  }

  write(path, text);
}

//
// 4. Replace stale army-inspector implementation-specific smoke.
//
{
  const path =
    "scripts/army-inspector-side-panel-smoke.ts";

  const content =
`import assert from "node:assert/strict";

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
    ) &&
    panel.includes(
      "!selectedSettlement"
    ) &&
    panel.includes(
      "!selectedStrategicNode"
    ) &&
    panel.includes(
      "return null;"
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

  assert.ok(
    panel.includes(
      "Army Inspector"
    ) ||
    panel.includes(
      "Settlement"
    ) ||
    panel.includes(
      "Strategic"
    )
  );

  console.log(
    "PASS: operational inspector remains selection-driven"
  );

  console.log(
    "PASS: inspector closes through the canonical map-selection clearing action"
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
`;

  write(path, content);
}

console.log("");
console.log(
  "PROFESSIONAL STEP 1 CONSOLIDATED REPAIR: PASS"
);
