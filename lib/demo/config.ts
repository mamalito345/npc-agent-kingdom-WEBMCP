import {
  configureAllActivePlayersAsLlm,
  configurePlayerControllers,
} from "@/lib/actors/controller";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  PlayerControllerType,
} from "@/types/session";

export type DemoMode =
  | "player"
  | "observer";

export type DemoSpeed =
  | 1
  | 4
  | 8;

export interface DemoUiConfig {
  mode: DemoMode;
  speed: DemoSpeed;
  running: boolean;
  gmEnabled: boolean;
}

let config:
  DemoUiConfig = {
  mode: "player",
  speed: 1,
  running: false,
  gmEnabled: true,
};

const listeners =
  new Set<
    () => void
  >();

function emit(): void {
  for (
    const listener
    of listeners
  ) {
    listener();
  }
}

export function getDemoConfig():
  DemoUiConfig {
  return config;
}

export function subscribeDemoConfig(
  listener: () => void
): () => void {
  listeners.add(
    listener
  );

  return () =>
    listeners.delete(
      listener
    );
}

export function setDemoConfig(
  patch:
    Partial<DemoUiConfig>
): void {
  config = {
    ...config,
    ...patch,
  };

  emit();
}

export function startObserverDemo():
  void {
  configureAllActivePlayersAsLlm();

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        localPlayerId:
          "player-edwyn",
        campaignControl: {
          humanPlayerId:
            undefined,
          actorPlayerId:
            undefined,
          roleByKingdomId:
            Object.fromEntries(
              Object.values(
                current.session
                  .players
              )
                .filter(
                  (player) =>
                    player.active
                )
                .map(
                  (player) => [
                    player.kingdomId,
                    "ACTOR_LLM",
                  ]
                )
            ),
        },
      },
      simulation: {
        ...current.simulation,
        paused: false,
        pauseReasons: [],
      },
    })
  );

  config = {
    mode:
      "observer",
    speed: 4,
    running: true,
    gmEnabled: true,
  };

  emit();
}

export function configureKingdomControllers(
  controllers:
    Record<
      string,
      "HUMAN" |
      "LLM"
    >
): void {
  const mapped:
    Record<
      string,
      PlayerControllerType
    > =
    Object.fromEntries(
      Object.entries(
        controllers
      ).map(
        ([
          playerId,
          controller,
        ]) => [
          playerId,
          controller ===
          "HUMAN"
            ? "human"
            : "webmcp_llm",
        ]
      )
    );

  configurePlayerControllers(
    mapped
  );

  const human =
    Object.entries(
      mapped
    ).find(
      ([, value]) =>
        value ===
        "human"
    );

  if (human) {
    updateRuntimeWorldState(
      (current) => ({
        ...current,
        session: {
          ...current.session,
          localPlayerId:
            human[0],
        },
        player: {
          characterId:
            current.session
              .players[
                human[0]
              ]
              ?.characterId ??
            current.player
              .characterId,
          locationId:
            current.characters[
              current.session
                .players[
                  human[0]
                ]
                ?.characterId ??
                ""
            ]?.locationId ??
            current.player
              .locationId,
        },
      })
    );
  }

  config = {
    ...config,
    mode: "player",
    running: true,
  };

  emit();
}

export function activeHumanPlayerId():
  string | undefined {
  return Object.values(
    getRuntimeWorldState()
      .session.players
  ).find(
    (player) =>
      player.active &&
      player.controllerType ===
        "human"
  )?.id;
}
