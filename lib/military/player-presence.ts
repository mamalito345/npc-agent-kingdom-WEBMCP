import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  PersistentBattle,
} from "@/types/military";

export function isPlayerPresentAtBattle(
  battle:
    PersistentBattle
): boolean {
  const world =
    getRuntimeWorldState();

  const playerCharacterId =
    world.player.characterId;

  const playerPosition =
    world.simulation
      .entityPositions[
        playerCharacterId
      ];

  if (
    !playerPosition ||
    playerPosition.kind !==
      "node"
  ) {
    return false;
  }

  if (
    playerPosition.nodeId !==
    battle.nodeId
  ) {
    return false;
  }

  return true;
}

export function getPlayerControlledArmyId(
  battle:
    PersistentBattle
): string | undefined {
  const world =
    getRuntimeWorldState();

  const playerCharacterId =
    world.player.characterId;

  const participatingArmyIds = [
    ...battle.attackerArmyIds,
    ...battle.defenderArmyIds,
  ];

  const commandedArmy =
    participatingArmyIds.find(
      (armyId) =>
        world.armies[
          armyId
        ]?.commanderId ===
        playerCharacterId
    );

  if (
    commandedArmy
  ) {
    return commandedArmy;
  }

  const playerCharacter =
    world.characters[
      playerCharacterId
    ];

  if (
    !playerCharacter
  ) {
    return undefined;
  }

  return participatingArmyIds.find(
    (armyId) =>
      world.armies[
        armyId
      ]?.ownerId ===
      playerCharacter.kingdomId
  );
}