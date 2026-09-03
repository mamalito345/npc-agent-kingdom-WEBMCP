import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  areKingdomsAtWar,
} from "@/lib/politics/war";

import type {
  Army,
  ArmyContact,
  PersistentBattle,
} from "@/types/military";

function armiesAreHostile(
  armyA:
    Army,
  armyB:
    Army
): boolean {
  /*
   * Real war model: two armies only fight if their kingdoms are
   * actually at war with each other. Different-kingdom armies at
   * peace (or allied) can now share a node/road without triggering
   * combat, which makes declaring war -- and everything it costs --
   * mean something instead of being cosmetic.
   */
  if (
    armyA.ownerId ===
    armyB.ownerId
  ) {
    return false;
  }

  return areKingdomsAtWar(
    armyA.ownerId,
    armyB.ownerId
  );
}

function contactAlreadyExists(
  armyAId:
    string,
  armyBId:
    string,
  nodeId:
    string
): boolean {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.armyContacts
  ).some(
    (contact) =>
      contact.status ===
        "pending" &&
      contact.nodeId ===
        nodeId &&
      (
        (
          contact.armyAId ===
            armyAId &&
          contact.armyBId ===
            armyBId
        ) ||
        (
          contact.armyAId ===
            armyBId &&
          contact.armyBId ===
            armyAId
        )
      )
  );
}

function battleContainsArmy(
  battle:
    PersistentBattle,
  armyId:
    string
): boolean {
  return (
    battle.attackerArmyIds.includes(
      armyId
    ) ||
    battle.defenderArmyIds.includes(
      armyId
    )
  );
}

function getActiveBattleForArmy(
  armyId:
    string
): PersistentBattle | undefined {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.battles
  ).find(
    (battle) =>
      battle.status ===
        "active" &&
      battleContainsArmy(
        battle,
        armyId
      )
  );
}

function getActiveBattleAtNode(
  nodeId:
    string
): PersistentBattle | undefined {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.battles
  )
    .filter(
      (battle) =>
        battle.status ===
          "active" &&
        battle.nodeId ===
          nodeId
    )
    .sort(
      (a, b) =>
        a.startedAt -
          b.startedAt ||
        a.id.localeCompare(
          b.id
        )
    )[0];
}

function getBattleSideForArmy(
  battle:
    PersistentBattle,
  armyId:
    string
):
  | "attacker"
  | "defender"
  | undefined {
  if (
    battle.attackerArmyIds.includes(
      armyId
    )
  ) {
    return "attacker";
  }

  if (
    battle.defenderArmyIds.includes(
      armyId
    )
  ) {
    return "defender";
  }

  return undefined;
}

function getBattleRealmIds(
  battle:
    PersistentBattle
): {
  attackerRealmIds:
    Set<string>;
  defenderRealmIds:
    Set<string>;
} {
  const world =
    getRuntimeWorldState();

  const attackerRealmIds =
    new Set<string>();

  const defenderRealmIds =
    new Set<string>();

  for (
    const armyId
    of battle.attackerArmyIds
  ) {
    const army =
      world.armies[
        armyId
      ];

    if (army) {
      attackerRealmIds.add(
        army.ownerId
      );
    }
  }

  for (
    const armyId
    of battle.defenderArmyIds
  ) {
    const army =
      world.armies[
        armyId
      ];

    if (army) {
      defenderRealmIds.add(
        army.ownerId
      );
    }
  }

  return {
    attackerRealmIds,
    defenderRealmIds,
  };
}

function determineJoinSide(
  battle:
    PersistentBattle,
  joiningArmy:
    Army
):
  | "attacker"
  | "defender"
  | undefined {
  const {
    attackerRealmIds,
    defenderRealmIds,
  } =
    getBattleRealmIds(
      battle
    );

  //
  // Same realm as one of the sides:
  // join that side.
  //
  if (
    attackerRealmIds.has(
      joiningArmy.ownerId
    )
  ) {
    return "attacker";
  }

  if (
    defenderRealmIds.has(
      joiningArmy.ownerId
    )
  ) {
    return "defender";
  }

  //
  // Package 3 fallback:
  //
  // No diplomacy/war alliance model yet.
  // If army is hostile to attacker
  // realms but not defender realms,
  // join defender.
  //
  // If hostile to defender realms
  // but not attacker realms,
  // join attacker.
  //
  const world =
    getRuntimeWorldState();

  const attackerArmy =
    battle.attackerArmyIds
      .map(
        (armyId) =>
          world.armies[
            armyId
          ]
      )
      .find(
        (
          army
        ): army is Army =>
          army !==
          undefined
      );

  const defenderArmy =
    battle.defenderArmyIds
      .map(
        (armyId) =>
          world.armies[
            armyId
          ]
      )
      .find(
        (
          army
        ): army is Army =>
          army !==
          undefined
      );

  if (
    !attackerArmy ||
    !defenderArmy
  ) {
    return undefined;
  }

  const hostileToAttacker =
    armiesAreHostile(
      joiningArmy,
      attackerArmy
    );

  const hostileToDefender =
    armiesAreHostile(
      joiningArmy,
      defenderArmy
    );

  //
  // With the current simplified
  // Package 3 hostility model,
  // a third unrelated kingdom would
  // be hostile to both.
  //
  // We MUST NOT guess which side
  // it supports.
  //
  if (
    hostileToAttacker &&
    hostileToDefender
  ) {
    return undefined;
  }

  if (
    hostileToAttacker
  ) {
    return "defender";
  }

  if (
    hostileToDefender
  ) {
    return "attacker";
  }

  return undefined;
}

function joinArmyToBattle(
  battleId:
    string,
  armyId:
    string,
  side:
    "attacker" |
    "defender"
): void {
  updateRuntimeWorldState(
    (current) => {
      const battle =
        current.battles[
          battleId
        ];

      const army =
        current.armies[
          armyId
        ];

      if (
        !battle ||
        !army ||
        battle.status !==
          "active"
      ) {
        return current;
      }

      if (
        battleContainsArmy(
          battle,
          armyId
        )
      ) {
        return current;
      }

      const attackerArmyIds =
        side ===
        "attacker"
          ? [
              ...battle
                .attackerArmyIds,
              armyId,
            ]
          : battle
              .attackerArmyIds;

      const defenderArmyIds =
        side ===
        "defender"
          ? [
              ...battle
                .defenderArmyIds,
              armyId,
            ]
          : battle
              .defenderArmyIds;

      return {
        ...current,

        battles: {
          ...current.battles,

          [battleId]: {
            ...battle,

            attackerArmyIds,

            defenderArmyIds,

            history: [
              ...battle.history,

              {
                id:
                  `${battle.id}-history-${(
                    battle
                      .history
                      .length +
                    1
                  )
                    .toString()
                    .padStart(
                      3,
                      "0"
                    )}`,

                timestamp:
                  current
                    .simulation
                    .worldTimeMinutes,

                type:
                  "phase_changed",

                summary:
                  `Army ${armyId} joined the battle on the ${side} side.`,
              },
            ],
          },
        },

        armies: {
          ...current.armies,

          [armyId]: {
            ...army,

            status:
              "battle",
          },
        },
      };
    }
  );
}

function recentlyResolvedSameEncounter(
  armyAId:
    string,
  armyBId:
    string,
  nodeId:
    string
): boolean {
  const world =
    getRuntimeWorldState();

  const now =
    world.simulation
      .worldTimeMinutes;

  return Object.values(
    world.battleResults
  ).some(
    (battleResult) => {
      const samePair =
        (
          battleResult
            .attackerArmyId ===
            armyAId &&
          battleResult
            .defenderArmyId ===
            armyBId
        ) ||
        (
          battleResult
            .attackerArmyId ===
            armyBId &&
          battleResult
            .defenderArmyId ===
            armyAId
        );

      if (!samePair) {
        return false;
      }

      if (
        battleResult.nodeId !==
        nodeId
      ) {
        return false;
      }

      //
      // Prevent immediate
      // post-battle contact spam.
      //
      // This is NOT permanent.
      //
      return (
        now -
        battleResult.resolvedAt
      ) <= 60;
    }
  );
}

function tryJoinExistingBattle(
  army:
    Army,
  nodeId:
    string
): boolean {
  //
  // Army already belongs to
  // an active battle.
  //
  if (
    getActiveBattleForArmy(
      army.id
    )
  ) {
    return true;
  }

  const battle =
    getActiveBattleAtNode(
      nodeId
    );

  if (!battle) {
    return false;
  }

  const side =
    determineJoinSide(
      battle,
      army
    );

  //
  // There is a battle here,
  // but we cannot safely decide
  // which side this army supports.
  //
  // Do not mutate the battle.
  //
  if (!side) {
    return false;
  }

  joinArmyToBattle(
    battle.id,
    army.id,
    side
  );

  return true;
}

export function detectArmyContacts():
  ArmyContact[] {
  const world =
    getRuntimeWorldState();

  const armies =
    Object.values(
      world.armies
    )
      .filter(
        (army) =>
          army.status !==
          "destroyed"
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id
          )
      );

  const created:
    ArmyContact[] = [];

  //
  // ==================================================
  // PASS 1
  //
  // Armies arriving at an existing battle
  // may reinforce one of the sides.
  // ==================================================
  //
  for (
    const army
    of armies
  ) {
    if (
      army.status ===
        "battle"
    ) {
      continue;
    }

    const position =
      world.simulation
        .entityPositions[
          army.id
        ];

    if (
      !position ||
      position.kind !==
        "node"
    ) {
      continue;
    }

    tryJoinExistingBattle(
      army,
      position.nodeId
    );
  }

  //
  // Refresh because PASS 1 may
  // have mutated battle/army state.
  //
  const refreshedWorld =
    getRuntimeWorldState();

  const refreshedArmies =
    Object.values(
      refreshedWorld.armies
    )
      .filter(
        (army) =>
          army.status !==
          "destroyed"
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id
          )
      );

  //
  // ==================================================
  // PASS 2
  //
  // Create NEW contacts only between
  // armies that are not already
  // participating in a battle.
  // ==================================================
  //
  for (
    let leftIndex = 0;
    leftIndex <
    refreshedArmies.length;
    leftIndex += 1
  ) {
    for (
      let rightIndex =
        leftIndex + 1;
      rightIndex <
      refreshedArmies.length;
      rightIndex += 1
    ) {
      const left =
        refreshedArmies[
          leftIndex
        ];

      const right =
        refreshedArmies[
          rightIndex
        ];

      //
      // Existing battle participants
      // must NEVER produce a new contact
      // with one another.
      //
      if (
        left.status ===
          "battle" ||
        right.status ===
          "battle"
      ) {
        continue;
      }

      if (
        !armiesAreHostile(
          left,
          right
        )
      ) {
        continue;
      }

      const leftPosition =
        refreshedWorld
          .simulation
          .entityPositions[
            left.id
          ];

      const rightPosition =
        refreshedWorld
          .simulation
          .entityPositions[
            right.id
          ];

      if (
        !leftPosition ||
        !rightPosition ||
        leftPosition.kind !==
          "node" ||
        rightPosition.kind !==
          "node"
      ) {
        continue;
      }

      if (
        leftPosition.nodeId !==
        rightPosition.nodeId
      ) {
        continue;
      }

      const nodeId =
        leftPosition.nodeId;

      //
      // If there is already a battle
      // at this node, these armies
      // should join that battle through
      // PASS 1, not create another one.
      //
      if (
        getActiveBattleAtNode(
          nodeId
        )
      ) {
        continue;
      }

      if (
        contactAlreadyExists(
          left.id,
          right.id,
          nodeId
        )
      ) {
        continue;
      }

      if (
        recentlyResolvedSameEncounter(
          left.id,
          right.id,
          nodeId
        )
      ) {
        continue;
      }

      const sequence =
        allocateSimulationSequence();

      const contact:
        ArmyContact = {
        id:
          `army-contact-${sequence
            .toString()
            .padStart(
              6,
              "0"
            )}`,

        armyAId:
          left.id,

        armyBId:
          right.id,

        nodeId,

        detectedAt:
          getRuntimeWorldState()
            .simulation
            .worldTimeMinutes,

        status:
          "pending",
      };

      updateRuntimeWorldState(
        (current) => ({
          ...current,

          armyContacts: {
            ...current
              .armyContacts,

            [contact.id]:
              contact,
          },
        })
      );

      created.push(
        contact
      );
    }
  }

  return created;
}