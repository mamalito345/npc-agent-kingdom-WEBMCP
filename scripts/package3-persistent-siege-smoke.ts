import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  startWar,
} from "../lib/military/war";

import {
  startSiege,
} from "../lib/military/siege";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import type {
  Army,
  UnitBlock,
} from "../types/military";

function makeInfantry(
  id: string
): UnitBlock {
  return {
    id,
    type:
      "infantry",
    currentSoldiers:
      250,
  };
}

function makeSiegeUnit(
  id: string
): UnitBlock {
  return {
    id,
    type:
      "siege",

    currentSoldiers:
      1,
  };
}

function makeArmy(
  id: string,
  ownerId: string,
  unitIds: string[]
): Army {
  return {
    id,
    ownerId,

    commanderId:
      `${id}-commander`,

    unitIds,

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

const attackerRealm =
  initial.characters[
    initial.player
      .characterId
  ].kingdomId;

const defenderRealm =
  Object.keys(
    initial.kingdoms
  ).find(
    (id) =>
      id !==
      attackerRealm
  );

assert.ok(
  defenderRealm
);

const infantry =
  makeInfantry(
    "c26-infantry"
  );

const siegeUnit =
  makeSiegeUnit(
    "c26-siege-unit"
  );

const army =
  makeArmy(
    "c26-siege-army",
    attackerRealm,
    [
      infantry.id,
      siegeUnit.id,
    ]
  );

const startTime =
  8 * 60;

updateRuntimeWorldState(
  (current) => ({
    ...current,

    wars: {},

    sieges: {},

    battles: {},

    battleResults: {},

    unitBlocks: {
      ...current.unitBlocks,

      [infantry.id]:
        infantry,

      [siegeUnit.id]:
        siegeUnit,
    },

    armies: {
      ...current.armies,

      [army.id]:
        army,
    },

    settlements: {
      ...current.settlements,

      stoneford: {
        ...current
          .settlements
          .stoneford,

        kingdomId:
          defenderRealm!,

        controllerKingdomId:
          defenderRealm!,

        fortificationLevel:
          2,

        fortificationIntegrity:
          100,
      },
    },

    simulation: {
      ...current.simulation,

      worldTimeMinutes:
        startTime,

      scheduledEvents: [],

      resolvedEvents: [],

      activeMovements: {},

      entityPositions: {
        ...current
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

//
// War required before siege.
//
const warResult =
  startWar(
    attackerRealm,
    defenderRealm!
  );

if (!warResult.ok) {
  throw new Error(
    `War could not start: ${warResult.error}`
  );
}
if (!warResult.ok) {
  throw new Error(
    "War could not start"
  );
}

console.log(
  "PASS: active war created"
);

//
// Start siege.
//
const siegeResult =
  startSiege({
    armyId:
      army.id,

    settlementId:
      "stoneford",
  });

if (!siegeResult.ok) {
  throw new Error(
    `Siege failed: ${siegeResult.error}`
  );
}

assert.equal(
  siegeResult.ok,
  true
);

const siegeId =
  siegeResult.siege.id;

assert.equal(
  siegeResult
    .siege
    .warId,
  warResult.war.id
);

assert.equal(
  siegeResult
    .siege
    .currentPhase,
  "encirclement"
);

assert.equal(
  getRuntimeWorldState()
    .armies[
      army.id
    ].status,
  "siege"
);

console.log(
  "PASS: persistent siege started and linked to war"
);

//
// 6h -> bombardment.
//
const bombardmentTime =
  startTime +
  360;

const bombardmentAdvance =
  advanceWorldUntil(
    bombardmentTime
  );

assert.equal(
  bombardmentAdvance
    .reachedTarget,
  true
);

let world =
  getRuntimeWorldState();

let siege =
  world.sieges[
    siegeId
  ];

assert.equal(
  siege.currentPhase,
  "bombardment"
);

const integrityAfterBombardment =
  world.settlements
    .stoneford
    .fortificationIntegrity!;

assert.ok(
  integrityAfterBombardment <
    100
);

assert.ok(
  integrityAfterBombardment >
    0
);

console.log(
  `PASS: bombardment damaged fortification to ${integrityAfterBombardment}`
);

//
// 12h more -> breach.
//
const breachTime =
  bombardmentTime +
  720;

const breachAdvance =
  advanceWorldUntil(
    breachTime
  );

assert.equal(
  breachAdvance
    .reachedTarget,
  true
);

world =
  getRuntimeWorldState();

siege =
  world.sieges[
    siegeId
  ];

const integrityAfterBreach =
  world.settlements
    .stoneford
    .fortificationIntegrity!;

assert.ok(
  integrityAfterBreach <
    integrityAfterBombardment
);

console.log(
  `PASS: breach phase inflicted additional damage to ${integrityAfterBreach}`
);

//
// With one siege block:
//
// first damage = 25
// second damage = 35
//
// 100 -> 75 -> 40
//
// Next cycle bombardment:
// 40 -> 15
//
// Next breach:
// 15 -> 0
//
// Total:
//
const secondBombardmentTime =
  breachTime +
  360;

advanceWorldUntil(
  secondBombardmentTime
);

world =
  getRuntimeWorldState();

assert.equal(
  world.sieges[
    siegeId
  ].status,
  "active"
);

assert.equal(
  world.settlements
    .stoneford
    .fortificationIntegrity,
  15
);

console.log(
  "PASS: siege persisted across multiple phases instead of resolving instantly"
);

const finalBreachTime =
  secondBombardmentTime +
  720;

const finalAdvance =
  advanceWorldUntil(
    finalBreachTime
  );

assert.equal(
  finalAdvance
    .reachedTarget,
  true
);

world =
  getRuntimeWorldState();

siege =
  world.sieges[
    siegeId
  ];

assert.equal(
  world.settlements
    .stoneford
    .fortificationIntegrity,
  0
);

assert.equal(
  siege.status,
  "ended"
);

assert.equal(
  siege.currentPhase,
  "ended"
);

assert.equal(
  siege.outcome,
  "breached"
);

assert.equal(
  siege.nextPhaseAt,
  undefined
);

assert.equal(
  world.armies[
    army.id
  ].status,
  "field"
);

assert.equal(
  world.wars[
    warResult.war.id
  ].status,
  "active"
);

console.log(
  "PASS: fortification eventually breached deterministically"
);

console.log(
  "PASS: attacking army released from siege state"
);

console.log(
  "PASS: war remains active after siege breach"
);

//
// History.
//
assert.ok(
  siege.history.some(
    (entry) =>
      entry.type ===
      "siege_started"
  )
);

assert.ok(
  siege.history.filter(
    (entry) =>
      entry.type ===
      "fortification_damaged"
  ).length >= 4
);

assert.ok(
  siege.history.some(
    (entry) =>
      entry.type ===
      "siege_ended"
  )
);

console.log(
  "PASS: persistent siege history recorded"
);

console.log("");

console.log(
  "============================================"
);

console.log(
  "PACKAGE 3 C2.6 PERSISTENT SIEGE: PASS"
);

console.log(
  "============================================"
);