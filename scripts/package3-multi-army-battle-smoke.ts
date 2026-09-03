import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  startBattle,
} from "../lib/military/battle-state";

import {
  detectArmyContacts,
} from "../lib/military/contact";

import {
  calculateBattleSidePower,
} from "../lib/military/battle-side-power";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import type {
  Army,
  UnitBlock,
} from "../types/military";

function makeUnit(
  id: string,
  soldiers = 250
): UnitBlock {
  return {
    id,
    type: "infantry",
    currentSoldiers: soldiers,
  };
}

function makeArmy(
  id: string,
  ownerId: string,
  unitId: string,
  commanderId: string
): Army {
  return {
    id,
    ownerId,
    commanderId,

    unitIds: [
      unitId,
    ],

    morale:
      "normal",

    supply: {
      foodSupply:
        1000,

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

const initial =
  getRuntimeWorldState();

const playerId =
  initial.player.characterId;

const playerCharacter =
  initial.characters[
    playerId
  ];

assert.ok(
  playerCharacter
);

const attackerRealmId =
  playerCharacter.kingdomId;

const defenderRealmId =
  Object.keys(
    initial.kingdoms
  ).find(
    (kingdomId) =>
      kingdomId !==
      attackerRealmId
  );

assert.ok(
  defenderRealmId
);

const startTime =
  initial.simulation
    .worldTimeMinutes;

//
// =====================================================
// UNITS
// =====================================================
//

const unitA1 =
  makeUnit(
    "c23-unit-a1"
  );

const unitA2 =
  makeUnit(
    "c23-unit-a2"
  );

const unitB1 =
  makeUnit(
    "c23-unit-b1"
  );

const unitB2 =
  makeUnit(
    "c23-unit-b2"
  );

const unitB3 =
  makeUnit(
    "c23-unit-b3"
  );

//
// =====================================================
// ARMIES
// =====================================================
//

const armyA1 =
  makeArmy(
    "c23-army-a1",
    attackerRealmId,
    unitA1.id,
    "commander-a1"
  );

const armyA2 =
  makeArmy(
    "c23-army-a2",
    attackerRealmId,
    unitA2.id,
    "commander-a2"
  );

const armyB1 =
  makeArmy(
    "c23-army-b1",
    defenderRealmId!,
    unitB1.id,
    "commander-b1"
  );

const armyB2 =
  makeArmy(
    "c23-army-b2",
    defenderRealmId!,
    unitB2.id,
    "commander-b2"
  );

const armyB3 =
  makeArmy(
    "c23-army-b3",
    defenderRealmId!,
    unitB3.id,
    "commander-b3"
  );

//
// =====================================================
// CLEAN TEST WORLD
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    battles: {},

    battleResults: {},

    armyContacts: {},

    unitBlocks: {
      ...current.unitBlocks,

      [unitA1.id]:
        unitA1,

      [unitA2.id]:
        unitA2,

      [unitB1.id]:
        unitB1,

      [unitB2.id]:
        unitB2,

      [unitB3.id]:
        unitB3,
    },

    armies: {
      ...current.armies,

      [armyA1.id]:
        armyA1,

      [armyA2.id]:
        armyA2,

      [armyB1.id]:
        armyB1,

      [armyB2.id]:
        armyB2,

      [armyB3.id]:
        armyB3,
    },

    simulation: {
      ...current.simulation,

      worldTimeMinutes:
        startTime,

      activeMovements: {},

      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        //
        // Player absent.
        //
        [playerId]: {
          kind:
            "node",

          nodeId:
            "riverhold",
        },

        //
        // Initial combatants.
        //
        [armyA1.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [armyB1.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        //
        // Reinforcements are initially
        // somewhere else.
        //
        [armyA2.id]: {
          kind:
            "node",

          nodeId:
            "riverhold",
        },

        [armyB2.id]: {
          kind:
            "node",

          nodeId:
            "riverhold",
        },

        [armyB3.id]: {
          kind:
            "node",

          nodeId:
            "riverhold",
        },
      },
    },
  })
);

//
// =====================================================
// START A1 VS B1
// =====================================================
//

const started =
  startBattle({
    attackerArmyId:
      armyA1.id,

    defenderArmyId:
      armyB1.id,
  });

assert.equal(
  started.ok,
  true
);

if (!started.ok) {
  throw new Error(
    "Battle failed to start."
  );
}

console.log(
  "PASS: A1 vs B1 battle started"
);

let battle =
  getRuntimeWorldState()
    .battles[
      started.battle.id
    ];

assert.deepEqual(
  battle.attackerArmyIds,
  [
    armyA1.id,
  ]
);

assert.deepEqual(
  battle.defenderArmyIds,
  [
    armyB1.id,
  ]
);

//
// =====================================================
// MOVE REINFORCEMENTS INTO BATTLE NODE
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    simulation: {
      ...current.simulation,

      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        [armyA2.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [armyB2.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [armyB3.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

detectArmyContacts();

battle =
  getRuntimeWorldState()
    .battles[
      started.battle.id
    ];

assert.equal(
  battle.attackerArmyIds.length,
  2
);

assert.equal(
  battle.defenderArmyIds.length,
  3
);

assert.ok(
  battle.attackerArmyIds.includes(
    armyA2.id
  )
);

assert.ok(
  battle.defenderArmyIds.includes(
    armyB2.id
  )
);

assert.ok(
  battle.defenderArmyIds.includes(
    armyB3.id
  )
);

console.log(
  "PASS: A2 joined attacker side"
);

console.log(
  "PASS: B2 and B3 joined defender side"
);

//
// =====================================================
// ARMY STATUS
// =====================================================
//

const joinedWorld =
  getRuntimeWorldState();

for (
  const armyId
  of [
    armyA1.id,
    armyA2.id,
    armyB1.id,
    armyB2.id,
    armyB3.id,
  ]
) {
  assert.equal(
    joinedWorld.armies[
      armyId
    ].status,
    "battle"
  );
}

console.log(
  "PASS: all five armies are active battle participants"
);

//
// =====================================================
// POWER BEFORE ORDERS
// =====================================================
//

const attackerBefore =
  calculateBattleSidePower(
    battle,
    "attacker"
  );

const defenderBefore =
  calculateBattleSidePower(
    battle,
    "defender"
  );

assert.equal(
  attackerBefore
    .armyPowers.length,
  2
);

assert.equal(
  defenderBefore
    .armyPowers.length,
  3
);

assert.equal(
  attackerBefore
    .armyPowers[
      0
    ]
    .reserveMultiplier,
  1
);

assert.equal(
  attackerBefore
    .armyPowers[
      1
    ]
    .reserveMultiplier,
  0.5
);

assert.equal(
  defenderBefore
    .armyPowers[
      0
    ]
    .reserveMultiplier,
  1
);

assert.equal(
  defenderBefore
    .armyPowers[
      1
    ]
    .reserveMultiplier,
  0.5
);

assert.equal(
  defenderBefore
    .armyPowers[
      2
    ]
    .reserveMultiplier,
  0.5
);

console.log(
  "PASS: reinforcements contribute partially before reserve commitment"
);

//
// =====================================================
// ADVANCE TO CRISIS
// =====================================================
//
// Player absent → both commanders decide automatically.
//
// Current commander policy chooses COMMIT_RESERVE
// in crisis for normal + supplied armies.
//
const crisisTime =
  startTime +
  300;

const crisisAdvance =
  advanceWorldUntil(
    crisisTime
  );

assert.equal(
  crisisAdvance.reachedTarget,
  true
);

assert.equal(
  crisisAdvance.interrupt,
  undefined
);

battle =
  getRuntimeWorldState()
    .battles[
      started.battle.id
    ];

assert.equal(
  battle.currentPhase,
  "crisis"
);

assert.equal(
  battle.activeOrders.length,
  2
);

const attackerOrder =
  battle.activeOrders.find(
    (order) =>
      battle
        .attackerArmyIds
        .includes(
          order.armyId
        )
  );

const defenderOrder =
  battle.activeOrders.find(
    (order) =>
      battle
        .defenderArmyIds
        .includes(
          order.armyId
        )
  );

assert.ok(
  attackerOrder
);

assert.ok(
  defenderOrder
);

assert.equal(
  attackerOrder.type,
  "commit_reserve"
);

assert.equal(
  defenderOrder.type,
  "commit_reserve"
);

console.log(
  "PASS: both commanders issued COMMIT_RESERVE at crisis"
);

//
// =====================================================
// POWER AFTER COMMIT_RESERVE
// =====================================================
//

const attackerAfter =
  calculateBattleSidePower(
    battle,
    "attacker"
  );

const defenderAfter =
  calculateBattleSidePower(
    battle,
    "defender"
  );

for (
  const armyPower
  of attackerAfter
    .armyPowers
) {
  assert.equal(
    armyPower
      .reserveMultiplier,
    1
  );
}

for (
  const armyPower
  of defenderAfter
    .armyPowers
) {
  assert.equal(
    armyPower
      .reserveMultiplier,
    1
  );
}

assert.ok(
  attackerAfter.totalPower >
    attackerBefore.totalPower
);

assert.ok(
  defenderAfter.totalPower >
    defenderBefore.totalPower
);

console.log(
  "PASS: COMMIT_RESERVE activates full reinforcement power"
);

//
// =====================================================
// REINFORCEMENT HISTORY
// =====================================================
//

const reinforcementHistory =
  battle.history.filter(
    (entry) =>
      entry.summary.includes(
        "joined the battle"
      )
  );

assert.equal(
  reinforcementHistory.length,
  3
);

console.log(
  "PASS: reinforcement arrivals recorded in battle history"
);

//
// =====================================================
// RESOLUTION POWER SNAPSHOT
// =====================================================
//

const resolutionTime =
  startTime +
  450;

const resolutionAdvance =
  advanceWorldUntil(
    resolutionTime
  );

assert.equal(
  resolutionAdvance.reachedTarget,
  true
);

battle =
  getRuntimeWorldState()
    .battles[
      started.battle.id
    ];

assert.equal(
  battle.currentPhase,
  "resolution"
);

const powerSnapshot =
  battle.history.find(
    (entry) =>
      entry.summary.includes(
        "Operational battle power calculated."
      )
  );

assert.ok(
  powerSnapshot
);

assert.ok(
  powerSnapshot.summary.includes(
    "Attacker armies=2"
  )
);

assert.ok(
  powerSnapshot.summary.includes(
    "Defender armies=3"
  )
);

console.log(
  "PASS: resolution uses multi-army operational power snapshot"
);

//
// =====================================================
// FINAL
// =====================================================
//

console.log("");

console.log(
  "============================================"
);

console.log(
  "PACKAGE 3 C2.3 MULTI-ARMY BATTLE: PASS"
);

console.log(
  "============================================"
);