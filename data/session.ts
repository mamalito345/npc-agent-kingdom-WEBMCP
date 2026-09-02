import type {
  GameSessionState,
  PlayerSlot,
} from "@/types/session";
import type { WorldMinute } from "@/types/simulation";

import {
  createInitialLordRuntimeState,
} from "@/data/lords";

export const STRATEGIC_BRIEFING_INTERVAL_MINUTES = 3 * 24 * 60;

export function createInitialSession(
  worldTime: WorldMinute
): GameSessionState {
  const players: PlayerSlot[] = [
    {
      id: "player-edwyn",
      controllerType: "human",
      characterId: "lord_edwyn",
      kingdomId: "northreach",
      displayName: "Lord Edwyn",
      active: true,
    },
    {
      id: "player-roderic",
      controllerType: "webmcp_llm",
      characterId: "king_roderic",
      kingdomId: "eastvale",
      displayName: "King Roderic",
      active: true,
    },
    {
      id: "player-garran",
      controllerType: "webmcp_llm",
      characterId: "king_garran",
      kingdomId: "westmoor",
      displayName: "King Garran",
      active: true,
    },
    {
      id: "player-osric",
      controllerType: "webmcp_llm",
      characterId: "king_osric",
      kingdomId: "southmark",
      displayName: "King Osric",
      active: true,
    },
    {
      id: "player-varren",
      controllerType: "webmcp_llm",
      characterId: "king_varren",
      kingdomId: "ironhollow",
      displayName: "King Varren",
      active: true,
    },
  ];

  const playerRecord = Object.fromEntries(
    players.map((player) => [player.id, player])
  ) as Record<string, PlayerSlot>;

  const playerIds = players.map((player) => player.id);

  return {
    id: "demo-session",
    name: "War of the Five Kingdoms",
    mapId: "five-kingdoms",
    startedAt: worldTime,
    players: playerRecord,
    localPlayerId: "player-edwyn",

    commandCycle: {
      phase: "planning",
      playerOrder: [...playerIds],
      requiredPlayerIds: [...playerIds],
      readyPlayerIds: [],
      currentPlayerId: playerIds[0],
      windowOpenedAt: worldTime,
    },

    orders: {},

    knowledge: Object.fromEntries(
      players.map((player) => [
        player.id,
        {
          playerId: player.id,
          facts: [],
          lastStrategicBriefingAt: worldTime,
          nextStrategicBriefingAt:
            worldTime + STRATEGIC_BRIEFING_INTERVAL_MINUTES,
        },
      ])
    ),

    conversations: {},
    memories: {},
    characterKnowledge: {},
    presenceContexts: {},

    llmPlayers: {
      plans: {},
      activePlanByPlayerId: {},
      decisions: [],
      lastActivationAt: {},
    },

    lords: createInitialLordRuntimeState(),

    director: {
      proposals: {},
      lastContextAt: undefined,
      lastTurnAt: undefined,
      lastAppliedProposalId: undefined,
    },
  };
}
