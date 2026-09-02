import type {
  GameSessionState,
  PlayerSlot,
} from "@/types/session";

import type {
  WorldMinute,
} from "@/types/simulation";

export const STRATEGIC_BRIEFING_INTERVAL_MINUTES =
  3 * 24 * 60;

export function createInitialSession(
  worldTime:
    WorldMinute
): GameSessionState {
  const players:
    PlayerSlot[] = [
    {
      id:
        "player-edwyn",

      controllerType:
        "human",

      characterId:
        "lord_edwyn",

      /*
       * Actual canonical realm ID.
       */
      kingdomId:
        "northreach",

      displayName:
        "Lord Edwyn",

      active:
        true,
    },
  ];

  const playerRecord =
    Object.fromEntries(
      players.map(
        (player) => [
          player.id,
          player,
        ]
      )
    );

  const playerIds =
    players.map(
      (player) =>
        player.id
    );

  return {
    id:
      "demo-session",

    name:
      "War of the Five Kingdoms",

    mapId:
      "five-kingdoms",

    startedAt:
      worldTime,

    players:
      playerRecord,

    localPlayerId:
      "player-edwyn",

    commandCycle: {
      phase:
        "planning",

      playerOrder: [
        ...playerIds,
      ],

      requiredPlayerIds: [
        ...playerIds,
      ],

      readyPlayerIds:
        [],

      currentPlayerId:
        playerIds[0],

      windowOpenedAt:
        worldTime,
    },

    orders:
      {},

    knowledge:
      Object.fromEntries(
        players.map(
          (player) => [
            player.id,

            {
              playerId:
                player.id,

              facts:
                [],

              lastStrategicBriefingAt:
                worldTime,

              nextStrategicBriefingAt:
                worldTime +
                STRATEGIC_BRIEFING_INTERVAL_MINUTES,
            },
          ]
        )
      ),
  };
}