import {
  detectArmyContacts,
} from "@/lib/military/contact";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getPlayerIdForKingdom,
} from "@/lib/session/players";

import {
  addPlayerKnowledge,
} from "@/lib/session/knowledge";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import type {
  SimulationInterrupt,
} from "@/types/simulation";

export function processArmyContactInterrupt():
  SimulationInterrupt | undefined {
  const contacts =
    detectArmyContacts();

  const contact =
    contacts[0];

  if (!contact) {
    return undefined;
  }

  const world =
    getRuntimeWorldState();

  const armyA =
    world.armies[
      contact.armyAId
    ];

  const armyB =
    world.armies[
      contact.armyBId
    ];

  const playerIds =
    [
      armyA
        ? getPlayerIdForKingdom(
            armyA.ownerId
          )
        : undefined,

      armyB
        ? getPlayerIdForKingdom(
            armyB.ownerId
          )
        : undefined,
    ].filter(
      (
        value
      ): value is string =>
        value !==
        undefined
    );

  const affectedPlayerIds =
    [
      ...new Set(
        playerIds
      ),
    ];

  const now =
    world.simulation
      .worldTimeMinutes;

  for (
    const playerId
    of affectedPlayerIds
  ) {
    const player =
      world.session
        .players[
          playerId
        ];

    if (!player) {
      continue;
    }

    const enemyArmyId =
      armyA?.ownerId ===
      player.kingdomId
        ? contact.armyBId
        : contact.armyAId;

    addPlayerKnowledge({
      playerId,

      subjectId:
        enemyArmyId,

      kind:
        "army",

      observedAt:
        now,

      deliveredAt:
        now,

      source:
        "direct_observation",

      confidence:
        "confirmed",

      summary:
        `Enemy army ${enemyArmyId} encountered at ${contact.nodeId}.`,

      data: {
        nodeId:
          contact.nodeId,

        contactId:
          contact.id,
      },
    });
  }

  const message =
    `Enemy armies ${contact.armyAId} and ${contact.armyBId} encountered each other at ${contact.nodeId}.`;

  if (
    affectedPlayerIds.length >
    0
  ) {
    openCommandInterrupt({
      type:
        "ENEMY_SIGHTED",

      affectedPlayerIds,

      message,
    });
  }

  return {
    eventId:
      contact.id,

    type:
      "ARMY_CONTACT",

    message,

    affectedPlayerIds,
  };
}