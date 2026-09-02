import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  captureSettlement,
} from "../lib/military/conquest";

import {
  raidSettlement,
} from "../lib/military/raid";

import {
  processSettlementOperations,
} from "../lib/military/settlement-operations";

import {
  inspectSettlementOccupation,
} from "../lib/military/occupation";

import {
  MINUTES_PER_DAY,
} from "../lib/world/time";

import type {
  Army,
  UnitBlock,
} from "../types/military";

const unit:
  UnitBlock = {
  id:
    "conquest-infantry",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const army:
  Army = {
  id:
    "conquest-army",

  ownerId:
    "eastvale",

  unitIds: [
    unit.id,
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
  (world) => {
    const stoneford =
      world.settlements[
        "stoneford"
      ];

    assert.ok(
      stoneford
    );

    return {
      ...world,

      unitBlocks: {
        ...world.unitBlocks,

        [unit.id]:
          unit,
      },

      armies: {
        ...world.armies,

        [army.id]:
          army,
      },

      settlements: {
        ...world
          .settlements,

        stoneford: {
          ...stoneford,

          resources: {
            ...stoneford
              .resources,

            food:
              1000,

            gold:
              1000,
          },

          controllerKingdomId:
            undefined,

          occupiedAt:
            undefined,
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
    };
  }
);

const before =
  getRuntimeWorldState();

const politicalOwner =
  before.settlements
    .stoneford.kingdomId;

assert.notEqual(
  politicalOwner,
  army.ownerId
);

const capture =
  captureSettlement(
    army.id,
    "stoneford"
  );

assert.equal(
  capture.ok,
  true
);

const afterCapture =
  getRuntimeWorldState();

assert.equal(
  afterCapture
    .settlements
    .stoneford
    .controllerKingdomId,
  army.ownerId
);

assert.equal(
  afterCapture
    .settlements
    .stoneford
    .kingdomId,
  politicalOwner
);

const occupation =
  inspectSettlementOccupation(
    "stoneford"
  );

assert.equal(
  occupation.ok,
  true
);

if (
  occupation.ok
) {
  assert.equal(
    occupation
      .occupation
      .economicMultiplier,
    0.25
  );
}

console.log(
  "PASS: political owner preserved"
);

console.log(
  "PASS: military controller changed"
);

console.log(
  "PASS: occupation started"
);

//
// For raid test return control
// to original owner first.
//
updateRuntimeWorldState(
  (world) => ({
    ...world,

    settlements: {
      ...world.settlements,

      stoneford: {
        ...world
          .settlements
          .stoneford,

        controllerKingdomId:
          politicalOwner,

        occupiedAt:
          undefined,
      },
    },
  })
);

const raid =
  raidSettlement(
    army.id,
    "stoneford"
  );

assert.equal(
  raid.ok,
  true
);

if (!raid.ok) {
  throw new Error(
    "Raid should start."
  );
}

assert.equal(
  raid.operation
    .completesAt -
    raid.operation
      .startedAt,
  MINUTES_PER_DAY
);

const completeAt =
  raid.operation
    .completesAt;

processSettlementOperations(
  completeAt
);

const afterRaid =
  getRuntimeWorldState();

assert.equal(
  afterRaid
    .settlementOperations[
      raid.operation.id
    ]
    .status,
  "completed"
);

assert.equal(
  afterRaid
    .settlements
    .stoneford
    .resources
    .food,
  750
);

assert.equal(
  afterRaid
    .settlements
    .stoneford
    .resources
    .gold,
  850
);

assert.equal(
  afterRaid
    .settlements
    .stoneford
    .productionDamage
    ?.multiplier,
  0.75
);

console.log(
  "PASS: raid duration"
);

console.log(
  "PASS: raid food removal"
);

console.log(
  "PASS: raid local gold removal"
);

console.log(
  "PASS: raid production damage"
);

console.log("");

console.log(
  "PACKAGE 3 CONQUEST: PASS"
);