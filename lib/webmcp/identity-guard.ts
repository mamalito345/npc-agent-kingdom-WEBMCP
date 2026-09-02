import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

export type WebMcpIdentityValidation =
  | {
      ok: true;
      sessionId: string;
      playerId: string;
    }
  | {
      ok: false;
      error:
        | "WEBMCP_IDENTITY_REQUIRED"
        | "WEBMCP_SESSION_IDENTITY_MISMATCH"
        | "WEBMCP_PLAYER_IDENTITY_MISMATCH"
        | "WEBMCP_BOUND_PLAYER_NOT_ACTIVE";
    };

export type WebMcpGuardInstallResult =
  | "installed"
  | "already_installed"
  | "unavailable"
  | "failed";

const GUARD_MARKER =
  Symbol.for(
    "npc-kingdom.webmcp.identity-guard"
  );

function inputRecord(
  input: unknown
): Record<string, unknown> | null {
  return (
    typeof input ===
      "object" &&
    input !== null &&
    !Array.isArray(input)
  )
    ? input as Record<string, unknown>
    : null;
}

export function validateBoundWebMcpIdentity(
  input: unknown
): WebMcpIdentityValidation {
  const record =
    inputRecord(input);

  if (!record) {
    return {
      ok: false,
      error:
        "WEBMCP_IDENTITY_REQUIRED",
    };
  }

  const suppliedSessionId =
    record.session_id;

  const suppliedPlayerId =
    record.player_id;

  if (
    typeof suppliedSessionId !==
      "string" ||
    typeof suppliedPlayerId !==
      "string"
  ) {
    return {
      ok: false,
      error:
        "WEBMCP_IDENTITY_REQUIRED",
    };
  }

  const world =
    getRuntimeWorldState();

  const boundSessionId =
    world.session.id;

  const boundPlayerId =
    world.session
      .localPlayerId;

  if (
    suppliedSessionId !==
    boundSessionId
  ) {
    return {
      ok: false,
      error:
        "WEBMCP_SESSION_IDENTITY_MISMATCH",
    };
  }

  if (
    suppliedPlayerId !==
    boundPlayerId
  ) {
    return {
      ok: false,
      error:
        "WEBMCP_PLAYER_IDENTITY_MISMATCH",
    };
  }

  const player =
    world.session.players[
      boundPlayerId
    ];

  if (
    !player ||
    !player.active
  ) {
    return {
      ok: false,
      error:
        "WEBMCP_BOUND_PLAYER_NOT_ACTIVE",
    };
  }

  return {
    ok: true,
    sessionId:
      boundSessionId,
    playerId:
      boundPlayerId,
  };
}

function isToolDefinition(
  value: unknown
): value is Record<string, unknown> & {
  execute:
    (input: unknown) =>
      unknown |
      Promise<unknown>;
} {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof candidate.execute ===
    "function"
  );
}

/*
 * Identity is enforced at the browser WebMCP registration boundary.
 *
 * This intentionally wraps modelContext.registerTool once instead of adding
 * dozens of scattered player/session checks to every individual tool file.
 *
 * Every gameplay WebMCP tool already carries session_id + player_id in its
 * schema. The wrapper rejects any request whose supplied identity differs from
 * the canonical browser session.localPlayerId/session.id binding.
 *
 * Internal Actor LLM and GM Realm adapters never pass through this browser
 * boundary, so their server/runtime identities are unaffected.
 */
export function installWebMcpIdentityGuard():
  WebMcpGuardInstallResult {
  if (
    typeof document ===
    "undefined"
  ) {
    return "unavailable";
  }

  const modelContext =
    document.modelContext;

  if (!modelContext) {
    return "unavailable";
  }

  const marked =
    modelContext as unknown as
      Record<
        PropertyKey,
        unknown
      >;

  if (
    marked[
      GUARD_MARKER
    ] === true
  ) {
    return "already_installed";
  }

  try {
    const originalRegisterTool =
      modelContext.registerTool.bind(
        modelContext
      );

    const guardedRegisterTool =
      ((
        tool: unknown,
        options?: unknown
      ) => {
        if (
          !isToolDefinition(
            tool
          )
        ) {
          return originalRegisterTool(
            tool as never,
            options as never
          );
        }

        const originalExecute =
          tool.execute;

        const wrappedTool = {
          ...tool,

          execute:
            async (
              input: unknown
            ) => {
              const identity =
                validateBoundWebMcpIdentity(
                  input
                );

              if (!identity.ok) {
                return identity;
              }

              return originalExecute(
                input
              );
            },
        };

        return originalRegisterTool(
          wrappedTool as never,
          options as never
        );
      }) as typeof modelContext.registerTool;

    Object.defineProperty(
      modelContext,
      "registerTool",
      {
        value:
          guardedRegisterTool,
        configurable: true,
        writable: true,
      }
    );

    Object.defineProperty(
      modelContext,
      GUARD_MARKER,
      {
        value: true,
        configurable: false,
        writable: false,
      }
    );

    return "installed";
  } catch (error) {
    console.error(
      "[WebMCP] identity guard installation failed:",
      error
    );

    return "failed";
  }
}
