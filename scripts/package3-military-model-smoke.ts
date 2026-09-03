import assert from "node:assert/strict";

import {
  CAMPAIGN_UPKEEP,
  RECRUITMENT_DEFINITIONS,
  UNIT_COMBAT_STRENGTH,
} from "../lib/military/balance";

import {
  getArmyDailyUpkeep,
  getArmyTotalSoldiers,
  getUnitCombatStrength,
  getUnitFortifiedAttackStrength,
} from "../lib/military/calculations";

import type {
  UnitBlock,
} from "../types/military";

const infantry: UnitBlock = {
  id: "infantry-1",
  type: "infantry",
  currentSoldiers: 250,
};

const halfInfantry: UnitBlock = {
  id: "infantry-2",
  type: "infantry",
  currentSoldiers: 125,
};

const cavalry: UnitBlock = {
  id: "cavalry-1",
  type: "cavalry",
  currentSoldiers: 250,
};

const siege: UnitBlock = {
  id: "siege-1",
  type: "siege",
  currentSoldiers: 0,
};

const ship: UnitBlock = {
  id: "ship-1",
  type: "ship",
  currentSoldiers: 0,
};

assert.equal(
  UNIT_COMBAT_STRENGTH.infantry,
  1
);

assert.equal(
  UNIT_COMBAT_STRENGTH.cavalry,
  2
);

assert.equal(
  getUnitCombatStrength(infantry),
  1
);

assert.equal(
  getUnitCombatStrength(halfInfantry),
  0.5
);

assert.equal(
  getUnitCombatStrength(cavalry),
  2
);

assert.equal(
  getUnitCombatStrength(siege),
  0
);

assert.equal(
  getUnitFortifiedAttackStrength(siege),
  2
);

assert.equal(
  getUnitCombatStrength(ship),
  0
);

assert.equal(
  RECRUITMENT_DEFINITIONS.ship,
  null
);

assert.equal(
  CAMPAIGN_UPKEEP.ship,
  null
);

assert.equal(
  getArmyTotalSoldiers([
    infantry,
    cavalry,
    siege,
    ship,
  ]),
  500
);

const upkeep =
  getArmyDailyUpkeep([
    infantry,
    cavalry,
    siege,
    ship,
  ]);

assert.equal(
  upkeep.gold,
  172
);

assert.equal(
  upkeep.food,
  200
);

console.log(
  "PASS: Infantry model"
);

console.log(
  "PASS: Cavalry model"
);

console.log(
  "PASS: Siege model"
);

console.log(
  "PASS: Ship future-only model"
);

console.log(
  "PASS: partial unit strength"
);

console.log("");
console.log(
  "PACKAGE 3 MILITARY MODEL: PASS"
);