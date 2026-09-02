import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getDeliveredPlayerKnowledge,
} from "@/lib/session/knowledge";

import {
  getPlayerOrders,
} from "@/lib/session/orders";

export function getPlayerObservation(
  playerId:
    string
) {
  const world =
    getRuntimeWorldState();

  const player =
    world.session
      .players[
        playerId
      ];

  if (!player) {
    return undefined;
  }

  const character =
    world.characters[
      player.characterId
    ];

  const characterPosition =
    world.simulation
      .entityPositions[
        player.characterId
      ];

  const ownArmies =
    Object.values(
      world.armies
    )
      .filter(
        (army) =>
          army.ownerId ===
          player.kingdomId
      )
      .map(
        (army) => ({
          id:
            army.id,

          status:
            army.status,

          morale:
            army.morale,

          supplyState:
            army
              .supply
              .state,

          commanderId:
            army.commanderId,

          position:
            world
              .simulation
              .entityPositions[
                army.id
              ] ??
            null,

          moving:
            world
              .simulation
              .activeMovements[
                army.id
              ] !==
            undefined,
        })
      );

  const kingdom =
    world.kingdoms[
      player.kingdomId
    ];

  return {
    sessionId:
      world.session.id,

    worldTimeMinutes:
      world
        .simulation
        .worldTimeMinutes,

    player: {
      id:
        player.id,

      controllerType:
        player
          .controllerType,

      characterId:
        player
          .characterId,

      kingdomId:
        player
          .kingdomId,
    },

    commandWindow: {
      phase:
        world.session
          .commandCycle
          .phase,

      currentPlayerId:
        world.session
          .commandCycle
          .currentPlayerId,

      yourTurn:
        world.session
          .commandCycle
          .currentPlayerId ===
        playerId,

      interrupt:
        world.session
          .commandCycle
          .interrupt ??
        null,
    },

    character: character
      ? {
          id:
            character.id,

          name:
            character.name,

          position:
            characterPosition ??
            null,

          treasury:
            character
              .treasury,
        }
      : null,

    kingdom: kingdom
      ? {
          id:
            kingdom.id,

          name:
            kingdom.name,

          treasury:
            kingdom
              .treasury,

          stability:
            kingdom
              .stability,

          food:
            kingdom.food,
        }
      : null,

    ownArmies,

    orders:
      getPlayerOrders(
        playerId
      ),

    /*
     * Other realms / enemy forces
     * appear only through the player's
     * knowledge layer.
     */
    knownWorld:
      getDeliveredPlayerKnowledge(
        playerId
      ),
  };
}