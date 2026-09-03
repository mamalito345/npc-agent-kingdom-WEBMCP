import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  calculateBattleSidePower,
  getBattleSideArmyIds,
  getLatestBattleOrderForSide,
  type BattleSide,
  type BattleSidePower,
} from "@/lib/military/battle-side-power";

import {
  getArmySoldierCount,
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  findDeterministicRetreatNode,
} from "@/lib/military/retreat";

import type {
  BattleOutcomeBand,
  BattleResult,
  BattleSideResult,
  PersistentBattle,
  UnitBlock,
} from "@/types/military";

import type {
  WorldMinute,
} from "@/types/simulation";

type ProgressiveCasualtyPhase =
  | "engagement"
  | "crisis"
  | "resolution";

function getBasePhaseCasualtyPercent(
  phase: ProgressiveCasualtyPhase
): number {
  switch (phase) {
    case "engagement":
      return 3;

    case "crisis":
      return 5;

    case "resolution":
      return 7;
  }
}

function getOrderCasualtyMultiplier(
  battle: PersistentBattle,
  side: BattleSide
): number {
  const order =
    getLatestBattleOrderForSide(
      battle,
      side
    );

  if (!order) {
    return 1;
  }

  switch (order.type) {
    case "hold_position":
      return 0.85;

    case "commit_reserve":
      return 1;

    case "press_attack":
      return 1.25;

    case "order_retreat":
      return 0.6;
  }
}

function getEnemyPressureMultiplier(
  ownPower: number,
  enemyPower: number
): number {
  if (
    ownPower <= 0 &&
    enemyPower <= 0
  ) {
    return 1;
  }

  if (ownPower <= 0) {
    return 1.75;
  }

  const ratio =
    enemyPower /
    ownPower;

  return Math.max(
    0.65,
    Math.min(
      1.75,
      ratio
    )
  );
}

function applyCasualtiesToArmy(
  armyId: string,
  casualtyPercent: number
): {
  units:
    Record<
      string,
      UnitBlock
    >;

  soldiersBefore: number;

  soldiersLost: number;

  soldiersAfter: number;
} {
  const units =
    getArmyUnits(
      armyId
    );

  const soldiersBefore =
    getArmySoldierCount(
      armyId
    );

  const ratio =
    casualtyPercent /
    100;

  const updatedUnits:
    Record<
      string,
      UnitBlock
    > = {};

  let soldiersLost =
    0;

  for (
    const unit
    of units
  ) {
    const loss =
      Math.min(
        unit.currentSoldiers,
        Math.round(
          unit.currentSoldiers *
            ratio
        )
      );

    soldiersLost +=
      loss;

    updatedUnits[
      unit.id
    ] = {
      ...unit,

      currentSoldiers:
        Math.max(
          0,
          unit.currentSoldiers -
            loss
        ),
    };
  }

  return {
    units:
      updatedUnits,

    soldiersBefore,

    soldiersLost,

    soldiersAfter:
      Math.max(
        0,
        soldiersBefore -
          soldiersLost
      ),
  };
}

export function applyProgressiveBattleCasualties(
  battleId: string,
  phase: ProgressiveCasualtyPhase,
  worldTime: WorldMinute
): void {
  const world =
    getRuntimeWorldState();

  const battle =
    world.battles[
      battleId
    ];

  if (
    !battle ||
    battle.status !==
      "active"
  ) {
    return;
  }

  const attackerPower =
    calculateBattleSidePower(
      battle,
      "attacker"
    );

  const defenderPower =
    calculateBattleSidePower(
      battle,
      "defender"
    );

  const basePercent =
    getBasePhaseCasualtyPercent(
      phase
    );

  const attackerPercent =
    basePercent *
    getEnemyPressureMultiplier(
      attackerPower.totalPower,
      defenderPower.totalPower
    ) *
    getOrderCasualtyMultiplier(
      battle,
      "attacker"
    );

  const defenderPercent =
    basePercent *
    getEnemyPressureMultiplier(
      defenderPower.totalPower,
      attackerPower.totalPower
    ) *
    getOrderCasualtyMultiplier(
      battle,
      "defender"
    );

  const updatedUnits:
    Record<
      string,
      UnitBlock
    > = {};

  const updatedArmies = {
    ...world.armies,
  };

  let attackerLost =
    0;

  let defenderLost =
    0;

  for (
    const armyId
    of battle.attackerArmyIds
  ) {
    const army =
      world.armies[
        armyId
      ];

    if (
      !army ||
      army.status ===
        "destroyed"
    ) {
      continue;
    }

    const result =
      applyCasualtiesToArmy(
        armyId,
        attackerPercent
      );

    Object.assign(
      updatedUnits,
      result.units
    );

    attackerLost +=
      result.soldiersLost;

    updatedArmies[
      armyId
    ] = {
      ...army,

      status:
        result.soldiersAfter <=
        0
          ? "destroyed"
          : army.status,
    };
  }

  for (
    const armyId
    of battle.defenderArmyIds
  ) {
    const army =
      world.armies[
        armyId
      ];

    if (
      !army ||
      army.status ===
        "destroyed"
    ) {
      continue;
    }

    const result =
      applyCasualtiesToArmy(
        armyId,
        defenderPercent
      );

    Object.assign(
      updatedUnits,
      result.units
    );

    defenderLost +=
      result.soldiersLost;

    updatedArmies[
      armyId
    ] = {
      ...army,

      status:
        result.soldiersAfter <=
        0
          ? "destroyed"
          : army.status,
    };
  }

  updateRuntimeWorldState(
    (current) => {
      const latest =
        current.battles[
          battleId
        ];

      if (!latest) {
        return current;
      }

      return {
        ...current,

        unitBlocks: {
          ...current.unitBlocks,
          ...updatedUnits,
        },

        armies: {
          ...current.armies,
          ...updatedArmies,
        },

        battles: {
          ...current.battles,

          [battleId]: {
            ...latest,

            history: [
              ...latest.history,

              {
                id:
                  `${battleId}-history-${(
                    latest
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
                  worldTime,

                type:
                  "phase_changed",

                summary:
                  [
                    `Progressive casualties applied during ${phase}.`,
                    `Attacker lost=${attackerLost}.`,
                    `Defender lost=${defenderLost}.`,
                  ].join(
                    " "
                  ),
              },
            ],
          },
        },
      };
    }
  );
}

function getOutcomeBand(
  differenceRatio: number
): BattleOutcomeBand {
  if (
    differenceRatio <
    0.08
  ) {
    return "stalemate";
  }

  if (
    differenceRatio <
    0.2
  ) {
    return "narrow";
  }

  if (
    differenceRatio <
    0.4
  ) {
    return "clear";
  }

  if (
    differenceRatio <
    0.7
  ) {
    return "major";
  }

  return "rout";
}

function buildAggregateSideResult(
  battle: PersistentBattle,
  side: BattleSide,
  totalPower: number,
  sidePower: BattleSidePower
): BattleSideResult {
  const armyIds =
    getBattleSideArmyIds(
      battle,
      side
    );

  const leadArmyId =
    armyIds[0];

  const soldiersBefore =
    armyIds.reduce(
      (
        total,
        armyId
      ) =>
        total +
        getArmySoldierCount(
          armyId
        ),
      0
    );

  return {
    armyId:
      leadArmyId,

    basePower:
      totalPower,

    commanderModifier:
      sidePower.armyPowers.length > 0
      ? sidePower.armyPowers.reduce((total, army) => total + army.commanderModifier, 0) /
        sidePower.armyPowers.length
      : 0,

    moraleModifier:
      0,

    supplyModifier:
      0,

    terrainModifier:
      sidePower.armyPowers.length > 0
      ? sidePower.armyPowers.reduce((total, army) => total + army.terrainModifier, 0) /
        sidePower.armyPowers.length
      : 0,

    fortificationModifier:
      0,

    randomRoll:
      0,

    totalPower,

    casualtyPercent:
      0,

    soldiersBefore,

    soldiersLost:
      0,

    soldiersAfter:
      soldiersBefore,
  };
}

function retreatBattleSide(
  battle: PersistentBattle,
  side: BattleSide
): void {
  const world =
    getRuntimeWorldState();

  const armyIds =
    getBattleSideArmyIds(
      battle,
      side
    );

  const positions = {
    ...world.simulation
      .entityPositions,
  };

  const armies = {
    ...world.armies,
  };

  for (
    const armyId
    of armyIds
  ) {
    const army =
      world.armies[
        armyId
      ];

    if (
      !army ||
      army.status ===
        "destroyed"
    ) {
      continue;
    }

    const retreatNode =
      findDeterministicRetreatNode(
        armyId
      );

    if (
      retreatNode
    ) {
      positions[
        armyId
      ] = {
        kind:
          "node",

        nodeId:
          retreatNode,
      };
    }

    armies[
      armyId
    ] = {
      ...army,

      status:
        "retreating",

      morale:
        "low",
    };
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      armies,

      simulation: {
        ...current.simulation,

        entityPositions:
          positions,
      },
    })
  );
}

function releaseWinningSide(
  battle: PersistentBattle,
  side: BattleSide
): void {
  const world =
    getRuntimeWorldState();

  const armyIds =
    getBattleSideArmyIds(
      battle,
      side
    );

  const armies = {
    ...world.armies,
  };

  for (
    const armyId
    of armyIds
  ) {
    const army =
      armies[
        armyId
      ];

    if (
      !army ||
      army.status ===
        "destroyed"
    ) {
      continue;
    }

    armies[
      armyId
    ] = {
      ...army,

      status:
        "field",
    };
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      armies,
    })
  );
}

export function resolvePersistentBattleOutcome(
  battleId: string,
  worldTime: WorldMinute
): BattleResult {
  const world =
    getRuntimeWorldState();

  const battle =
    world.battles[
      battleId
    ];

  if (!battle) {
    throw new Error(
      `Battle not found: ${battleId}`
    );
  }

  const attackerPower =
    calculateBattleSidePower(
      battle,
      "attacker"
    );

  const defenderPower =
    calculateBattleSidePower(
      battle,
      "defender"
    );

  const attackerTotal =
    attackerPower.totalPower;

  const defenderTotal =
    defenderPower.totalPower;

  const maxPower =
    Math.max(
      attackerTotal,
      defenderTotal,
      1
    );

  const differenceRatio =
    Math.abs(
      attackerTotal -
        defenderTotal
    ) /
    maxPower;

  const band =
    getOutcomeBand(
      differenceRatio
    );

  let winnerSide:
    BattleSide |
    undefined;

  let loserSide:
    BattleSide |
    undefined;

  if (
    band !==
    "stalemate"
  ) {
    if (
      attackerTotal >
      defenderTotal
    ) {
      winnerSide =
        "attacker";

      loserSide =
        "defender";
    } else if (
      defenderTotal >
      attackerTotal
    ) {
      winnerSide =
        "defender";

      loserSide =
        "attacker";
    }
  }

  const attackerLead =
    battle
      .attackerArmyIds[
        0
      ];

  const defenderLead =
    battle
      .defenderArmyIds[
        0
      ];

  const sequence =
    allocateSimulationSequence();

  const resultId =
    `battle-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const result:
    BattleResult = {
    id:
      resultId,

    contactId:
      battle.contactId,

    attackerArmyId:
      attackerLead,

    defenderArmyId:
      defenderLead,

    nodeId:
      battle.nodeId,

    resolvedAt:
      worldTime,

    band,

    winnerArmyId:
      winnerSide ===
      "attacker"
        ? attackerLead
        : winnerSide ===
            "defender"
          ? defenderLead
          : undefined,

    loserArmyId:
      loserSide ===
      "attacker"
        ? attackerLead
        : loserSide ===
            "defender"
          ? defenderLead
          : undefined,

    attacker:
      buildAggregateSideResult(
        battle,
        "attacker",
        attackerTotal,
        attackerPower
      ),

    defender:
      buildAggregateSideResult(
        battle,
        "defender",
        defenderTotal,
        defenderPower
      ),

    seed:
      0,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      battleResults: {
        ...current
          .battleResults,

        [result.id]:
          result,
      },
    })
  );

  if (
    loserSide
  ) {
    retreatBattleSide(
      battle,
      loserSide
    );
  }

  if (
    winnerSide
  ) {
    releaseWinningSide(
      battle,
      winnerSide
    );
  }

  return result;
}