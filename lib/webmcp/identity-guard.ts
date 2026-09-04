import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  runWorldCatchUp,
} from "@/lib/actors/orchestrator";

import {
  isLlmPlayer,
} from "@/lib/actors/controller";

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
        | "WEBMCP_BOUND_PLAYER_NOT_ACTIVE"
        | "WEBMCP_NO_ACTOR_TURN_OPEN";
    };

export type WebMcpGuardInstallResult =
  | "installed"
  | "already_installed"
  | "unavailable"
  | "failed";

function inputRecord(
  input: unknown
): Record<string, unknown> | null {
  return (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input)
  )
    ? input as Record<string, unknown>
    : null;
}

function getBoundIdentity():
  WebMcpIdentityValidation {
  const world =
    getRuntimeWorldState();

  const sessionId =
    world.session.id;

  /*
   * WebMCP represents whichever ACTOR_LLM (webmcp_llm-controlled) kingdom
   * currently has its command window open -- NOT a single fixed
   * session.localPlayerId. The command cycle only ever opens one player's
   * window at a time (session.commandCycle.currentPlayerId), so binding to
   * that turn's player, when it is an LLM/webmcp-controlled player, lets one
   * external WebMCP host (e.g. a ChatGPT desktop session) correctly drive
   * ANY number of ACTOR_LLM kingdoms in sequence, in turn order, instead of
   * being permanently wired to only one hardcoded player.
   *
   * If the currently open window belongs to a human player (or nothing is
   * open), there is no ACTOR_LLM turn for WebMCP to act on right now.
   */
  const playerId =
    world.session.commandCycle
      .currentPlayerId;

  if (
    !playerId ||
    !isLlmPlayer(playerId)
  ) {
    return {
      ok: false,
      error:
        "WEBMCP_NO_ACTOR_TURN_OPEN",
    };
  }

  const player =
    world.session.players[
      playerId
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
    sessionId,
    playerId,
  };
}

/**
 * Strict compatibility validator.
 *
 * Historical tests and explicit spoof tests can still call this function.
 * Public WebMCP tools no longer ask the model to provide these identifiers.
 */
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
    typeof suppliedSessionId !== "string" ||
    typeof suppliedPlayerId !== "string"
  ) {
    return {
      ok: false,
      error:
        "WEBMCP_IDENTITY_REQUIRED",
    };
  }

  const bound =
    getBoundIdentity();

  if (bound.ok === false) {
    return bound;
  }

  if (
    suppliedSessionId !==
    bound.sessionId
  ) {
    return {
      ok: false,
      error:
        "WEBMCP_SESSION_IDENTITY_MISMATCH",
    };
  }

  if (
    suppliedPlayerId !==
    bound.playerId
  ) {
    return {
      ok: false,
      error:
        "WEBMCP_PLAYER_IDENTITY_MISMATCH",
    };
  }

  return bound;
}

function isToolDefinition(
  value: unknown
): value is Record<string, unknown> & {
  execute: (
    input: unknown
  ) => unknown | Promise<unknown>;
} {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  return (
    typeof (
      value as Record<
        string,
        unknown
      >
    ).execute ===
    "function"
  );
}

function stripIdentityFromInputSchema(
  schema: unknown
): unknown {
  if (
    typeof schema !== "object" ||
    schema === null ||
    Array.isArray(schema)
  ) {
    return schema;
  }

  const source =
    schema as Record<
      string,
      unknown
    >;

  const properties =
    (
      typeof source.properties === "object" &&
      source.properties !== null &&
      !Array.isArray(source.properties)
    )
      ? source.properties as Record<
          string,
          unknown
        >
      : undefined;

  const required =
    Array.isArray(
      source.required
    )
      ? source.required
      : undefined;

  return {
    ...source,
    properties:
      properties
        ? Object.fromEntries(
            Object.entries(
              properties
            ).filter(
              ([key]) =>
                key !== "session_id" &&
                key !== "player_id"
            )
          )
        : source.properties,
    required:
      required
        ? required.filter(
            (value) =>
              value !== "session_id" &&
              value !== "player_id"
          )
        : source.required,
  };
}

function mergeBoundIdentity(
  input: unknown,
  bound: {
    sessionId: string;
    playerId: string;
  }
): Record<string, unknown> {
  const record =
    inputRecord(input) ?? {};

  /*
   * If a host bypasses schema enforcement and explicitly supplies an identity,
   * reject a mismatch rather than silently honoring it.
   */
  if (
    typeof record.session_id === "string" &&
    record.session_id !== bound.sessionId
  ) {
    throw new Error(
      "WEBMCP_SESSION_IDENTITY_MISMATCH"
    );
  }

  if (
    typeof record.player_id === "string" &&
    record.player_id !== bound.playerId
  ) {
    throw new Error(
      "WEBMCP_PLAYER_IDENTITY_MISMATCH"
    );
  }

  return {
    ...record,
    session_id:
      bound.sessionId,
    player_id:
      bound.playerId,
  };
}

/**
 * Public WebMCP facade.
 *
 * The model sees ZERO identity fields.
 * The browser-owned current session/player identity is injected immediately
 * before the canonical tool execute callback runs.
 *
 * document.modelContext is never modified.
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
      tool: unknown,
      options?: unknown
    ) => {
      if (
        !isToolDefinition(tool)
      ) {
        return modelContext
          .registerTool(
            tool as never,
            options as never
          );
      }

      const originalExecute =
        tool.execute;

      const original =
        tool as Record<
          string,
          unknown
        >;

      const annotations =
        (
          typeof original.annotations === "object" &&
          original.annotations !== null
        )
          ? original.annotations as Record<string, unknown>
          : undefined;

      const isReadOnlyTool =
        annotations?.readOnlyHint ===
        true;

      const publicTool = {
        ...original,
        inputSchema:
          stripIdentityFromInputSchema(
            original.inputSchema
          ),
        execute:
          async (
            input: unknown
          ) => {
            const bound =
              getBoundIdentity();

            if (
              bound.ok ===
              false
            ) {
              return bound;
            }

            let result: unknown;

            try {
              result = await originalExecute(
                mergeBoundIdentity(
                  input,
                  bound
                )
              );
            } catch (
              error
            ) {
              if (
                error instanceof Error &&
                (
                  error.message ===
                    "WEBMCP_SESSION_IDENTITY_MISMATCH" ||
                  error.message ===
                    "WEBMCP_PLAYER_IDENTITY_MISMATCH"
                )
              ) {
                return {
                  ok: false,
                  error:
                    error.message,
                };
              }

              throw error;
            }

            /*
             * Gameplay-mutating tool calls are the only reliable signal
             * that this WebMCP host is actually present and driving the
             * game right now, so this is also the only reliable place to
             * push the world clock forward. Read-only "inspect_*" tools
             * are skipped so a burst of state checks doesn't repeatedly
             * pay the cost of running NPC/GM turns.
             */
            if (!isReadOnlyTool) {
              try {
                await runWorldCatchUp();
              } catch (
                catchUpError
              ) {
                console.error(
                  "[WebMCP] world catch-up failed after tool execution:",
                  catchUpError
                );
              }
            }

            return result;
          },
      };

      return modelContext
        .registerTool(
          publicTool as never,
          options as never
        );
    }) as
      typeof modelContext
        .registerTool;

  return {
    registerTool:
      guardedRegisterTool,
  } as typeof modelContext;
}

export function installWebMcpIdentityGuard():
  WebMcpGuardInstallResult {
  if (
    typeof document ===
    "undefined"
  ) {
    return "unavailable";
  }

  if (!document.modelContext) {
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
