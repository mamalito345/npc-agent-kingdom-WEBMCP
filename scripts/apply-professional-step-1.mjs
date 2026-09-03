import {
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";

function read(
  path
) {
  if (!existsSync(path)) {
    throw new Error(
      `MISSING_FILE: ${path}`
    );
  }

  return readFileSync(
    path,
    "utf8"
  );
}

function write(
  path,
  text
) {
  writeFileSync(
    path,
    text,
    "utf8"
  );
  console.log(
    `PATCHED ${path}`
  );
}

function ensureContains(
  text,
  needle,
  path
) {
  if (!text.includes(needle)) {
    throw new Error(
      `ANCHOR_NOT_FOUND in ${path}: ${needle}`
    );
  }
}

//
// 1. Player action: canonical declare war gateway.
//
{
  const path =
    "lib/session/player-actions.ts";
  let text =
    read(path);

  if (
    !text.includes(
      '@/lib/politics/war'
    )
  ) {
    const anchor =
      'import type {\n  BattleOrderType,';

    ensureContains(
      text,
      anchor,
      path
    );

    text =
      text.replace(
        anchor,
        'import {\n  declareWar,\n} from "@/lib/politics/war";\n\nimport type {\n  WarReason,\n} from "@/lib/politics/war";\n\n' +
        anchor
      );
  }

  if (
    !text.includes(
      "export function declarePlayerWar("
    )
  ) {
    const anchor =
      "export function passPlayerCommandWindow(";

    ensureContains(
      text,
      anchor,
      path
    );

    const fn =
`export function declarePlayerWar(
  sessionId: string,
  playerId: string,
  targetKingdomId: string,
  reason: WarReason = "AGGRESSION"
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  return declareWar(
    access.player.kingdomId,
    targetKingdomId,
    reason
  );
}

`;

    text =
      text.replace(
        anchor,
        fn + anchor
      );
  }

  write(
    path,
    text
  );
}

//
// 2. Economy observation becomes strategic-budget aware.
//
{
  const path =
    "lib/session/observation.ts";
  let text =
    read(path);

  if (
    !text.includes(
      "@/lib/economy/realm-budget"
    )
  ) {
    text =
      'import { getRealmBudgetSnapshot } from "@/lib/economy/realm-budget";\n' +
      text;
  }

  const start =
    text.indexOf(
      "export function getPlayerEconomyView("
    );

  const end =
    text.indexOf(
      "export function getPlayerObservation(",
      start
    );

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      `ECONOMY_VIEW_BOUNDARY_NOT_FOUND: ${path}`
    );
  }

  const replacement =
`export function getPlayerEconomyView(
  sessionId:
    string,
  playerId:
    string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const kingdom =
    world.kingdoms[
      access
        .player
        .kingdomId
    ];

  if (!kingdom) {
    return {
      ok:
        false as const,

      error:
        "KINGDOM_NOT_FOUND",
    };
  }

  const budget =
    getRealmBudgetSnapshot(
      kingdom.id
    );

  return {
    ok:
      true as const,

    kingdom: {
      id:
        kingdom.id,

      name:
        kingdom.name,

      treasury:
        kingdom.treasury,

      food:
        kingdom.food,

      stability:
        kingdom.stability,
    },

    budget,

    guidance: {
      reserveIsAdvisory:
        true,

      maySpendBelowReserve:
        true,

      note:
        "Recommended reserve is planning guidance, not a hard spending restriction.",
    },
  };
}

`;

  text =
    text.slice(
      0,
      start
    ) +
    replacement +
    text.slice(end);

  write(
    path,
    text
  );
}

//
// 3. Actor tool contract adds declare_war.
//
{
  const path =
    "types/actors.ts";
  let text =
    read(path);

  if (
    !text.includes(
      '| "declare_war"'
    )
  ) {
    const anchor =
      '| "issue_army_move"';

    ensureContains(
      text,
      anchor,
      path
    );

    text =
      text.replace(
        anchor,
        '| "declare_war"\n  ' +
        anchor
      );
  }

  write(
    path,
    text
  );
}

//
// 4. Actor/GM tool executor can execute canonical declare war.
//
{
  const path =
    "lib/actors/tool-executor.ts";
  let text =
    read(path);

  if (
    !text.includes(
      "declarePlayerWar,"
    )
  ) {
    const anchor =
      "  issuePlayerArmyMove,";

    ensureContains(
      text,
      anchor,
      path
    );

    text =
      text.replace(
        anchor,
        "  declarePlayerWar,\n" +
        anchor
      );
  }

  if (
    !text.includes(
      'case "declare_war":'
    )
  ) {
    const anchor =
      '      case "issue_army_move": {';

    ensureContains(
      text,
      anchor,
      path
    );

    const block =
`      case "declare_war": {
        const targetKingdomId =
          stringArg(
            action,
            "target_kingdom_id"
          );

        const reason =
          stringArg(
            action,
            "reason"
          ) as
            | "BORDER_VIOLATION"
            | "DEFENSE_OF_ALLY"
            | "CLAIM"
            | "RETALIATION"
            | "AGGRESSION"
            | undefined;

        result =
          targetKingdomId
            ? declarePlayerWar(
                sessionId,
                playerId,
                targetKingdomId,
                reason ??
                  "AGGRESSION"
              )
            : invalidArgs(
                action.tool,
                "target_kingdom_id required"
              );
        break;
      }

`;

    text =
      text.replace(
        anchor,
        block + anchor
      );
  }

  write(
    path,
    text
  );
}

//
// 5. WebMCP core registration adds declare_war.
// Identity fields remain in internal schema source; the facade strips them
// from the public schema and injects the browser-bound identity.
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
    const anchor =
      "  issuePlayerArmyMove,";

    ensureContains(
      text,
      anchor,
      path
    );

    text =
      text.replace(
        anchor,
        "  declarePlayerWar,\n" +
        anchor
      );
  }

  if (
    !text.includes(
      "const declareWarSchema ="
    )
  ) {
    const anchor =
      "const moveArmySchema =";

    ensureContains(
      text,
      anchor,
      path
    );

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

  if (
    !text.includes(
      'name:\n          "declare_war"'
    )
  ) {
    const anchor =
      '    //\n    // ========================================================\n    // STRATEGIC ORDERS';

    ensureContains(
      text,
      anchor,
      path
    );

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
        registration + anchor
      );
  }

  write(
    path,
    text
  );
}

//
// 6. Mount human-facing command/economy/war panel.
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

    ensureContains(
      text,
      anchor,
      path
    );

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

    ensureContains(
      text,
      anchor,
      path
    );

    text =
      text.replace(
        anchor,
        anchor +
        "\n            <RealmCommandPanel />"
      );
  }

  write(
    path,
    text
  );
}

console.log("");
console.log(
  "PROFESSIONAL STEP 1 MIGRATION: PASS"
);
