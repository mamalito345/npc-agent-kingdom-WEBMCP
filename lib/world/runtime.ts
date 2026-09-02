import {
  characters,
} from "@/data/characters";

import {
  kingdoms,
} from "@/data/kingdoms";

import {
  locations,
} from "@/data/locations";

import {
  settlements,
} from "@/data/settlements";

import {
  demoArmies,
  demoArmyPositions,
  demoUnitBlocks,
} from "@/data/demo-military";

import {
  createInitialSession,
} from "@/data/session";

import type {
  ActiveMovement,
  Position,
  ResolvedEvent,
  ScheduledEvent,
  WorldMinute,
} from "@/types/simulation";

import type {
  WorldState,
} from "@/types/world";

type Listener =
  () => void;

const INITIAL_WORLD_TIME_MINUTES =
  8 * 60;

function createInitialCharacterPositions():
  Record<
    string,
    Position
  > {
  return Object.fromEntries(
    Object.values(
      characters
    ).map(
      (character) => [
        character.id,

        {
          kind:
            "node" as const,

          nodeId:
            character.locationId,
        },
      ]
    )
  );
}

let worldState:
  WorldState = {
  kingdoms,

  characters,

  locations,

  settlements,

  settlementResourceReservations:
    {},

  unitBlocks: {
    ...demoUnitBlocks,
  },

  fortificationOrders:
    {},

  fortificationRepairOrders:
    {},

  settlementOperations:
    {},

  armies: {
    ...demoArmies,
  },

  recruitmentOrders:
    {},

  wars:
    {},

  armyContacts:
    {},

  battles:
    {},

  sieges:
    {},

  battleResults:
    {},

  couriers:
    {},

  messages:
    {},

  session:
    createInitialSession(
      INITIAL_WORLD_TIME_MINUTES
    ),

  /*
   * Legacy local human projection.
   *
   * Multiplayer canonical ownership
   * lives in session.players.
   */
  player: {
    characterId:
      "lord_edwyn",

    locationId:
      "stoneford",
  },

  simulation: {
    worldTimeMinutes:
      INITIAL_WORLD_TIME_MINUTES,

    paused:
      true,

    entityPositions: {
      ...createInitialCharacterPositions(),

      ...demoArmyPositions,
    },

    activeMovements:
      {},

    scheduledEvents:
      [],

    resolvedEvents:
      [],

    nextSequence:
      1,
  },
};

const listeners =
  new Set<
    Listener
  >();

function emitWorldStateChange():
  void {
  for (
    const listener
    of listeners
  ) {
    listener();
  }
}

export function getRuntimeWorldState():
  WorldState {
  return worldState;
}

export function updateRuntimeWorldState(
  updater: (
    current:
      WorldState
  ) => WorldState
): void {
  worldState =
    updater(
      worldState
    );

  emitWorldStateChange();
}

export function getWorldTime():
  WorldMinute {
  return worldState
    .simulation
    .worldTimeMinutes;
}

export function setWorldTime(
  worldTimeMinutes:
    WorldMinute
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,

      simulation: {
        ...current.simulation,

        worldTimeMinutes,
      },
    })
  );
}

export function setWorldPaused(
  paused:
    boolean
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,

      simulation: {
        ...current.simulation,

        paused,
      },
    })
  );
}

export function getEntityPosition(
  entityId:
    string
): Position | undefined {
  return worldState
    .simulation
    .entityPositions[
      entityId
    ];
}

export function setEntityPosition(
  entityId:
    string,
  position:
    Position
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,

      simulation: {
        ...current.simulation,

        entityPositions: {
          ...current
            .simulation
            .entityPositions,

          [entityId]:
            position,
        },
      },
    })
  );
}

export function setActiveMovement(
  movement:
    ActiveMovement
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,

      simulation: {
        ...current.simulation,

        activeMovements: {
          ...current
            .simulation
            .activeMovements,

          [movement.entityId]:
            movement,
        },
      },
    })
  );
}

export function removeActiveMovement(
  entityId:
    string
): void {
  updateRuntimeWorldState(
    (current) => {
      const activeMovements = {
        ...current
          .simulation
          .activeMovements,
      };

      delete activeMovements[
        entityId
      ];

      return {
        ...current,

        simulation: {
          ...current
            .simulation,

          activeMovements,
        },
      };
    }
  );
}

export function replaceScheduledEvents(
  scheduledEvents:
    ScheduledEvent[]
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,

      simulation: {
        ...current.simulation,

        scheduledEvents,
      },
    })
  );
}

export function appendResolvedEvent(
  event:
    ResolvedEvent
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,

      simulation: {
        ...current.simulation,

        resolvedEvents: [
          ...current
            .simulation
            .resolvedEvents,

          event,
        ],
      },
    })
  );
}

export function allocateSimulationSequence():
  number {
  const sequence =
    worldState
      .simulation
      .nextSequence;

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      simulation: {
        ...current.simulation,

        nextSequence:
          current
            .simulation
            .nextSequence +
          1,
      },
    })
  );

  return sequence;
}

export function setPlayerSettledLocation(
  locationId:
    string
): void {
  const characterId =
    worldState
      .player
      .characterId;

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      player: {
        ...current.player,

        locationId,
      },

      characters: {
        ...current.characters,

        [characterId]: {
          ...current
            .characters[
              characterId
            ],

          locationId,
        },
      },
    })
  );
}

export function subscribeWorldState(
  listener:
    Listener
): () => void {
  listeners.add(
    listener
  );

  return () => {
    listeners.delete(
      listener
    );
  };
}