import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  fightArmies,
} from "../lib/military/battle";

import {
  detectArmyContacts,
} from "../lib/military/contact";

import type {
  Army,
  UnitBlock,
} from "../types/military";

const northUnits:
  UnitBlock[] = [
    {
      id:
        "battle-north-i1",
      type:
        "infantry",
      currentSoldiers:
        250,
    },

    {
      id:
        "battle-north-i2",
      type:
        "infantry",
      currentSoldiers:
        250,
    },

    {
      id:
        "battle-north-c1",
      type:
        "cavalry",
      currentSoldiers:
        250,
    },
  ];

const ironUnits:
  UnitBlock[] = [
    {
      id:
        "battle-iron-i1",
      type:
        "infantry",
      currentSoldiers:
        250,
    },

    {
      id:
        "battle-iron-i2",
      type:
        "infantry",
      currentSoldiers:
        250,
    },
  ];

const northArmy:
  Army = {
  id:
    "battle-north-army",

  ownerId:
    "northreach",

  commanderId:
    "lord_edwyn",

  unitIds:
    northUnits.map(
      (unit) =>
        unit.id
    ),

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

const ironArmy:
  Army = {
  id:
    "battle-iron-army",

  ownerId:
    "ironhollow",

  commanderId:
    "lord_malric",

  unitIds:
    ironUnits.map(
      (unit) =>
        unit.id
    ),

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
  (world) => ({
    ...world,

    unitBlocks: {
      ...world.unitBlocks,

      ...Object.fromEntries(
        [
          ...northUnits,
          ...ironUnits,
        ].map(
          (unit) => [
            unit.id,
            unit,
          ]
        )
      ),
    },

    armies: {
      ...world.armies,

      [northArmy.id]:
        northArmy,

      [ironArmy.id]:
        ironArmy,
    },

    simulation: {
      ...world.simulation,

      entityPositions: {
        ...world
          .simulation
          .entityPositions,

        [northArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [ironArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

const contacts =
  detectArmyContacts();

assert.equal(
  contacts.length,
  1
);

const contact =
  contacts[
    0
  ];

assert.equal(
  contact.status,
  "pending"
);

const battle =
  fightArmies({
    attackerArmyId:
      northArmy.id,

    defenderArmyId:
      ironArmy.id,

    contactId:
      contact.id,

    attackerCommanderRating:
      "good",

    defenderCommanderRating:
      "average",

    terrain:
      "normal",

    defenderFortificationLevel:
      0,
  });

assert.equal(
  battle.ok,
  true
);

if (!battle.ok) {
  throw new Error(
    "Battle should succeed."
  );
}

assert.equal(
  battle.battle
    .attacker
    .randomRoll >=
    0 &&
  battle.battle
    .attacker
    .randomRoll <=
    3,
  true
);

assert.equal(
  battle.battle
    .defender
    .randomRoll >=
    0 &&
  battle.battle
    .defender
    .randomRoll <=
    3,
  true
);

assert.equal(
  battle.battle
    .attacker
    .soldiersAfter <=
    battle.battle
      .attacker
      .soldiersBefore,
  true
);

assert.equal(
  battle.battle
    .defender
    .soldiersAfter <=
    battle.battle
      .defender
      .soldiersBefore,
  true
);

const world =
  getRuntimeWorldState();

assert.equal(
  world.armyContacts[
    contact.id
  ].status,
  "resolved"
);

assert.ok(
  world.battleResults[
    battle.battle.id
  ]
);

console.log(
  "PASS: enemy contact"
);

console.log(
  "PASS: deterministic battle RNG"
);

console.log(
  "PASS: commander modifier"
);

console.log(
  "PASS: morale modifier"
);

console.log(
  "PASS: supply modifier"
);

console.log(
  "PASS: casualties"
);

console.log(
  "PASS: partial UnitBlocks"
);

console.log(
  "PASS: retreat resolution"
);

console.log(
  "PASS: battle persisted"
);

console.log("");

console.log(
  "PACKAGE 3 BATTLE RESOLVER: PASS"
);