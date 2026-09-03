import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  startBattle,
} from "../lib/military/battle-state";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import type {
  Army,
  UnitBlock,
} from "../types/military";

const world =
  getRuntimeWorldState();

const startTime =
  world.simulation
    .worldTimeMinutes;

const attackerUnit:
  UnitBlock = {
  id:
    "c2-test-unit-a",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const defenderUnit:
  UnitBlock = {
  id:
    "c2-test-unit-b",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const attackerArmy:
  Army = {
  id:
    "c2-test-army-a",

  ownerId:
    "northreach",

  unitIds: [
    attackerUnit.id,
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

const defenderArmy:
  Army = {
  id:
    "c2-test-army-b",

  ownerId:
    "eastvale",

  unitIds: [
    defenderUnit.id,
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

updateRuntimeWorldState(
  (current) => ({
    ...current,

    unitBlocks: {
      ...current.unitBlocks,

      [attackerUnit.id]:
        attackerUnit,

      [defenderUnit.id]:
        defenderUnit,
    },

    armies: {
      ...current.armies,

      [attackerArmy.id]:
        attackerArmy,

      [defenderArmy.id]:
        defenderArmy,
    },

    battles: {},

    armyContacts: {},

    battleResults: {},

    simulation: {
      ...current.simulation,

      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        [attackerArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [defenderArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

const started =
  startBattle({
    attackerArmyId:
      attackerArmy.id,

    defenderArmyId:
      defenderArmy.id,
  });

assert.equal(
  started.ok,
  true
);

if (!started.ok) {
  throw new Error(
    "Battle should start."
  );
}

assert.equal(
  started.battle
    .currentPhase,
  "contact"
);

assert.equal(
  started.battle
    .status,
  "active"
);

console.log(
  "PASS: persistent battle started"
);

//
// 30 minutes later:
// still contact.
//
advanceWorldUntil(
  startTime +
  30
);

let state =
  getRuntimeWorldState();

assert.equal(
  state.battles[
    started.battle.id
  ].currentPhase,
  "contact"
);

assert.equal(
  state.battles[
    started.battle.id
  ].status,
  "active"
);

console.log(
  "PASS: battle does not resolve instantly"
);

//
// 45 min:
// deployment
//
advanceWorldUntil(
  startTime +
  45
);

state =
  getRuntimeWorldState();

assert.equal(
  state.battles[
    started.battle.id
  ].currentPhase,
  "deployment"
);

console.log(
  "PASS: contact -> deployment"
);

//
// 120 min:
// engagement
//
advanceWorldUntil(
  startTime +
  120
);

state =
  getRuntimeWorldState();

assert.equal(
  state.battles[
    started.battle.id
  ].currentPhase,
  "engagement"
);

console.log(
  "PASS: deployment -> engagement"
);

//
// 300 min:
// crisis
//
advanceWorldUntil(
  startTime +
  300
);

state =
  getRuntimeWorldState();

assert.equal(
  state.battles[
    started.battle.id
  ].currentPhase,
  "crisis"
);

console.log(
  "PASS: engagement -> crisis"
);

//
// Battle total:
// 45 + 75 + 180 +
// 150 + 90 + 60
//
// = 600 minutes
//
advanceWorldUntil(
  startTime +
  600
);

state =
  getRuntimeWorldState();

assert.equal(
  state.battles[
    started.battle.id
  ].status,
  "ended"
);

assert.equal(
  state.battles[
    started.battle.id
  ].currentPhase,
  "ended"
);

assert.ok(
  state.battles[
    started.battle.id
  ].finalBattleResultId
);

console.log(
  "PASS: battle occupies 600 canonical minutes"
);

assert.ok(
  state.battles[
    started.battle.id
  ].history.length >=
    7
);

console.log(
  "PASS: battle history timestamps recorded"
);

console.log("");

console.log(
  "PACKAGE 3 C2.1 PERSISTENT BATTLE: PASS"
);