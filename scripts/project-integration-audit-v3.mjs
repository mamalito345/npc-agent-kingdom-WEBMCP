import {
  readFileSync,
} from "node:fs";

function read(
  path
) {
  return readFileSync(
    path,
    "utf8"
  );
}

let failures =
  0;

function check(
  ok,
  label
) {
  console.log(
    `${ok ? "PASS" : "FAIL"} ${label}`
  );

  if (!ok) {
    failures +=
      1;
  }
}

const runner =
  read(
    "lib/actors/runner.ts"
  );

const core =
  read(
    "lib/actors/tool-executor.ts"
  );

const management =
  read(
    "lib/actors/management-tool-executor.ts"
  );

check(
  runner.includes(
    "executeLlmPlayerActionWithManagement"
  ),
  "Runner uses layered Actor/GM action gateway"
);

const coreTools = [
  "inspect_player_state",
  "inspect_known_world",
  "inspect_armies",
  "inspect_known_enemy_forces",
  "inspect_messages",
  "inspect_orders",
  "inspect_battles",
  "inspect_settlements",
  "inspect_economy",
  "inspect_present_characters",
  "inspect_kingdom_lords",
  "inspect_lord_orders",
  "inspect_relationships",
  "inspect_agreements",
  "inspect_diplomatic_proposals",
  "inspect_promises",
  "issue_character_order",
  "declare_war",
  "issue_army_move",
  "issue_intercept",
  "change_order",
  "set_battle_tactic",
  "submit_battle_crisis_order",
  "recruit_units",
  "start_siege",
  "send_message",
  "send_envoy",
  "talk_to_character",
  "end_conversation",
  "propose_agreement",
  "respond_to_agreement",
  "create_promise",
  "resolve_promise",
  "pass_command_window",
];

const managementTools = [
  "inspect_campaign_status",
  "inspect_audience_requests",
  "convene_council",
  "respond_audience_request",
  "split_army",
  "merge_armies",
  "support_army",
  "stop_army_support",
  "assign_commander",
  "fortify_settlement",
  "develop_settlement",
  "raid_settlement",
  "capture_settlement",
];

for (
  const tool
  of coreTools
) {
  check(
    core.includes(
      `"${tool}"`
    ),
    `core gateway: ${tool}`
  );
}

for (
  const tool
  of managementTools
) {
  check(
    management.includes(
      `"${tool}"`
    ),
    `management gateway: ${tool}`
  );
}

const provider =
  read(
    "app/webmcp-provider.tsx"
  );

const war =
  read(
    "lib/webmcp/register-war-tools.ts"
  );

check(
  provider.includes(
    "registerWarWebMCPTools"
  ),
  "Provider mounts war WebMCP module"
);

check(
  war.includes(
    '"declare_war"'
  ),
  "WebMCP exposes declare_war"
);

const root =
  read(
    "app/game-root.tsx"
  );

check(
  root.includes(
    "<RealmCommandPanel />"
  ),
  "RealmCommandPanel mounted"
);

const cycle =
  read(
    "lib/session/command-cycle.ts"
  );

check(
  /phase:\s*(?:\r?\n\s*)?"executing"/.test(
    cycle
  ),
  "pass command window enters executing"
);

console.log("");
console.log(
  `ARCHITECTURE FAILURES: ${failures}`
);

process.exitCode =
  failures ===
    0
    ? 0
    : 1;
