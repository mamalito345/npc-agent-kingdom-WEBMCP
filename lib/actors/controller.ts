import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  PlayerControllerType,
} from "@/types/session";

export function isLlmControllerType(
  controllerType: PlayerControllerType
): boolean {
  /*
   * Legacy storage name retained for demo stability.
   * Gameplay role is LLM PLAYER; WebMCP is only its interface.
   */
  return controllerType === "webmcp_llm";
}

export function isLlmPlayer(playerId: string): boolean {
  const player = getRuntimeWorldState().session.players[playerId];
  return Boolean(player?.active && isLlmControllerType(player.controllerType));
}

export function configurePlayerControllers(
  controllers: Record<string, PlayerControllerType>
): void {
  updateRuntimeWorldState((current) => {
    const players = { ...current.session.players };

    for (const [playerId, controllerType] of Object.entries(controllers)) {
      const player = players[playerId];
      if (!player) {
        continue;
      }

      players[playerId] = {
        ...player,
        controllerType,
      };
    }

    const activePlayerIds = current.session.commandCycle.playerOrder.filter(
      (playerId) => players[playerId]?.active
    );

    return {
      ...current,
      session: {
        ...current.session,
        players,
        commandCycle: {
          ...current.session.commandCycle,
          phase: "planning",
          requiredPlayerIds: activePlayerIds,
          readyPlayerIds: [],
          currentPlayerId: activePlayerIds[0],
          windowOpenedAt: current.simulation.worldTimeMinutes,
          executionStartedAt: undefined,
          interrupt: undefined,
        },
      },
    };
  });
}

export function configureAllActivePlayersAsLlm(): void {
  const world = getRuntimeWorldState();
  const controllers = Object.fromEntries(
    Object.values(world.session.players)
      .filter((player) => player.active)
      .map((player) => [player.id, "webmcp_llm" as const])
  );

  configurePlayerControllers(controllers);
}
