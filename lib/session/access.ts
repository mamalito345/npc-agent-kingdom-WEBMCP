import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  PlayerSlot,
} from "@/types/session";

export type PlayerAccessError =
  | "SESSION_NOT_FOUND"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_NOT_ACTIVE"
  | "NOT_CURRENT_PLAYER"
  | "COMMAND_WINDOW_CLOSED";

export type PlayerAccessResult =
  | {
      ok:
        false;

      error:
        PlayerAccessError;
    }
  | {
      ok:
        true;

      player:
        PlayerSlot;
    };

export function validatePlayerAccess(
  sessionId:
    string,
  playerId:
    string
): PlayerAccessResult {
  const world =
    getRuntimeWorldState();

  if (
    world.session.id !==
    sessionId
  ) {
    return {
      ok:
        false,

      error:
        "SESSION_NOT_FOUND",
    };
  }

  const player =
    world.session
      .players[
        playerId
      ];

  if (!player) {
    return {
      ok:
        false,

      error:
        "PLAYER_NOT_FOUND",
    };
  }

  if (!player.active) {
    return {
      ok:
        false,

      error:
        "PLAYER_NOT_ACTIVE",
    };
  }

  return {
    ok:
      true,

    player,
  };
}

export function validatePlayerCommandAccess(
  sessionId:
    string,
  playerId:
    string
): PlayerAccessResult {
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

  const cycle =
    getRuntimeWorldState()
      .session
      .commandCycle;

  /*
   * WebMCP LLMs only receive mutation
   * rights during an explicit command
   * window.
   *
   * This prevents an LLM from acting
   * every simulation hour.
   */
  if (
    cycle.phase ===
    "executing"
  ) {
    return {
      ok:
        false,

      error:
        "COMMAND_WINDOW_CLOSED",
    };
  }

  if (
    cycle.currentPlayerId !==
    playerId
  ) {
    return {
      ok:
        false,

      error:
        "NOT_CURRENT_PLAYER",
    };
  }

  return {
    ok:
      true,

    player:
      access.player,
  };
}