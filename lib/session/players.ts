import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  PlayerSlot,
} from "@/types/session";

export function getPlayerSlot(
  playerId: string
): PlayerSlot | undefined {
  return getRuntimeWorldState()
    .session.players[playerId];
}

export function getActivePlayerSlots():
  PlayerSlot[] {
  return Object.values(
    getRuntimeWorldState().session.players
  )
    .filter((player) => player.active)
    .sort((a, b) => {
      const order =
        getRuntimeWorldState()
          .session.commandCycle.playerOrder;

      return (
        order.indexOf(a.id) -
        order.indexOf(b.id)
      );
    });
}

export function getPlayerIdForCharacter(
  characterId: string
): string | undefined {
  return Object.values(
    getRuntimeWorldState().session.players
  ).find(
    (player) =>
      player.characterId === characterId
  )?.id;
}

export function getPlayerIdForKingdom(
  kingdomId: string
): string | undefined {
  return Object.values(
    getRuntimeWorldState().session.players
  ).find(
    (player) =>
      player.kingdomId === kingdomId
  )?.id;
}

function armyIsIndependentLordForce(
  armyId: string
): boolean {
  return Object.values(
    getRuntimeWorldState().session.lords.profiles
  ).some(
    (profile) =>
      profile.controlledArmyIds.includes(
        armyId
      )
  );
}

export function playerControlsArmy(
  playerId: string,
  armyId: string
): boolean {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[playerId];

  const army =
    world.armies[armyId];

  if (!player || !army) {
    return false;
  }

  if (
    army.ownerId !==
    player.kingdomId
  ) {
    return false;
  }

  /*
   * A realm ruler does not directly puppeteer a major lord's independent
   * household army. The ruler must use issue_character_order; GM Character
   * decides compliance, then the canonical lord service moves the force.
   */
  if (
    armyIsIndependentLordForce(
      armyId
    )
  ) {
    return false;
  }

  return true;
}

export function playerControlsCharacter(
  playerId: string,
  characterId: string
): boolean {
  const player =
    getPlayerSlot(playerId);

  return (
    player?.characterId ===
    characterId
  );
}
