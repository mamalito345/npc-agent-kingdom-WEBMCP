import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

export type WebMcpIdentityValidation =
  | {
      ok:
        true;
      sessionId:
        string;
      playerId:
        string;
    }
  | {
      ok:
        false;
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

function inputRecord(
  input:
    unknown
):
  Record<
    string,
    unknown
  > |
  null {
  return (
    typeof input ===
      "object" &&
    input !==
      null &&
    !Array.isArray(
      input
    )
  )
    ? input as Record<
        string,
        unknown
      >
    : null;
}

export function validateBoundWebMcpIdentity(
  input:
    unknown
):
  WebMcpIdentityValidation {
  const record =
    inputRecord(
      input
    );

  if (!record) {
    return {
      ok:
        false,
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
      ok:
        false,
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
      ok:
        false,
      error:
        "WEBMCP_SESSION_IDENTITY_MISMATCH",
    };
  }

  if (
    suppliedPlayerId !==
    boundPlayerId
  ) {
    return {
      ok:
        false,
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
      ok:
        false,
      error:
        "WEBMCP_BOUND_PLAYER_NOT_ACTIVE",
    };
  }

  return {
    ok:
      true,
    sessionId:
      boundSessionId,
    playerId:
      boundPlayerId,
  };
}

function isToolDefinition(
  value:
    unknown
): value is
  Record<
    string,
    unknown
  > & {
    execute:
      (
        input:
          unknown
      ) =>
        unknown |
        Promise<
          unknown
        >;
  } {
  if (
    typeof value !==
      "object" ||
    value ===
      null
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
 * IMPORTANT:
 *
 * Some real WebMCP hosts expose document.modelContext.registerTool as a
 * non-configurable property. Replacing/monkey-patching that host method with
 * Object.defineProperty therefore throws:
 *
 *   TypeError: Cannot redefine property: registerTool
 *
 * Identity binding is now implemented with a LOCAL REGISTRATION FACADE.
 * Each gameplay register-*.ts module asks for this facade and registers tools
 * through it. The facade wraps each tool's execute callback before delegating
 * to the host's original registerTool method.
 *
 * We never mutate document.modelContext or registerTool.
 */
export function getIdentityBoundWebMcpModelContext() {
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  const modelContext =
    document.modelContext;

  if (!modelContext) {
    return null;
  }

  const guardedRegisterTool =
    ((
      tool:
        unknown,
      options?:
        unknown
    ) => {
      if (
        !isToolDefinition(
          tool
        )
      ) {
        return modelContext
          .registerTool(
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
            input:
              unknown
          ) => {
            const identity =
              validateBoundWebMcpIdentity(
                input
              );

            if (
              identity.ok ===
              false
            ) {
              return identity;
            }

            return originalExecute(
              input
            );
          },
      };

      return modelContext
        .registerTool(
          wrappedTool as never,
          options as never
        );
    }) as
      typeof modelContext
        .registerTool;

  /*
   * A minimal facade is deliberate. Current registration modules only require
   * registerTool. The real host object remains untouched.
   */
  return {
    registerTool:
      guardedRegisterTool,
  } as typeof modelContext;
}

/*
 * Kept for compatibility with historical Phase-H callers/tests.
 * "installed" now means the identity-bound facade can be created; it does NOT
 * mean the host object was modified.
 */
export function installWebMcpIdentityGuard():
  WebMcpGuardInstallResult {
  if (
    typeof document ===
    "undefined"
  ) {
    return "unavailable";
  }

  if (
    !document.modelContext
  ) {
    return "unavailable";
  }

  try {
    return getIdentityBoundWebMcpModelContext()
      ? "installed"
      : "unavailable";
  } catch (
    error
  ) {
    console.error(
      "[WebMCP] identity facade initialization failed:",
      error
    );

    return "failed";
  }
}
