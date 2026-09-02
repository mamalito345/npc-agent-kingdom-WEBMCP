import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  DirectorContext,
} from "@/types/director";

const RECENT_EVENT_LIMIT = 20;
const RECENT_MESSAGE_LIMIT = 20;
const RECENT_PROPOSAL_LIMIT = 20;

export function buildDirectorContext(): DirectorContext {
  const world = getRuntimeWorldState();

  const context: DirectorContext = {
    worldTimeMinutes: world.simulation.worldTimeMinutes,

    session: {
      id: world.session.id,
      mapId: world.session.mapId,
      commandPhase: world.session.commandCycle.phase,
      players: Object.values(world.session.players)
        .filter((player) => player.active)
        .map((player) => ({
          id: player.id,
          characterId: player.characterId,
          kingdomId: player.kingdomId,
          controllerType: player.controllerType,
        })),
    },

    kingdoms: Object.values(world.kingdoms).map((kingdom) => ({
      id: kingdom.id,
      treasury: kingdom.treasury,
      food: kingdom.food,
      stability: kingdom.stability,
      relations: { ...kingdom.relations },
    })),

    armies: Object.values(world.armies).map((army) => ({
      id: army.id,
      ownerId: army.ownerId,
      commanderId: army.commanderId,
      status: army.status,
      position: world.simulation.entityPositions[army.id] ?? null,
    })),

    wars: Object.values(world.wars),
    battles: Object.values(world.battles)
      .filter((battle) => battle.status === "active")
      .slice(-10),
    sieges: Object.values(world.sieges)
      .filter((siege) => siege.status === "active")
      .slice(-10),

    recentEvents: [
      ...world.simulation.resolvedEvents.slice(-10),
      ...Object.values(world.session.director.events.instances)
        .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
        .slice(-10),
    ].slice(-RECENT_EVENT_LIMIT),

    recentMessages: Object.values(world.messages)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
      .slice(-RECENT_MESSAGE_LIMIT),

    directorMemory: {
      recentProposals: Object.values(world.session.director.proposals)
        .sort((a, b) => a.proposedAt - b.proposedAt || a.id.localeCompare(b.id))
        .slice(-RECENT_PROPOSAL_LIMIT),
    },

    rules: [
      "Never directly mutate world state.",
      "Return structured proposals only.",
      "Player-controlled armies cannot be moved by the Director.",
      "Player-controlled characters cannot be commanded by the Director.",
      "Physical travel must use canonical movement.",
      "Messages must use couriers.",
      "Enemy knowledge must respect delivery and observation physics.",
      "Do not fabricate battles, sieges, armies or settlements.",
      "Prefer consequences caused by current world state.",
      "Event selection must use the predefined Package 7 catalogue.",
      "World Director is not an NPC character and must not impersonate one.",
      "Avoid unnecessary events when nothing meaningful should happen.",
    ],
  };

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        lastContextAt: current.simulation.worldTimeMinutes,
      },
    },
  }));

  return context;
}
