import {
  getRuntimeWorldState,
  getWorldTime,
} from "@/lib/world/runtime";

import {
  advanceWorldUntil,
} from "@/lib/world/simulation";

import {
  isLlmPlayer,
} from "@/lib/actors/controller";

import {
  runLlmPlayerActivation,
} from "@/lib/actors/runner";

import {
  RemoteGmRealmAdapter,
} from "@/lib/ai/remote-adapters";

import {
  getPlayerControlRole,
} from "@/lib/demo/realm-control";

import type {
  CommandInterruptType,
} from "@/types/session";

import type {
  LlmPlayerActivationReason,
  LlmPlayerModelAdapter,
} from "@/types/actors";

function interruptReason(
  type: CommandInterruptType | undefined
): LlmPlayerActivationReason {
  switch (type) {
    case "BATTLE_CRISIS":
      return "BATTLE_CRISIS";
    case "BATTLE_STARTED":
    case "INTERCEPTION":
    case "ENEMY_SIGHTED":
      return "ENEMY_CONTACT";
    case "IMPORTANT_MESSAGE":
      return "IMPORTANT_MESSAGE";
    case "ARMY_ARRIVED":
    case "CHARACTER_ARRIVED":
      return "MAJOR_ORDER_COMPLETED";
    case "SIEGE_STARTED":
      return "OWN_SETTLEMENT_THREATENED";
    case "ORDER_FAILED":
    case "BATTLE_ENDED":
    case "SIEGE_ENDED":
    case "STRATEGIC_BRIEFING":
    case "MAJOR_WORLD_EVENT":
    case undefined:
      return "IMPORTANT_INTERRUPT";
  }
}

export function getCurrentLlmActivation():
  | {
      playerId: string;
      reason: LlmPlayerActivationReason;
    }
  | undefined {
  const cycle = getRuntimeWorldState().session.commandCycle;
  const playerId = cycle.currentPlayerId;

  if (!playerId || !isLlmPlayer(playerId)) {
    return undefined;
  }

  if (cycle.phase === "planning") {
    return {
      playerId,
      reason: "NORMAL_COMMAND_WINDOW",
    };
  }

  if (cycle.phase === "interrupted") {
    return {
      playerId,
      reason: interruptReason(cycle.interrupt?.type),
    };
  }

  return undefined;
}

export async function runPendingLlmCommandWindows(
  adapter: LlmPlayerModelAdapter,
  maxPlayers = 20
) {
  const results = [];

  for (let index = 0; index < maxPlayers; index += 1) {
    const activation = getCurrentLlmActivation();

    if (!activation) {
      break;
    }

    const result = await runLlmPlayerActivation(
      activation.playerId,
      activation.reason,
      adapter
    );

    results.push(result);

    if (!result.ok) {
      break;
    }

    const cycle = getRuntimeWorldState().session.commandCycle;
    if (cycle.phase === "executing") {
      break;
    }
  }

  return results;
}

export type AutonomousAdvanceResult =
  | {
      ok: true;
      reachedTarget: boolean;
      currentTime: number;
      activations: number;
    }
  | {
      ok: false;
      error: "HUMAN_INPUT_REQUIRED" | "AUTONOMOUS_LOOP_GUARD" | "LLM_RUN_FAILED";
      currentTime: number;
    };

export async function advanceAutonomousWorldBy(
  adapter: LlmPlayerModelAdapter,
  minutes: number
): Promise<AutonomousAdvanceResult> {
  const targetTime = getWorldTime() + Math.max(0, minutes);
  let activations = 0;

  for (let guard = 0; guard < 100; guard += 1) {
    const cycle = getRuntimeWorldState().session.commandCycle;

    if (cycle.phase !== "executing") {
      const currentPlayerId = cycle.currentPlayerId;

      if (!currentPlayerId) {
        return {
          ok: false,
          error: "HUMAN_INPUT_REQUIRED",
          currentTime: getWorldTime(),
        };
      }

      if (!isLlmPlayer(currentPlayerId)) {
        return {
          ok: false,
          error: "HUMAN_INPUT_REQUIRED",
          currentTime: getWorldTime(),
        };
      }

      const results = await runPendingLlmCommandWindows(adapter);
      activations += results.length;

      if (results.some((result) => !result.ok)) {
        return {
          ok: false,
          error: "LLM_RUN_FAILED",
          currentTime: getWorldTime(),
        };
      }

      continue;
    }

    if (getWorldTime() >= targetTime) {
      return {
        ok: true,
        reachedTarget: true,
        currentTime: getWorldTime(),
        activations,
      };
    }

    const result = advanceWorldUntil(targetTime);

    if (result.reachedTarget) {
      return {
        ok: true,
        reachedTarget: true,
        currentTime: result.currentTime,
        activations,
      };
    }

    /*
     * Meaningful simulation interrupts are expected to have opened a command
     * window for affected players. The next loop iteration services it.
     */
    if (getWorldTime() === result.currentTime) {
      const nextCycle = getRuntimeWorldState().session.commandCycle;
      if (nextCycle.phase === "executing") {
        return {
          ok: true,
          reachedTarget: false,
          currentTime: result.currentTime,
          activations,
        };
      }
    }
  }

  return {
    ok: false,
    error: "AUTONOMOUS_LOOP_GUARD",
    currentTime: getWorldTime(),
  };
}

//
// ============================================================
// WORLD CATCH-UP (WEBMCP-DRIVEN)
// ============================================================
//
// The demo browser tab used to be the ONLY thing that ever moved the
// world clock forward (a client-side setTimeout loop in DemoRuntime).
// That means a WebMCP host (e.g. a ChatGPT App widget) that queues an
// order or proposes an agreement can get back "ok: true" while nothing
// physically happens, because the tab driving the widget may be
// backgrounded, throttled, or remounted between tool calls.
//
// runWorldCatchUp() makes real progress possible without relying on
// that timer: it is invoked after every mutating WebMCP tool call
// (see lib/webmcp/identity-guard.ts) and, right there in the same
// request, resolves the "executing" phase deterministically and runs
// any pending NPC/actor-LLM command windows in the correct order,
// stopping only when the human player is genuinely needed again or a
// safety guard is hit. It is intentionally idempotent/resumable: if
// the guard is hit, the next tool call simply continues the work.
//

const CATCH_UP_ITERATION_GUARD = 40;
const CATCH_UP_HORIZON_MINUTES = 60 * 24 * 30;

const catchUpGmRealmAdapter = new RemoteGmRealmAdapter();

export type WorldCatchUpResult = {
  advanced: boolean;
  currentTime: number;
  activations: number;
  stoppedFor?:
    | "HUMAN_TURN"
    | "MODEL_ERROR"
    | "LOOP_GUARD"
    | "WORLD_PAUSED"
    | "WAITING_FOR_EXTERNAL_ACTOR";
};

export async function runWorldCatchUp(): Promise<WorldCatchUpResult> {
  const startTime = getWorldTime();
  let activations = 0;

  for (let guard = 0; guard < CATCH_UP_ITERATION_GUARD; guard += 1) {
    const cycle = getRuntimeWorldState().session.commandCycle;

    if (cycle.phase === "executing") {
      /*
       * The world clock being paused only ever means "do not advance
       * time" -- it must not also freeze whose turn it is to command.
       * Command-window turns (the branch below, for GM/Actor LLM
       * players) are resolved regardless of pause state, so a human
       * who passes their command window while paused still hands the
       * turn to the next LLM player immediately instead of the game
       * silently waiting for someone to press Resume. Only the
       * "executing" phase -- which is specifically about moving world
       * time forward -- respects pause.
       */
      if (
        getRuntimeWorldState()
          .simulation.paused
      ) {
        return {
          advanced: getWorldTime() !== startTime,
          currentTime: getWorldTime(),
          activations,
          stoppedFor: "WORLD_PAUSED",
        };
      }

      const result = advanceWorldUntil(
        getWorldTime() + CATCH_UP_HORIZON_MINUTES
      );

      if (result.reachedTarget) {
        return {
          advanced: getWorldTime() !== startTime,
          currentTime: getWorldTime(),
          activations,
        };
      }

      // An interrupt or a fresh command window opened mid-advance;
      // the next loop iteration re-reads the command cycle and
      // handles whatever it now needs.
      continue;
    }

    const activation = getCurrentLlmActivation();

    if (!activation) {
      return {
        advanced: getWorldTime() !== startTime,
        currentTime: getWorldTime(),
        activations,
        stoppedFor: "HUMAN_TURN",
      };
    }

    const role = getPlayerControlRole(activation.playerId);

    /*
     * ACTOR_LLM kingdoms used to ALSO be resolved automatically here by
     * an internal OpenAI call (PLAYER_LLM_MODEL via RemotePlayerLlmAdapter),
     * racing an actual external WebMCP-connected agent (e.g. a ChatGPT
     * desktop session) with no claim/lock between them -- whichever
     * fired first won, and the internal call almost always won because
     * this loop runs on every mutating WebMCP tool call AND on a
     * ~250-1800ms client timer regardless of whether an external agent
     * was live. That internal system has been removed entirely: an
     * ACTOR_LLM kingdom's command window is now driven exclusively by
     * real WebMCP tool calls from whatever client is actually connected
     * as that player, exactly like a human turn -- this loop simply
     * waits for one, indefinitely, rather than resolving it itself.
     * GM-controlled realms are unaffected; they still use the GM
     * adapter below.
     */
    if (role !== "GM") {
      return {
        advanced: getWorldTime() !== startTime,
        currentTime: getWorldTime(),
        activations,
        stoppedFor: "WAITING_FOR_EXTERNAL_ACTOR",
      };
    }

    const result = await runLlmPlayerActivation(
      activation.playerId,
      activation.reason,
      catchUpGmRealmAdapter
    );

    activations += 1;

    if (!result.ok) {
      return {
        advanced: getWorldTime() !== startTime,
        currentTime: getWorldTime(),
        activations,
        stoppedFor: "MODEL_ERROR",
      };
    }
  }

  return {
    advanced: getWorldTime() !== startTime,
    currentTime: getWorldTime(),
    activations,
    stoppedFor: "LOOP_GUARD",
  };
}
