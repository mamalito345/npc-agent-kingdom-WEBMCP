import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getBattleTerrainForEdge,
  getBattleTerrainForNode,
} from "@/data/battle-terrain";

import {
  getMapEdge,
} from "@/lib/map/graph";

import {
  ensureActiveWarBetweenRealms,
} from "@/lib/military/war";

import type {
  PersistentBattle,
} from "@/types/military";

export interface RoadBattlePosition {
  edgeId:
    string;

  progress:
    number;
}

export interface StartBattleInput {
  attackerArmyId:
    string;

  defenderArmyId:
    string;

  contactId?:
    string;

  /*
   * When supplied, armies are allowed
   * to start battle on an exact road
   * position rather than a graph node.
   */
  roadPosition?:
    RoadBattlePosition;
}

export type StartBattleError =
  | "ARMY_NOT_FOUND"
  | "SAME_ARMY"
  | "SAME_OWNER"
  | "ARMY_DESTROYED"
  | "ARMIES_NOT_AT_SAME_NODE"
  | "ARMIES_NOT_AT_SAME_ROAD_POSITION"
  | "ARMY_ALREADY_IN_BATTLE"
  | "INVALID_CONTACT"
  | "INVALID_ROAD_POSITION";

export type StartBattleResult =
  | {
      ok:
        false;

      error:
        StartBattleError;
    }
  | {
      ok:
        true;

      battle:
        PersistentBattle;
    };

function armyIsAlreadyInBattle(
  armyId:
    string
): boolean {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.battles
  ).some(
    (battle) =>
      battle.status ===
        "active" &&
      (
        battle
          .attackerArmyIds
          .includes(
            armyId
          ) ||
        battle
          .defenderArmyIds
          .includes(
            armyId
          )
      )
  );
}

export function getBattle(
  battleId:
    string
): PersistentBattle | undefined {
  return getRuntimeWorldState()
    .battles[
      battleId
    ];
}

export function getActiveBattles():
  PersistentBattle[] {
  return Object.values(
    getRuntimeWorldState()
      .battles
  )
    .filter(
      (battle) =>
        battle.status ===
        "active"
    )
    .sort(
      (a, b) =>
        a.startedAt -
          b.startedAt ||
        a.id.localeCompare(
          b.id
        )
    );
}

export function startBattle(
  input:
    StartBattleInput
): StartBattleResult {
  if (
    input.attackerArmyId ===
    input.defenderArmyId
  ) {
    return {
      ok:
        false,

      error:
        "SAME_ARMY",
    };
  }

  const world =
    getRuntimeWorldState();

  const attacker =
    world.armies[
      input.attackerArmyId
    ];

  const defender =
    world.armies[
      input.defenderArmyId
    ];

  if (
    !attacker ||
    !defender
  ) {
    return {
      ok:
        false,

      error:
        "ARMY_NOT_FOUND",
    };
  }

  if (
    attacker.status ===
      "destroyed" ||
    defender.status ===
      "destroyed"
  ) {
    return {
      ok:
        false,

      error:
        "ARMY_DESTROYED",
    };
  }

  if (
    attacker.ownerId ===
    defender.ownerId
  ) {
    return {
      ok:
        false,

      error:
        "SAME_OWNER",
    };
  }

  if (
    armyIsAlreadyInBattle(
      attacker.id
    ) ||
    armyIsAlreadyInBattle(
      defender.id
    )
  ) {
    return {
      ok:
        false,

      error:
        "ARMY_ALREADY_IN_BATTLE",
    };
  }

  const attackerPosition =
    world.simulation
      .entityPositions[
        attacker.id
      ];

  const defenderPosition =
    world.simulation
      .entityPositions[
        defender.id
      ];

  let battleNodeId:
    string;

  let terrain =
    getBattleTerrainForNode(
      ""
    );

  if (
    input.roadPosition
  ) {
    const edge =
      getMapEdge(
        input
          .roadPosition
          .edgeId
      );

    if (!edge) {
      return {
        ok:
          false,

        error:
          "INVALID_ROAD_POSITION",
      };
    }

    if (
      !attackerPosition ||
      !defenderPosition ||
      attackerPosition.kind !==
        "edge" ||
      defenderPosition.kind !==
        "edge" ||
      attackerPosition.edgeId !==
        input
          .roadPosition
          .edgeId ||
      defenderPosition.edgeId !==
        input
          .roadPosition
          .edgeId ||
      Math.abs(
        attackerPosition.progress -
          input
            .roadPosition
            .progress
      ) >
        0.001 ||
      Math.abs(
        defenderPosition.progress -
          input
            .roadPosition
            .progress
      ) >
        0.001
    ) {
      return {
        ok:
          false,

        error:
          "ARMIES_NOT_AT_SAME_ROAD_POSITION",
      };
    }

    battleNodeId =
      input
        .roadPosition
        .progress <
      0.5
        ? edge.fromNodeId
        : edge.toNodeId;

    terrain =
      getBattleTerrainForEdge(
        edge.id
      );
  } else {
    if (
      !attackerPosition ||
      !defenderPosition ||
      attackerPosition.kind !==
        "node" ||
      defenderPosition.kind !==
        "node" ||
      attackerPosition.nodeId !==
        defenderPosition.nodeId
    ) {
      return {
        ok:
          false,

        error:
          "ARMIES_NOT_AT_SAME_NODE",
      };
    }

    battleNodeId =
      attackerPosition
        .nodeId;

    terrain =
      getBattleTerrainForNode(
        battleNodeId
      );
  }

  if (
    input.contactId
  ) {
    const contact =
      world.armyContacts[
        input.contactId
      ];

    if (
      !contact ||
      contact.status !==
        "pending"
    ) {
      return {
        ok:
          false,

        error:
          "INVALID_CONTACT",
      };
    }
  }

  const war =
    ensureActiveWarBetweenRealms(
      attacker.ownerId,
      defender.ownerId
    );

  const sequence =
    allocateSimulationSequence();

  const current =
    getRuntimeWorldState();

  const now =
    current.simulation
      .worldTimeMinutes;

  const battleId =
    `battle-state-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const historyId =
    `battle-history-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}-001`;

  const locationText =
    input.roadPosition
      ? `road ${input.roadPosition.edgeId} at ${(
          input.roadPosition.progress *
          100
        ).toFixed(
          1
        )}%`
      : battleNodeId;

  const battle:
    PersistentBattle = {
    id:
      battleId,

    warId:
      war.id,

    contactId:
      input.contactId,

    /*
     * nodeId remains the operational
     * anchor used by existing combat
     * and retreat systems.
     *
     * Exact army physical positions
     * remain in entityPositions.
     */
    nodeId:
      battleNodeId,

    attackerArmyIds: [
      attacker.id,
    ],

    defenderArmyIds: [
      defender.id,
    ],

    startedAt:
      now,

    currentPhase:
      "contact",

    nextPhaseAt:
      now +
      60,

    status:
      "active",

    battleHour:
      0,

    frontMomentum:
      0,

    attackerTactic:
      "aggressive_push",

    defenderTactic:
      "hold_ground",

    attackerMoralePressure:
      0,

    defenderMoralePressure:
      0,

    attackerReserveCommitted:
      false,

    defenderReserveCommitted:
      false,

    terrain:
      terrain.terrain,

    features: [
      ...terrain.features,
    ],

    rounds:
      [],

    activeOrders:
      [],

    history: [
      {
        id:
          historyId,

        timestamp:
          now,

        type:
          "battle_started",

        summary:
          `Battle started between ${attacker.id} and ${defender.id} at ${locationText} during war ${war.id}.`,
      },
    ],
  };

  updateRuntimeWorldState(
    (state) => ({
      ...state,

      battles: {
        ...state.battles,

        [battle.id]:
          battle,
      },

      armies: {
        ...state.armies,

        [attacker.id]: {
          ...state.armies[
            attacker.id
          ],

          status:
            "battle",
        },

        [defender.id]: {
          ...state.armies[
            defender.id
          ],

          status:
            "battle",
        },
      },

      armyContacts:
        input.contactId
          ? {
              ...state
                .armyContacts,

              [input.contactId]: {
                ...state
                  .armyContacts[
                    input.contactId
                  ],

                status:
                  "resolved",
              },
            }
          : state
              .armyContacts,
    })
  );

  return {
    ok:
      true,

    battle,
  };
}