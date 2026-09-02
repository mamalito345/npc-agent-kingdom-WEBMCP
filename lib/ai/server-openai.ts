import "server-only";

export interface StructuredOpenAIRequest {
  model: string;
  system: string;
  input: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

function extractOutputText(response: unknown): string {
  if (
    typeof response === "object" &&
    response !== null &&
    "output_text" in response &&
    typeof (response as { output_text?: unknown }).output_text === "string"
  ) {
    return (response as { output_text: string }).output_text;
  }

  if (
    typeof response !== "object" ||
    response === null ||
    !("output" in response) ||
    !Array.isArray((response as { output?: unknown }).output)
  ) {
    throw new Error("OPENAI_RESPONSE_TEXT_NOT_FOUND");
  }

  const chunks: string[] = [];

  for (const item of (response as { output: unknown[] }).output) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("content" in item) ||
      !Array.isArray((item as { content?: unknown }).content)
    ) {
      continue;
    }

    for (const part of (item as { content: unknown[] }).content) {
      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        chunks.push((part as { text: string }).text);
      }
    }
  }

  if (chunks.length === 0) {
    throw new Error("OPENAI_RESPONSE_TEXT_NOT_FOUND");
  }

  return chunks.join("");
}

export async function requestStructuredOpenAI<T>(
  request: StructuredOpenAIRequest
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_REQUIRED");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      input: [
        {
          role: "system",
          content: request.system,
        },
        {
          role: "user",
          content: JSON.stringify(request.input),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: request.schemaName,
          strict: request.strict ?? false,
          schema: request.schema,
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `OPENAI_RESPONSES_ERROR_${response.status}: ${text.slice(0, 400)}`
    );
  }

  const payload = await response.json();
  return JSON.parse(extractOutputText(payload)) as T;
}

export function playerModel(): string {
  return process.env.PLAYER_LLM_MODEL || "gpt-5.6-terra";
}

export function gmCharacterModel(): string {
  return process.env.GM_CHARACTER_MODEL || "gpt-5.6-terra";
}

export function gmDirectorModel(): string {
  return process.env.GM_DIRECTOR_MODEL || "gpt-5.6-terra";
}
