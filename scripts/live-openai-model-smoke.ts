import {
  existsSync,
  readFileSync,
} from "node:fs";

function loadEnvFile(
  path:
    string
): void {
  if (
    !existsSync(
      path
    )
  ) {
    return;
  }

  const content =
    readFileSync(
      path,
      "utf8"
    );

  for (
    const rawLine
    of content
      .split(
        /\r?\n/
      )
  ) {
    const line =
      rawLine.trim();

    if (
      !line ||
      line.startsWith(
        "#"
      )
    ) {
      continue;
    }

    const separator =
      line.indexOf(
        "="
      );

    if (
      separator <=
      0
    ) {
      continue;
    }

    const key =
      line
        .slice(
          0,
          separator
        )
        .trim();

    let value =
      line
        .slice(
          separator +
            1
        )
        .trim();

    if (
      (
        value.startsWith(
          '"'
        ) &&
        value.endsWith(
          '"'
        )
      ) ||
      (
        value.startsWith(
          "'"
        ) &&
        value.endsWith(
          "'"
        )
      )
    ) {
      value =
        value.slice(
          1,
          -1
        );
    }

    if (
      process.env[
        key
      ] ===
      undefined
    ) {
      process.env[
        key
      ] =
        value;
    }
  }
}

async function testModel(
  label:
    string,
  model:
    string,
  apiKey:
    string
): Promise<void> {
  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body:
          JSON.stringify({
            model,

            input: [
              {
                role:
                  "system",

                content:
                  "Return the requested structured health response only.",
              },
              {
                role:
                  "user",

                content:
                  `Health check for ${label}.`,
              },
            ],

            max_output_tokens:
              80,

            text: {
              format: {
                type:
                  "json_schema",

                name:
                  "model_health",

                strict:
                  true,

                schema: {
                  type:
                    "object",

                  additionalProperties:
                    false,

                  required: [
                    "ok",
                    "role",
                  ],

                  properties: {
                    ok: {
                      type:
                        "boolean",
                    },

                    role: {
                      type:
                        "string",
                    },
                  },
                },
              },
            },
          }),
      }
    );

  if (
    !response.ok
  ) {
    const body =
      await response.text();

    throw new Error(
      `${label} (${model}) failed: HTTP ${response.status} ${body.slice(0, 500)}`
    );
  }

  console.log(
    `PASS LIVE MODEL: ${label} → ${model}`
  );
}

async function main():
  Promise<void> {
  loadEnvFile(
    ".env.local"
  );

  loadEnvFile(
    ".env"
  );

  const apiKey =
    process.env
      .OPENAI_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY_REQUIRED"
    );
  }

  const player =
    process.env
      .PLAYER_LLM_MODEL
      ?.trim();

  const character =
    process.env
      .GM_CHARACTER_MODEL
      ?.trim();

  const director =
    process.env
      .GM_DIRECTOR_MODEL
      ?.trim() ||
    process.env
      .OPENAI_DIRECTOR_MODEL
      ?.trim();

  const missing =
    [
      !player
        ? "PLAYER_LLM_MODEL"
        : null,

      !character
        ? "GM_CHARACTER_MODEL"
        : null,

      !director
        ? "GM_DIRECTOR_MODEL"
        : null,
    ].filter(
      (
        value
      ): value is
        string =>
        Boolean(
          value
        )
    );

  if (
    missing.length >
    0
  ) {
    throw new Error(
      `MISSING_MODEL_ENV: ${missing.join(", ")}`
    );
  }

  const unique =
    new Map<
      string,
      string
    >();

  unique.set(
    "Actor LLM / GM Realm",
    player as
      string
  );

  unique.set(
    "GM Character / Lord",
    character as
      string
  );

  unique.set(
    "World Director",
    director as
      string
  );

  for (
    const [
      label,
      model,
    ]
    of unique
  ) {
    await testModel(
      label,
      model,
      apiKey
    );
  }

  console.log("");
  console.log(
    "LIVE OPENAI MODEL READINESS: PASS"
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
