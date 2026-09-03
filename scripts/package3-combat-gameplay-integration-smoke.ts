import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  startBattle,
} from "../lib/military/battle-state";

import {
  setBattleTactic,
} from "../lib/military/battle-tactic-orders";

import {
  deterministicBattleVariance,
} from "../lib/military/battle-random";

import {
  advanceWorldBy,
} from "../lib/world/simulation";

import type {
  Army,
  BattleResult,
  PersistentBattle,
  UnitBlock,
  UnitType,
} from "../types/military";

function makeArmy(
  id: string,
  ownerId: string,
  unitIds: string[],
  commanderId?: string
): Army {
  return {
    id,
    ownerId,
    commanderId,

    unitIds,

    morale:
      "normal",

    supply: {
      foodSupply:
        10000,

      state:
        "supplied",
    },

    funding: {
      unpaidDays:
        0,

      state:
        "funded",
    },

    status:
      "field",
  };
}

function makeUnit(
  id: string,
  type: UnitType,
  soldiers: number
): UnitBlock {
  return {
    id,
    type,
    currentSoldiers:
      soldiers,
  };
}

function getRequiredBattle(
  battleId: string
): PersistentBattle {
  const battle =
    getRuntimeWorldState()
      .battles[
        battleId
      ];

  if (!battle) {
    throw new Error(
      `Expected battle ${battleId} to exist.`
    );
  }

  return battle;
}

function getRequiredBattleResult(
  battle:
    PersistentBattle
): BattleResult {
  const resultId =
    battle
      .finalBattleResultId;

  if (!resultId) {
    throw new Error(
      `Battle ${battle.id} has no finalBattleResultId.`
    );
  }

  const result =
    getRuntimeWorldState()
      .battleResults[
        resultId
      ];

  if (!result) {
    throw new Error(
      `Battle result ${resultId} does not exist.`
    );
  }

  return result;
}

function getArmySoldiers(
  armyId: string
): number {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return 0;
  }

  return army.unitIds.reduce(
    (
      total,
      unitId
    ) => {
      return (
        total +
        (
          world.unitBlocks[
            unitId
          ]
            ?.currentSoldiers ??
          0
        )
      );
    },
    0
  );
}

function getSideSoldiers(
  armyIds: string[]
): number {
  return armyIds.reduce(
    (
      total,
      armyId
    ) =>
      total +
      getArmySoldiers(
        armyId
      ),
    0
  );
}

function advanceOneHour():
  void {
  const result =
    advanceWorldBy(
      60
    );

  if (
    result.interrupt
  ) {
    throw new Error(
      `Unexpected simulation interrupt: ${result.interrupt.type} — ${result.interrupt.message}`
    );
  }
}

function advanceHours(
  hours: number
): void {
  for (
    let hour = 0;
    hour < hours;
    hour += 1
  ) {
    advanceOneHour();
  }
}

console.log(
  "\n============================================"
);

console.log(
  "PACKAGE 3 F1.5 COMBAT GAMEPLAY SMOKE"
);

console.log(
  "============================================\n"
);

//
// =====================================================
// INITIAL WORLD
// =====================================================
//

const initial =
  getRuntimeWorldState();

const originalTime =
  initial
    .simulation
    .worldTimeMinutes;

const kingdomIds =
  Object.keys(
    initial.kingdoms
  );

if (
  kingdomIds.length <
  2
) {
  throw new Error(
    "Integration test requires at least two kingdoms."
  );
}

const attackerRealm =
  kingdomIds[0];

const defenderRealm =
  kingdomIds[1];

if (
  !attackerRealm ||
  !defenderRealm
) {
  throw new Error(
    "Could not resolve attacker and defender realms."
  );
}

//
// =====================================================
// TEST ARMIES
// =====================================================
//
// Balanced armies deliberately use large soldier counts
// so the battle can continue for many hours.
//
// Attacker:
// 1000 infantry
// 250 cavalry
//
// Defender:
// 1250 infantry
//
// Cavalry share = 20%, therefore cavalry flank is legal
// on open terrain.
//

const attackerInfantry =
  makeUnit(
    "f15-unit-attacker-infantry",
    "infantry",
    1000
  );

const attackerCavalry =
  makeUnit(
    "f15-unit-attacker-cavalry",
    "cavalry",
    250
  );

const defenderInfantry =
  makeUnit(
    "f15-unit-defender-infantry",
    "infantry",
    1250
  );

const attackerArmy =
  makeArmy(
    "f15-army-attacker",
    attackerRealm,
    [
      attackerInfantry.id,
      attackerCavalry.id,
    ],
    "f15-commander-attacker"
  );

const defenderArmy =
  makeArmy(
    "f15-army-defender",
    defenderRealm,
    [
      defenderInfantry.id,
    ],
    "f15-commander-defender"
  );

//
// IMPORTANT:
//
// greenharbor is currently defined as plains.
// We deliberately avoid Riverhold because bridge terrain
// correctly blocks cavalry flanking.
//

const battleNode =
  "greenharbor";

//
// =====================================================
// RESET TEST-SPECIFIC WORLD STATE
// =====================================================
//

updateRuntimeWorldState(
  (world) => ({
    ...world,

    battles:
      {},

    battleResults:
      {},

    armyContacts:
      {},

    wars:
      {},

    unitBlocks: {
      ...world.unitBlocks,

      [attackerInfantry.id]:
        attackerInfantry,

      [attackerCavalry.id]:
        attackerCavalry,

      [defenderInfantry.id]:
        defenderInfantry,
    },

    armies: {
      ...world.armies,

      [attackerArmy.id]:
        attackerArmy,

      [defenderArmy.id]:
        defenderArmy,
    },

    simulation: {
      ...world.simulation,

      worldTimeMinutes:
        originalTime,

      paused:
        false,

      activeMovements:
        {},

      entityPositions: {
        ...world
          .simulation
          .entityPositions,

        [attackerArmy.id]: {
          kind:
            "node",

          nodeId:
            battleNode,
        },

        [defenderArmy.id]: {
          kind:
            "node",

          nodeId:
            battleNode,
        },

        //
        // Player stays physically away from battle.
        //
        [world.player.characterId]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

//
// =====================================================
// TEST 1 — START BATTLE
// =====================================================
//

const startResult =
  startBattle({
    attackerArmyId:
      attackerArmy.id,

    defenderArmyId:
      defenderArmy.id,
  });

if (
  startResult.ok ===
  false
) {
  throw new Error(
    `Battle failed to start: ${startResult.error}`
  );
}

const battleId =
  startResult
    .battle
    .id;

let battle =
  getRequiredBattle(
    battleId
  );

assert.equal(
  battle.status,
  "active"
);

assert.equal(
  battle.battleHour,
  0
);

assert.equal(
  battle.nodeId,
  battleNode
);

assert.equal(
  battle.terrain,
  "plains"
);

console.log(
  "PASS 1 — persistent battle started on plains terrain"
);

//
// =====================================================
// TEST 2 — DETERMINISTIC VARIANCE
// =====================================================
//

const variance1 =
  deterministicBattleVariance(
    battleId,
    5,
    "attacker-casualties"
  );

const variance2 =
  deterministicBattleVariance(
    battleId,
    5,
    "attacker-casualties"
  );

assert.equal(
  variance1,
  variance2
);

assert.ok(
  variance1 >=
    0.82
);

assert.ok(
  variance1 <=
    1.18
);

console.log(
  `PASS 2 — deterministic variance (${variance1.toFixed(4)})`
);

//
// =====================================================
// TEST 3 — FIRST HOURLY ROUND
// =====================================================
//

const soldiersBefore =
  getSideSoldiers([
    attackerArmy.id,
    defenderArmy.id,
  ]);

advanceOneHour();

battle =
  getRequiredBattle(
    battleId
  );

assert.equal(
  battle.battleHour,
  1
);

if (
  !battle.lastRound
) {
  throw new Error(
    "Battle did not generate lastRound after one hour."
  );
}

assert.equal(
  battle.rounds.length,
  1
);

const soldiersAfter =
  getSideSoldiers([
    attackerArmy.id,
    defenderArmy.id,
  ]);

assert.ok(
  soldiersAfter <
    soldiersBefore,
  "Battle round should produce casualties."
);

console.log(
  `PASS 3 — hourly casualties ${soldiersBefore} -> ${soldiersAfter}`
);

//
// =====================================================
// TEST 4 — TACTIC ELIGIBILITY
// =====================================================
//

const tacticResult =
  setBattleTactic({
    battleId,

    armyId:
      attackerArmy.id,

    tactic:
      "cavalry_flank",
  });

if (
  tacticResult.ok ===
  false
) {
  throw new Error(
    `Cavalry flank should be available on plains: ${tacticResult.error}${tacticResult.reason ? ` — ${tacticResult.reason}` : ""}`
  );
}

assert.equal(
  tacticResult.side,
  "attacker"
);

battle =
  getRequiredBattle(
    battleId
  );

assert.equal(
  battle.attackerTactic,
  "cavalry_flank"
);

console.log(
  "PASS 4 — cavalry flank accepted by canonical tactic action"
);

//
// =====================================================
// TEST 5 — TACTIC AFFECTS NEXT ROUND
// =====================================================
//

const roundOne =
  battle.lastRound;

if (!roundOne) {
  throw new Error(
    "Round one missing."
  );
}

advanceOneHour();

battle =
  getRequiredBattle(
    battleId
  );

const roundTwo =
  battle.lastRound;

if (!roundTwo) {
  throw new Error(
    "Round two missing."
  );
}

assert.equal(
  roundTwo.hour,
  2
);

assert.equal(
  roundTwo
    .attacker
    .tactic,
  "cavalry_flank"
);

assert.notEqual(
  roundTwo
    .attacker
    .effectivePower,
  roundOne
    .attacker
    .effectivePower,
  "Changing tactic should change effective power."
);

console.log(
  "PASS 5 — tactic changed effective combat power"
);

//
// =====================================================
// TEST 6 — MOMENTUM / MORALE EVOLUTION
// =====================================================
//

advanceHours(
  3
);

battle =
  getRequiredBattle(
    battleId
  );

assert.equal(
  battle.battleHour,
  5
);

const battlefieldChanged =
  battle.frontMomentum !==
    0 ||
  battle
    .attackerMoralePressure >
    0 ||
  battle
    .defenderMoralePressure >
    0;

assert.equal(
  battlefieldChanged,
  true,
  "Battle must develop momentum or morale pressure."
);

console.log(
  `PASS 6 — momentum=${battle.frontMomentum}, morale A=${battle.attackerMoralePressure.toFixed(1)}, D=${battle.defenderMoralePressure.toFixed(1)}`
);

//
// =====================================================
// TEST 7 — OLD 10-HOUR HARD TIMER IS GONE
// =====================================================
//

while (true) {
  battle =
    getRequiredBattle(
      battleId
    );

  if (
    battle.status ===
      "ended" ||
    battle.battleHour >=
      11
  ) {
    break;
  }

  advanceOneHour();
}

battle =
  getRequiredBattle(
    battleId
  );

if (
  battle.status ===
  "active"
) {
  assert.ok(
    battle.battleHour >=
      11
  );

  console.log(
    `PASS 7 — battle remains active beyond old 10h timer (${battle.battleHour}h)`
  );
} else {
  //
  // A battle is allowed to resolve naturally before hour 10.
  // What is forbidden is the old unconditional fixed timer.
  //
  if (
    !battle.finalBattleResultId
  ) {
    throw new Error(
      "Ended battle has no canonical result."
    );
  }

  console.log(
    `PASS 7 — battle resolved naturally at hour ${battle.battleHour}`
  );
}

//
// =====================================================
// TEST 8 — EVENTUAL RESOLUTION
// =====================================================
//

let safetyCounter =
  0;

while (
  getRequiredBattle(
    battleId
  ).status ===
  "active"
) {
  advanceOneHour();

  safetyCounter +=
    1;

  if (
    safetyCounter >
    80
  ) {
    throw new Error(
      "Battle exceeded integration-test safety horizon."
    );
  }
}

battle =
  getRequiredBattle(
    battleId
  );

assert.equal(
  battle.status,
  "ended"
);

assert.equal(
  battle.currentPhase,
  "ended"
);

if (
  !battle.finalBattleResultId
) {
  throw new Error(
    "Resolved battle has no finalBattleResultId."
  );
}

console.log(
  `PASS 8 — battle resolved after ${battle.battleHour} combat hours`
);

//
// =====================================================
// TEST 9 — FINAL RESULT
// =====================================================
//

const finalResult =
  getRequiredBattleResult(
    battle
  );

assert.equal(
  finalResult.id,
  battle
    .finalBattleResultId
);

if (
  finalResult
    .winnerArmyId ===
    undefined &&
  finalResult.band !==
    "stalemate"
) {
  throw new Error(
    "Final battle has neither winner nor stalemate outcome."
  );
}

if (
  finalResult
    .loserArmyId
) {
  const loserArmy =
    getRuntimeWorldState()
      .armies[
        finalResult
          .loserArmyId
      ];

  if (!loserArmy) {
    throw new Error(
      `Loser army ${finalResult.loserArmyId} disappeared from canonical world.`
    );
  }

  assert.notEqual(
    loserArmy.status,
    "battle",
    "Losing army must leave battle state."
  );
}

console.log(
  `PASS 9 — canonical result band=${finalResult.band}`
);

//
// =====================================================
// TEST 10 — WORLD TIME CONTINUITY
// =====================================================
//

const finalWorld =
  getRuntimeWorldState();

assert.ok(
  finalWorld
    .simulation
    .worldTimeMinutes >
    originalTime
);

assert.equal(
  battle.rounds.length,
  battle.battleHour
);

const elapsedMinutes =
  finalWorld
    .simulation
    .worldTimeMinutes -
  originalTime;

assert.ok(
  elapsedMinutes >=
    battle.battleHour *
      60
);

console.log(
  `PASS 10 — world advanced ${elapsedMinutes} minutes`
);

//
// =====================================================
// FINAL
// =====================================================
//

console.log(
  "\n============================================"
);

console.log(
  "PACKAGE 3 F1.5 COMBAT GAMEPLAY: PASS"
);

console.log(
  "============================================\n"
);