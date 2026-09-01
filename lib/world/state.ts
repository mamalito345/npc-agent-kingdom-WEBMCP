import {
  getRuntimeWorldState,
  subscribeWorldState,
} from "@/lib/world/runtime";

import {
  formatWorldTime,
} from "@/lib/world/time";

export function getWorldState() {
  return getRuntimeWorldState();
}

export function getKingdom(
  kingdomId: string
) {
  return getRuntimeWorldState()
    .kingdoms[kingdomId];
}

export function getCharacter(
  characterId: string
) {
  return getRuntimeWorldState()
    .characters[characterId];
}

export function getLocation(
  locationId: string
) {
  return getRuntimeWorldState()
    .locations[locationId];
}

export function getLocations() {
  return Object.values(
    getRuntimeWorldState().locations
  );
}

export function getSettlement(
  settlementId: string
) {
  return getRuntimeWorldState()
    .settlements[settlementId];
}

export function getSettlements() {
  return Object.values(
    getRuntimeWorldState().settlements
  );
}

export function getPlayerVisibleWorld() {
  const world =
    getRuntimeWorldState();

  const playerCharacter =
    world.characters[
      world.player.characterId
    ];

  const position =
    world.simulation
      .entityPositions[
      world.player.characterId
    ] ?? null;

  const movement =
    world.simulation
      .activeMovements[
      world.player.characterId
    ];

  return {
    simulation: {
      worldTimeMinutes:
        world.simulation
          .worldTimeMinutes,

      worldTime:
        formatWorldTime(
          world.simulation
            .worldTimeMinutes
        ),

      paused:
        world.simulation.paused,
    },

    player: {
      characterId:
        world.player.characterId,

      locationId:
        world.player.locationId,

      role:
        playerCharacter?.rank ??
        null,

      position,

      movement: movement
        ? {
            destinationNodeId:
              movement
                .destinationNodeId,

            routeNodeIds:
              movement.routeNodeIds,

            routeEdgeIds:
              movement.routeEdgeIds,

            startedAt:
              movement.startedAt,

            estimatedArrivalAt:
              movement
                .estimatedArrivalAt,
          }
        : null,
    },

    kingdoms: Object.values(
      world.kingdoms
    ).map((kingdom) => ({
      id: kingdom.id,
      name: kingdom.name,
    })),

    locations: Object.values(
      world.locations
    ).map((location) => ({
      id: location.id,
      name: location.name,

      kingdomId:
        location.kingdomId,

      type: location.type,
    })),

    recentEvents:
      world.simulation
        .resolvedEvents
        .slice(-10)
        .map((event) => ({
          id: event.id,
          type: event.type,

          timestamp:
            event.timestamp,

          result:
            event.result,
        })),
  };
}

export function inspectLocation(
  locationId: string
) {
  const location =
    getLocation(locationId);

  if (!location) {
    return {
      ok: false as const,
      error:
        "LOCATION_NOT_FOUND" as const,
    };
  }

  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      locationId
    ];

  const kingdom =
    world.kingdoms[
      location.kingdomId
    ];

  return {
    ok: true as const,

    location: {
      id: location.id,

      name: location.name,

      kingdomId:
        location.kingdomId,

      kingdomName:
        kingdom?.name ?? null,

      type: location.type,

      settlement: settlement
        ? {
            ownerId:
              settlement.ownerId ??
              null,

            resources:
              settlement.resources,

            dailyProduction:
              settlement.dailyProduction,
          }
        : null,
    },
  };
}

export function inspectCharacter(
  characterId: string
) {
  const character =
    getCharacter(characterId);

  if (!character) {
    return {
      ok: false as const,
      error:
        "CHARACTER_NOT_FOUND" as const,
    };
  }

  return {
    ok: true as const,

    character: {
      id: character.id,
      name: character.name,

      kingdomId:
        character.kingdomId,

      rank:
        character.rank,

      locationId:
        character.locationId,

      army:
        character.army,

      treasury:
        character.treasury,
    },
  };
}

export { subscribeWorldState };