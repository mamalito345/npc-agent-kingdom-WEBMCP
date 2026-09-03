import {
  existsSync,
  readFileSync,
} from "node:fs";

function read(path) {
  if (!existsSync(path)) {
    throw new Error(`MISSING_FILE: ${path}`);
  }
  return readFileSync(path, "utf8");
}

function isolate(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);

  if (a < 0 || b <= a) {
    throw new Error(`ISOLATION_FAILED: ${start}`);
  }

  return text.slice(a, b);
}

let failures = 0;

function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures += 1;
}

const actorTypes = read("types/actors.ts");
const toolUnion =
  isolate(
    actorTypes,
    "export type LlmPlayerToolName =",
    "export interface LlmPlayerAction"
  );

const tools = [
  ...toolUnion.matchAll(
    /"([^"]+)"/g
  ),
].map((m) => m[1]);

const executor =
  read("lib/actors/tool-executor.ts");

const cases = [
  ...executor.matchAll(
    /case\s+"([^"]+)":/g
  ),
].map((m) => m[1]);

for (const tool of tools) {
  check(
    cases.includes(tool),
    `Actor executor handles ${tool}`
  );
}

const webmcp =
  [
    "lib/webmcp/register-tools.ts",
    "lib/webmcp/register-army-management-tools.ts",
    "lib/webmcp/register-audience-tools.ts",
    "lib/webmcp/register-border-tools.ts",
    "lib/webmcp/register-conversation-tools.ts",
    "lib/webmcp/register-lord-tools.ts",
    "lib/webmcp/register-politics-tools.ts",
  ]
    .map(read)
    .join("\n");

check(
  /name:\s*\r?\n\s*"declare_war"/.test(
    webmcp
  ),
  "WebMCP exposes declare_war"
);

const cycle =
  read(
    "lib/session/command-cycle.ts"
  );

check(
  /phase:\s*(?:\r?\n\s*)?"executing"/.test(
    cycle
  ),
  "passCommandWindow can enter executing phase"
);

const root =
  read(
    "app/game-root.tsx"
  );

check(
  root.includes(
    "<RealmCommandPanel />"
  ),
  "RealmCommandPanel is mounted"
);

console.log("");
console.log(
  `CORRECTED AUDIT FAILURES: ${failures}`
);

process.exitCode =
  failures === 0
    ? 0
    : 1;
