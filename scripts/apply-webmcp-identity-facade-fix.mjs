import {
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";

const files = [
  "lib/webmcp/register-tools.ts",
  "lib/webmcp/register-conversation-tools.ts",
  "lib/webmcp/register-lord-tools.ts",
  "lib/webmcp/register-politics-tools.ts",
  "lib/webmcp/register-border-tools.ts",
  "lib/webmcp/register-army-management-tools.ts",
  "lib/webmcp/register-audience-tools.ts",
];

const identityImport =
  'import { getIdentityBoundWebMcpModelContext } from "@/lib/webmcp/identity-guard";\n';

function patch(
  path
) {
  if (
    !existsSync(
      path
    )
  ) {
    throw new Error(
      `MISSING_WEBMCP_REGISTRATION_FILE: ${path}`
    );
  }

  let text =
    readFileSync(
      path,
      "utf8"
    );

  if (
    !text.includes(
      "getIdentityBoundWebMcpModelContext"
    )
  ) {
    text =
      identityImport +
      text;
  }

  const before =
    text;

  text =
    text.replace(
      /const\s+modelContext\s*=\s*document\.modelContext\s*;/g,
      `const modelContext =
    getIdentityBoundWebMcpModelContext();`
    );

  if (
    text ===
      before &&
    !text.includes(
      "getIdentityBoundWebMcpModelContext();"
    )
  ) {
    throw new Error(
      `MODEL_CONTEXT_PATTERN_NOT_FOUND: ${path}`
    );
  }

  if (
    text.includes(
      "const modelContext =\n    document.modelContext;"
    ) ||
    text.includes(
      "const modelContext = document.modelContext;"
    )
  ) {
    throw new Error(
      `UNPATCHED_DIRECT_MODEL_CONTEXT: ${path}`
    );
  }

  writeFileSync(
    path,
    text,
    "utf8"
  );

  console.log(
    `PATCHED ${path}`
  );
}

for (
  const path
  of files
) {
  patch(
    path
  );
}

console.log("");
console.log(
  "WEBMCP IDENTITY FACADE MIGRATION: PASS"
);
