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
  RealmControlRole,
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

function emit():
  void {
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
  listener:
    () => void
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
    Partial<
      DemoUiConfig
    >
): void {
  config = {
    ...config,
    ...patch,
  };

  emit();
}

function resetCommandCycleWithOrder(
  orderedPlayerIds:
    string[]
): void {
  updateRuntimeWorldState(
    (
      current
    ) => ({
      ...current,
      session: {
        ...current.session,
        commandCycle: {
          ...current
            .session
            .commandCycle,
          phase:
            "planning",
          playerOrder:
            orderedPlayerIds,
          requiredPlayerIds:
            orderedPlayerIds,
          readyPlayerIds:
            [],
          currentPlayerId:
            orderedPlayerIds[
              0
            ],
          windowOpenedAt:
            current
              .simulation
              .worldTimeMinutes,
          executionStartedAt:
            undefined,
          interrupt:
            undefined,
        },
      },
    })
  );
}

export function startObserverDemo():
  void {
  configureAllActivePlayersAsLlm();

  const world =
    getRuntimeWorldState();

  const activePlayers =
    Object.values(
      world.session
        .players
    )
      .filter(
        (
          player
        ) =>
          player.active
      )
      .map(
        (
          player
        ) =>
          player.id
      );

  updateRuntimeWorldState(
    (
      current
    ) => ({
      ...current,
      session: {
        ...current.session,
        localPlayerId:
          activePlayers[
            0
          ] ??
          current.session
            .localPlayerId,
        campaignControl: {
          humanPlayerId:
            undefined,
          actorPlayerId:
            activePlayers[
              0
            ],
          roleByKingdomId:
            Object.fromEntries(
              Object.values(
                current.session
                  .players
              )
                .filter(
                  (
                    player
                  ) =>
                    player.active
                )
                .map(
                  (
                    player
                  ) => [
                    player
                      .kingdomId,
                    "ACTOR_LLM" as
                      RealmControlRole,
                  ]
                )
            ),
        },
      },
      simulation: {
        ...current.simulation,
        paused:
          false,
        pauseReasons:
          [],
      },
    })
  );

  resetCommandCycleWithOrder(
    activePlayers
  );

  config = {
    mode:
      "observer",
    speed:
      4,
    running:
      true,
    gmEnabled:
      true,
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

  const world =
    getRuntimeWorldState();

  const activePlayers =
    Object.values(
      world.session
        .players
    ).filter(
      (
        player
      ) =>
        player.active
    );

  const humanPlayers =
    activePlayers.filter(
      (
        player
      ) =>
        mapped[
          player.id
        ] ===
        "human"
    );

  const human =
    humanPlayers[
      0
    ];

  const llmPlayers =
    activePlayers.filter(
      (
        player
      ) =>
        mapped[
          player.id
        ] ===
        "webmcp_llm"
    );

  /*
   * Human command windows must start with the actually selected human.
   * The previous implementation changed localPlayerId but left the old
   * command-cycle order intact, so "End Orders" could hand control to an
   * unrelated pre-existing current player before the human ever got a turn.
   */
  const llmPlayerIds =
    new Set(
      llmPlayers.map(
        (
          player
        ) =>
          player.id
      )
    );

  const humanPlayerIds =
    new Set(
      humanPlayers.map(
        (
          player
        ) =>
          player.id
      )
    );

  const orderedPlayerIds = [
    ...humanPlayers.map(
      (
        player
      ) =>
        player.id
    ),
    ...llmPlayers.map(
      (
        player
      ) =>
        player.id
    ),
    ...activePlayers
      .filter(
        (
          player
        ) =>
          !humanPlayerIds.has(
            player.id
          ) &&
          !llmPlayerIds.has(
            player.id
          )
      )
      .map(
        (
          player
        ) =>
          player.id
      ),
  ];

  const roleByKingdomId:
    Record<
      string,
      RealmControlRole
    > =
    Object.fromEntries(
      activePlayers.map(
        (
          player
        ) => [
          player.kingdomId,
          mapped[
            player.id
          ] ===
          "human"
            ? "HUMAN"
            : "ACTOR_LLM",
        ]
      )
    );

  updateRuntimeWorldState(
    (
      current
    ) => {
      const localPlayerId =
        human?.id ??
        orderedPlayerIds[
          0
        ] ??
        current.session
          .localPlayerId;

      const localPlayer =
        current.session
          .players[
            localPlayerId
          ];

      const localCharacter =
        localPlayer
          ? current
              .characters[
                localPlayer
                  .characterId
              ]
          : undefined;

      return {
        ...current,
        session: {
          ...current.session,
          localPlayerId,
          campaignControl: {
            humanPlayerId:
              human?.id,
            actorPlayerId:
              llmPlayers[
                0
              ]?.id,
            roleByKingdomId,
          },
        },
        player: {
          characterId:
            localPlayer
              ?.characterId ??
            current.player
              .characterId,
          locationId:
            localCharacter
              ?.locationId ??
            current.player
              .locationId,
        },
        simulation: {
          ...current.simulation,
          paused:
            false,
          pauseReasons:
            [],
        },
      };
    }
  );

  resetCommandCycleWithOrder(
    orderedPlayerIds
  );

  config = {
    ...config,
    mode:
      "player",
    running:
      true,
  };

  emit();
}

export function activeHumanPlayerId():
  string | undefined {
  return Object.values(
    getRuntimeWorldState()
      .session.players
  ).find(
    (
      player
    ) =>
      player.active &&
      player.controllerType ===
        "human"
  )?.id;
}
