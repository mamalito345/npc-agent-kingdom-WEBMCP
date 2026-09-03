import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getArmyDailyCosts,
} from "../lib/military/army-queries";

import {
  resupplyArmy,
  getArmySupplyDays,
} from "../lib/military/supply";

import {
  processDailyMilitaryEconomy,
} from "../lib/military/daily";

import type {
  Army,
  UnitBlock,
} from "../types/military";

const infantry:
  UnitBlock = {
  id:
    "economy-infantry",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const cavalry:
  UnitBlock = {
  id:
    "economy-cavalry",

  type:
    "cavalry",

  currentSoldiers:
    250,
};

const siege:
  UnitBlock = {
  id:
    "economy-siege",

  type:
    "siege",

  currentSoldiers:
    0,
};

const army:
  Army = {
  id:
    "economy-army",

  ownerId:
    "northreach",

  commanderId:
    "lord_edwyn",

  unitIds: [
    infantry.id,
    cavalry.id,
    siege.id,
  ],

  morale:
    "normal",

  supply: {
    foodSupply:
      0,

    state:
      "starving",
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
  (world) => ({
    ...world,

    unitBlocks: {
      ...world.unitBlocks,

      [infantry.id]:
        infantry,

      [cavalry.id]:
        cavalry,

      [siege.id]:
        siege,
    },

    armies: {
      ...world.armies,

      [army.id]:
        army,
    },

    kingdoms: {
      ...world.kingdoms,

      northreach: {
        ...world
          .kingdoms
          .northreach,

        treasury:
          10000,

        armyIds: [
          ...world
            .kingdoms
            .northreach
            .armyIds,

          army.id,
        ],
      },
    },

    settlements: {
      ...world.settlements,

      stoneford: {
        ...world
          .settlements
          .stoneford,

        resources: {
          ...world
            .settlements
            .stoneford
            .resources,

          food:
            10000,
        },
      },
    },

    simulation: {
      ...world.simulation,

      entityPositions: {
        ...world
          .simulation
          .entityPositions,

        [army.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

const costs =
  getArmyDailyCosts(
    army.id
  );

assert.equal(
  costs.gold,
  172
);

assert.equal(
  costs.food,
  200
);

const resupply =
  resupplyArmy(
    army.id
  );

assert.equal(
  resupply.ok,
  true
);

if (!resupply.ok) {
  throw new Error(
    "Army resupply should succeed."
  );
}

/**
 * Target supply = 7 days.
 */
assert.equal(
  resupply
    .foodTransferred,
  1400
);

assert.equal(
  getArmySupplyDays(
    army.id
  ),
  7
);

let world =
  getRuntimeWorldState();

assert.equal(
  world.settlements
    .stoneford
    .resources
    .food,
  8600
);

assert.equal(
  world.armies[
    army.id
  ].supply.state,
  "supplied"
);

processDailyMilitaryEconomy();

world =
  getRuntimeWorldState();

assert.equal(
  world.kingdoms
    .northreach
    .treasury,
  9828
);

assert.equal(
  world.armies[
    army.id
  ].supply
    .foodSupply,
  1200
);

assert.equal(
  getArmySupplyDays(
    army.id
  ),
  6
);

assert.equal(
  world.armies[
    army.id
  ].supply.state,
  "low_supply"
);

assert.equal(
  world.armies[
    army.id
  ].funding.state,
  "funded"
);

/**
 * Force treasury exhaustion.
 */
updateRuntimeWorldState(
  (current) => ({
    ...current,

    kingdoms: {
      ...current.kingdoms,

      northreach: {
        ...current
          .kingdoms
          .northreach,

        treasury:
          0,
      },
    },
  })
);

processDailyMilitaryEconomy();

world =
  getRuntimeWorldState();

assert.equal(
  world.kingdoms
    .northreach
    .treasury,
  0
);

assert.equal(
  world.armies[
    army.id
  ].funding
    .unpaidDays,
  1
);

assert.equal(
  world.armies[
    army.id
  ].funding.state,
  "underfunded"
);

processDailyMilitaryEconomy();
processDailyMilitaryEconomy();

world =
  getRuntimeWorldState();

assert.equal(
  world.armies[
    army.id
  ].funding
    .unpaidDays,
  3
);

assert.equal(
  world.armies[
    army.id
  ].funding.state,
  "arrears"
);

for (
  let index = 0;
  index < 4;
  index += 1
) {
  processDailyMilitaryEconomy();
}

world =
  getRuntimeWorldState();

assert.equal(
  world.armies[
    army.id
  ].funding
    .unpaidDays,
  7
);

assert.equal(
  world.armies[
    army.id
  ].funding.state,
  "collapse_risk"
);

assert.equal(
  world.kingdoms
    .northreach
    .treasury >=
    0,
  true
);

assert.equal(
  world.armies[
    army.id
  ].supply
    .foodSupply >=
    0,
  true
);

console.log(
  "PASS: real settlement resupply"
);

console.log(
  "PASS: 7-day target supply"
);

console.log(
  "PASS: daily army gold upkeep"
);

console.log(
  "PASS: daily army food consumption"
);

console.log(
  "PASS: underfunded"
);

console.log(
  "PASS: arrears"
);

console.log(
  "PASS: collapse risk"
);

console.log(
  "PASS: no negative treasury"
);

console.log(
  "PASS: no negative army food"
);

console.log("");

console.log(
  "PACKAGE 3 MILITARY ECONOMY: PASS"
);
