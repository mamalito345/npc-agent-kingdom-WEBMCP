import {
  NextResponse,
} from "next/server";

function configured(
  name: string
): boolean {
  return Boolean(
    process.env[name]
      ?.trim()
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,

      apiKeyConfigured:
        configured(
          "OPENAI_API_KEY"
        ),

      playerModelConfigured:
        configured(
          "PLAYER_LLM_MODEL"
        ),

      gmCharacterModelConfigured:
        configured(
          "GM_CHARACTER_MODEL"
        ),

      gmDirectorModelConfigured:
        configured(
          "GM_DIRECTOR_MODEL"
        ) ||
        configured(
          "OPENAI_DIRECTOR_MODEL"
        ),

      /*
       * Values and secrets are deliberately not returned.
       */
      secretsExposed:
        false,
    },

    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
