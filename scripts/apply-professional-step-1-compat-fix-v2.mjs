import {
  readFileSync,
  writeFileSync,
  existsSync,
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

//
// A. Finish register-tools.ts safely.
//
{
  const path =
    "lib/webmcp/register-tools.ts";

  let text =
    read(path);

  // Import declarePlayerWar.
  if (
    !text.includes(
      "declarePlayerWar,"
    )
  ) {
    const anchor =
      "  issuePlayerArmyMove,";

    if (!text.includes(anchor)) {
      throw new Error(
        `IMPORT_ANCHOR_NOT_FOUND: ${path}`
      );
    }

    text =
      text.replace(
        anchor,
        "  declarePlayerWar,\n" +
        anchor
      );
  }

  // Add declare-war input schema.
  if (
    !text.includes(
      "const declareWarSchema ="
    )
  ) {
    const anchor =
      "const moveArmySchema =";

    if (!text.includes(anchor)) {
      throw new Error(
        `SCHEMA_ANCHOR_NOT_FOUND: ${path}`
      );
    }

    const schema =
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
      text.replace(
        anchor,
        schema + anchor
      );
  }

  // Add WebMCP registration only after schema/import exist.
  const hasRegistration =
    /name:\s*\n\s*"declare_war"/.test(
      text
    );

  if (!hasRegistration) {
    const anchor =
`    //
    // ========================================================
    // STRATEGIC ORDERS
    // ========================================================
    //

`;

    if (!text.includes(anchor)) {
      throw new Error(
        `STRATEGIC_SECTION_ANCHOR_NOT_FOUND: ${path}`
      );
    }

    const registration =
`    await modelContext.registerTool(
      {
        name:
          "declare_war",

        description:
          "Declare a canonical war on another kingdom during this player's command window. Existing peace/non-aggression style agreements between the two realms are broken canonically.",

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
      text.replace(
        anchor,
        anchor +
        registration
      );
  }

  // Validate after all insertions.
  if (
    !text.includes(
      "declarePlayerWar,"
    ) ||
    !text.includes(
      "const declareWarSchema ="
    ) ||
    !/name:\s*\n\s*"declare_war"/.test(
      text
    )
  ) {
    throw new Error(
      `DECLARE_WAR_WEBMCP_PATCH_INCOMPLETE: ${path}`
    );
  }

  write(path, text);
}

//
// B. Mount RealmCommandPanel if first migration never reached game-root.
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
    const anchor =
      'import GameAudio from "@/app/game-audio";';

    if (!text.includes(anchor)) {
      throw new Error(
        `GAME_ROOT_IMPORT_ANCHOR_NOT_FOUND: ${path}`
      );
    }

    text =
      text.replace(
        anchor,
        anchor +
        '\nimport RealmCommandPanel from "@/app/realm-command-panel";'
      );
  }

  if (
    !text.includes(
      "<RealmCommandPanel />"
    )
  ) {
    const anchor =
      "            <KingdomHud />";

    if (!text.includes(anchor)) {
      throw new Error(
        `GAME_ROOT_RENDER_ANCHOR_NOT_FOUND: ${path}`
      );
    }

    text =
      text.replace(
        anchor,
        anchor +
        "\n            <RealmCommandPanel />"
      );
  }

  write(path, text);
}

//
// C. Verify all Step-1 integration points.
//
const checks = [
  [
    "lib/session/player-actions.ts",
    "declarePlayerWar",
  ],
  [
    "lib/session/observation.ts",
    "getRealmBudgetSnapshot",
  ],
  [
    "types/actors.ts",
    '"declare_war"',
  ],
  [
    "lib/actors/tool-executor.ts",
    'case "declare_war":',
  ],
  [
    "lib/webmcp/register-tools.ts",
    '"declare_war"',
  ],
  [
    "app/game-root.tsx",
    "<RealmCommandPanel />",
  ],
];

for (
  const [path, needle]
  of checks
) {
  const text =
    read(path);

  if (
    !text.includes(
      needle
    )
  ) {
    throw new Error(
      `STEP_1_INTEGRATION_MISSING: ${path} -> ${needle}`
    );
  }

  console.log(
    `VERIFIED ${path}`
  );
}

console.log("");
console.log(
  "PROFESSIONAL STEP 1 COMPATIBILITY FIX V2: PASS"
);
