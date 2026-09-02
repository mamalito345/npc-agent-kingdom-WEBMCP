import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getBattlePhaseDuration,
} from "@/lib/military/battle-timeline";

import type {
  PersistentBattle,
} from "@/types/military";

export interface StartBattleInput {
  attackerArmyId:
    string;

  defenderArmyId:
    string;

  contactId?:
    string;
}

export type StartBattleError =
  | "ARMY_NOT_FOUND"
  | "SAME_ARMY"
  | "SAME_OWNER"
  | "ARMY_DESTROYED"
  | "ARMIES_NOT_AT_SAME_NODE"
  | "ARMY_ALREADY_IN_BATTLE"
  | "INVALID_CONTACT";

export type StartBattleResult =
  | {
      ok: false;
      error:
        StartBattleError;
    }
  | {
      ok: true;
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
  return (
    getRuntimeWorldState()
      .battles[
        battleId
      ]
  );
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
      ok: false,
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
      ok: false,
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
      ok: false,
      error:
        "ARMY_DESTROYED",
    };
  }

  if (
    attacker.ownerId ===
    defender.ownerId
  ) {
    return {
      ok: false,
      error:
        "SAME_OWNER",
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
      ok: false,
      error:
        "ARMIES_NOT_AT_SAME_NODE",
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
      ok: false,
      error:
        "ARMY_ALREADY_IN_BATTLE",
    };
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
        ok: false,
        error:
          "INVALID_CONTACT",
      };
    }
  }

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

  const battle:
    PersistentBattle = {
    id:
      battleId,

    contactId:
      input.contactId,

    nodeId:
      attackerPosition.nodeId,

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
      getBattlePhaseDuration(
        "contact"
      ),

    status:
      "active",
    
    activeOrders: [],

    history: [
      {
        id:
          historyId,

        timestamp:
          now,

        type:
          "battle_started",

        summary:
          `Battle started between ${attacker.id} and ${defender.id} at ${attackerPosition.nodeId}.`,
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
              ...state.armyContacts,

              [input.contactId]: {
                ...state
                  .armyContacts[
                    input.contactId
                  ],

                status:
                  "resolved",
              },
            }
          : state.armyContacts,
    })
  );

  return {
    ok: true,
    battle,
  };
}