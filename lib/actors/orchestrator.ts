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
