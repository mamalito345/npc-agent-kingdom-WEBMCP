import { getRealmBudgetSnapshot } from "@/lib/economy/realm-budget";
import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getDeliveredPlayerKnowledge,
} from "@/lib/session/knowledge";

import {
  getPlayerOrders,
} from "@/lib/session/orders";

import {
  validatePlayerAccess,
} from "@/lib/session/access";

export function getPlayerKnownWorld(
  sessionId:
    string,
  playerId:
    string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  return {
    ok:
      true as const,

    worldTimeMinutes:
      getRuntimeWorldState()
        .simulation
        .worldTimeMinutes,

    facts:
      getDeliveredPlayerKnowledge(
        playerId
      ),
  };
}

export function getPlayerKnownEnemyForces(
  sessionId:
    string,
  playerId:
    string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const facts =
    getDeliveredPlayerKnowledge(
      playerId
    )
      .filter(
        (fact) =>
          fact.kind ===
          "army"
      )
      .filter(
        (fact) => {
          const canonicalArmy =
            world.armies[
              fact.subjectId
            ];

          /*
           * Canonical lookup here is used
           * only to determine ownership.
           *
           * We DO NOT add canonical position,
           * composition or movement data to
           * the returned fact.
           */
          return (
            canonicalArmy ===
              undefined ||
            canonicalArmy.ownerId !==
              access
                .player
                .kingdomId
          );
        }
      );

  return {
    ok:
      true as const,

    forces:
      facts,
  };
}

export function getPlayerMessages(
  sessionId:
    string,
  playerId:
    string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const characterId =
    access
      .player
      .characterId;

  const now =
    world.simulation
      .worldTimeMinutes;

  const messages =
    Object.values(
      world.messages
    )
      .filter(
        (message) => {
          /*
           * Sender may inspect its own
           * outgoing dispatch immediately.
           */
          if (
            message.senderId ===
            characterId
          ) {
            return true;
          }

          /*
           * Recipient does not know the
           * message until courier delivery.
           */
          return (
            message.recipientId ===
              characterId &&
            message.deliveredAt !==
              undefined &&
            message.deliveredAt <=
              now
          );
        }
      )
      .sort(
        (a, b) =>
          a.createdAt -
            b.createdAt ||
          a.id.localeCompare(
            b.id
          )
      );

  return {
    ok:
      true as const,

    messages,
  };
}

export function getPlayerBattlesView(
  sessionId:
    string,
  playerId:
    string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const ownArmyIds =
    new Set(
      Object.values(
        world.armies
      )
        .filter(
          (army) =>
            army.ownerId ===
            access
              .player
              .kingdomId
        )
        .map(
          (army) =>
            army.id
        )
    );

  const battles =
    Object.values(
      world.battles
    )
      .filter(
        (battle) =>
          battle
            .attackerArmyIds
            .some(
              (armyId) =>
                ownArmyIds.has(
                  armyId
                )
            ) ||
          battle
            .defenderArmyIds
            .some(
              (armyId) =>
                ownArmyIds.has(
                  armyId
                )
            )
      )
      .sort(
        (a, b) =>
          a.startedAt -
            b.startedAt ||
          a.id.localeCompare(
            b.id
          )
      );

  const knownRemoteBattles =
    getDeliveredPlayerKnowledge(
      playerId
    ).filter(
      (fact) =>
        fact.kind ===
        "battle"
    );

  return {
    ok:
      true as const,

    ownBattles:
      battles,

    knownRemoteBattles,
  };
}

export function getPlayerSettlementsView(
  sessionId:
    string,
  playerId:
    string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const ownSettlements =
    Object.values(
      world.settlements
    )
      .filter(
        (settlement) =>
          (
            settlement
              .controllerKingdomId ??
            settlement.kingdomId
          ) ===
          access
            .player
            .kingdomId
      )
      .map(
        (settlement) => ({
          id:
            settlement.id,

          locationId:
            settlement.locationId,

          type:
            settlement.type,

          kingdomId:
            settlement.kingdomId,

          controllerKingdomId:
            settlement
              .controllerKingdomId ??
            settlement.kingdomId,

          ownerId:
            settlement.ownerId,

          fortificationLevel:
            settlement
              .fortificationLevel ??
            0,

          fortificationIntegrity:
            settlement
              .fortificationIntegrity ??
            0,
        })
      );

  const knownForeignSettlements =
    getDeliveredPlayerKnowledge(
      playerId
    ).filter(
      (fact) =>
        fact.kind ===
        "settlement"
    );

  return {
    ok:
      true as const,

    ownSettlements,

    knownForeignSettlements,
  };
}

export function getPlayerEconomyView(
  sessionId:
    string,
  playerId:
    string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const kingdom =
    world.kingdoms[
      access
        .player
        .kingdomId
    ];

  if (!kingdom) {
    return {
      ok:
        false as const,

      error:
        "KINGDOM_NOT_FOUND",
    };
  }

  const budget =
    getRealmBudgetSnapshot(
      kingdom.id
    );

  return {
    ok:
      true as const,

    kingdom: {
      id:
        kingdom.id,

      name:
        kingdom.name,

      treasury:
        kingdom.treasury,

      food:
        kingdom.food,

      stability:
        kingdom.stability,
    },

    budget,

    guidance: {
      reserveIsAdvisory:
        true,

      maySpendBelowReserve:
        true,

      note:
        "Recommended reserve is planning guidance, not a hard spending restriction.",
    },
  };
}

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

          fundingState:
            army
              .funding
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

          movement:
            world
              .simulation
              .activeMovements[
                army.id
              ] ??
            null,
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

      displayName:
        player
          .displayName,

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

      requiredPlayerIds:
        [
          ...world
            .session
            .commandCycle
            .requiredPlayerIds,
        ],

      readyPlayerIds:
        [
          ...world
            .session
            .commandCycle
            .readyPlayerIds,
        ],

      interrupt:
        world.session
          .commandCycle
          .interrupt ??
        null,
    },

    character:
      character
        ? {
            id:
              character.id,

            name:
              character.name,

            rank:
              character.rank,

            position:
              characterPosition ??
              null,

            treasury:
              character
                .treasury,
          }
        : null,

    kingdom:
      kingdom
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

    knownWorld:
      getDeliveredPlayerKnowledge(
        playerId
      ),
  };
}