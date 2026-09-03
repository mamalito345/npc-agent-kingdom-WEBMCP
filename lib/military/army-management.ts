import {
  getConnectedEdges,
  getOtherNodeId,
} from "@/lib/map/graph";

import {
  supportArmy,
} from "@/lib/military/support";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

export type ArmyManagementError =
  | "ARMY_NOT_FOUND"
  | "CHARACTER_NOT_FOUND"
  | "NOT_SAME_OWNER"
  | "ARMY_DESTROYED"
  | "ARMY_MOVING"
  | "ARMY_IN_BATTLE"
  | "ARMY_NOT_AT_NODE"
  | "CHARACTER_NOT_PRESENT"
  | "SUPPORT_TARGET_NOT_ADJACENT"
  | "SAME_ARMY";

function nodeForEntity(
  entityId:
    string
): string | undefined {
  const position =
    getRuntimeWorldState()
      .simulation
      .entityPositions[
        entityId
      ];

  return position?.kind ===
    "node"
    ? position.nodeId
    : undefined;
}

export function areStrategicNodesAdjacent(
  nodeA:
    string,
  nodeB:
    string
): boolean {
  if (
    nodeA ===
    nodeB
  ) {
    return true;
  }

  return getConnectedEdges(
    nodeA
  ).some(
    (edge) =>
      getOtherNodeId(
        edge,
        nodeA
      ) === nodeB
  );
}

export function supportArmyFromAdjacentPosition(
  supporterArmyId:
    string,
  targetArmyId:
    string
) {
  if (
    supporterArmyId ===
    targetArmyId
  ) {
    return {
      ok:
        false as const,
      error:
        "SAME_ARMY" as const,
    };
  }

  const world =
    getRuntimeWorldState();

  const supporter =
    world.armies[
      supporterArmyId
    ];

  const target =
    world.armies[
      targetArmyId
    ];

  if (
    !supporter ||
    !target
  ) {
    return {
      ok:
        false as const,
      error:
        "ARMY_NOT_FOUND" as const,
    };
  }

  if (
    supporter.ownerId !==
    target.ownerId
  ) {
    return {
      ok:
        false as const,
      error:
        "NOT_SAME_OWNER" as const,
    };
  }

  if (
    supporter.status ===
      "destroyed" ||
    target.status ===
      "destroyed"
  ) {
    return {
      ok:
        false as const,
      error:
        "ARMY_DESTROYED" as const,
    };
  }

  if (
    world.simulation
      .activeMovements[
        supporterArmyId
      ]
  ) {
    return {
      ok:
        false as const,
      error:
        "ARMY_MOVING" as const,
    };
  }

  if (
    supporter.status ===
    "battle"
  ) {
    return {
      ok:
        false as const,
      error:
        "ARMY_IN_BATTLE" as const,
    };
  }

  const supporterNode =
    nodeForEntity(
      supporterArmyId
    );

  const targetNode =
    nodeForEntity(
      targetArmyId
    );

  if (
    !supporterNode ||
    !targetNode
  ) {
    return {
      ok:
        false as const,
      error:
        "ARMY_NOT_AT_NODE" as const,
    };
  }

  if (
    !areStrategicNodesAdjacent(
      supporterNode,
      targetNode
    )
  ) {
    return {
      ok:
        false as const,
      error:
        "SUPPORT_TARGET_NOT_ADJACENT" as const,
    };
  }

  return supportArmy(
    supporterArmyId,
    targetArmyId
  );
}

export function clearArmySupport(
  armyId:
    string
) {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return {
      ok:
        false as const,
      error:
        "ARMY_NOT_FOUND" as const,
    };
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      armies: {
        ...current.armies,

        [armyId]: {
          ...current.armies[
            armyId
          ],

          supportTargetArmyId:
            undefined,
        },
      },
    })
  );

  return {
    ok:
      true as const,
    armyId,
  };
}

export function assignArmyCommander(
  armyId:
    string,
  characterId:
    string
) {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  const character =
    world.characters[
      characterId
    ];

  if (!army) {
    return {
      ok:
        false as const,
      error:
        "ARMY_NOT_FOUND" as const,
    };
  }

  if (!character) {
    return {
      ok:
        false as const,
      error:
        "CHARACTER_NOT_FOUND" as const,
    };
  }

  if (
    army.ownerId !==
    character.kingdomId
  ) {
    return {
      ok:
        false as const,
      error:
        "NOT_SAME_OWNER" as const,
    };
  }

  if (
    army.status ===
    "destroyed"
  ) {
    return {
      ok:
        false as const,
      error:
        "ARMY_DESTROYED" as const,
    };
  }

  if (
    army.status ===
    "battle"
  ) {
    return {
      ok:
        false as const,
      error:
        "ARMY_IN_BATTLE" as const,
    };
  }

  if (
    world.simulation
      .activeMovements[
        armyId
      ]
  ) {
    return {
      ok:
        false as const,
      error:
        "ARMY_MOVING" as const,
    };
  }

  const armyNode =
    nodeForEntity(
      armyId
    );

  const characterNode =
    nodeForEntity(
      characterId
    );

  if (
    !armyNode ||
    !characterNode ||
    armyNode !==
      characterNode
  ) {
    return {
      ok:
        false as const,
      error:
        "CHARACTER_NOT_PRESENT" as const,
    };
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      armies: {
        ...current.armies,

        [armyId]: {
          ...current.armies[
            armyId
          ],

          commanderId:
            characterId,
        },
      },
    })
  );

  return {
    ok:
      true as const,
    armyId,
    commanderId:
      characterId,
  };
}
