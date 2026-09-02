import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  recruitUnits,
} from "../lib/military/recruitment";

import {
  getAvailableSettlementResources,
  getReservedResources,
} from "../lib/economy/reservations";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import {
  getSettlementMobilizationCapacity,
} from "../lib/military/settlement-capacity";

const DAY =
  24 * 60;

updateRuntimeWorldState(
  (world) => ({
    ...world,

    settlements: {
      ...world.settlements,

      stoneford: {
        ...world
          .settlements
          .stoneford,

        resources: {
          food: 10000,
          gold: 10000,
          wood: 10000,
          stone: 10000,
          metal: 10000,
        },
      },
    },
  })
);

assert.equal(
  getSettlementMobilizationCapacity(
    "stoneford"
  ),
  750
);

const ship =
  recruitUnits({
    settlementId:
      "stoneford",

    unitType:
      "ship",

    blocks: 1,

    actorId:
      "lord_edwyn",
  });

assert.equal(
  ship.ok,
  false
);

if (!ship.ok) {
  assert.equal(
    ship.error,
    "UNIT_NOT_RECRUITABLE"
  );
}

const unauthorized =
  recruitUnits({
    settlementId:
      "stoneford",

    unitType:
      "infantry",

    blocks: 1,

    actorId:
      "lord_merek",
  });

assert.equal(
  unauthorized.ok,
  false
);

if (
  !unauthorized.ok
) {
  assert.equal(
    unauthorized.error,
    "NOT_AUTHORIZED"
  );
}

const before =
  getRuntimeWorldState()
    .settlements
    .stoneford
    .resources;

const infantry =
  recruitUnits({
    settlementId:
      "stoneford",

    unitType:
      "infantry",

    blocks: 3,

    actorId:
      "lord_edwyn",
  });

assert.equal(
  infantry.ok,
  true
);

if (!infantry.ok) {
  throw new Error(
    "Expected infantry recruitment to succeed."
  );
}

assert.equal(
  infantry.order.blocks,
  3
);

const reserved =
  getReservedResources(
    "stoneford"
  );

assert.deepEqual(
  reserved,
  {
    food: 1050,
    gold: 2100,
    wood: 0,
    stone: 0,
    metal: 75,
  }
);

/**
 * Reservation does not immediately
 * consume physical stock.
 */
assert.deepEqual(
  getRuntimeWorldState()
    .settlements
    .stoneford
    .resources,
  before
);

const available =
  getAvailableSettlementResources(
    "stoneford"
  );

assert.deepEqual(
  available,
  {
    food: 8950,
    gold: 7900,
    wood: 10000,
    stone: 10000,
    metal: 9925,
  }
);

/**
 * Stoneford capacity = 750.
 *
 * Existing order already commits
 * exactly 750 soldiers.
 */
const overCapacity =
  recruitUnits({
    settlementId:
      "stoneford",

    unitType:
      "infantry",

    blocks: 1,

    actorId:
      "lord_edwyn",
  });

assert.equal(
  overCapacity.ok,
  false
);

if (!overCapacity.ok) {
  assert.equal(
    overCapacity.error,
    "MOBILIZATION_CAPACITY_EXCEEDED"
  );
}

const completionTime =
  infantry.order
    .completesAt;

assert.equal(
  completionTime,
  getRuntimeWorldState()
      .simulation
      .worldTimeMinutes +
    4 * DAY
);

advanceWorldUntil(
  completionTime
);

const after =
  getRuntimeWorldState();

const completedOrder =
  after
    .recruitmentOrders[
      infantry.order.id
    ];

assert.equal(
  completedOrder.status,
  "completed"
);

const armyId =
  `${infantry.order.id}-army`;

const army =
  after.armies[
    armyId
  ];

assert.ok(
  army
);

assert.equal(
  army.ownerId,
  "northreach"
);

assert.equal(
  army.commanderId,
  "lord_edwyn"
);

assert.equal(
  army.status,
  "garrison"
);

assert.equal(
  army.unitIds.length,
  3
);

for (
  const unitId
  of army.unitIds
) {
  const unit =
    after.unitBlocks[
      unitId
    ];

  assert.ok(
    unit
  );

  assert.equal(
    unit.type,
    "infantry"
  );

  assert.equal(
    unit.currentSoldiers,
    250
  );
}

assert.deepEqual(
  after
    .simulation
    .entityPositions[
      army.id
    ],
  {
    kind: "node",
    nodeId: "stoneford",
  }
);

assert.equal(
  after.kingdoms
    .northreach
    .armyIds
    .includes(
      army.id
    ),
  true
);

assert.deepEqual(
  getReservedResources(
    "stoneford"
  ),
  {
    food: 0,
    gold: 0,
    wood: 0,
    stone: 0,
    metal: 0,
  }
);

/**
 * Four daily boundaries were crossed.
 *
 * Stoneford production:
 *
 * Food +10/day
 * Gold +5/day
 * Wood +5/day
 * Stone +12/day
 * Metal +3/day
 *
 * Recruitment cost:
 *
 * 3 Infantry
 * Gold 2100
 * Food 1050
 * Metal 75
 */
assert.deepEqual(
  after
    .settlements
    .stoneford
    .resources,
  {
    food:
      10000 +
      40 -
      1050,

    gold:
      10000 +
      20 -
      2100,

    wood:
      10000 +
      20,

    stone:
      10000 +
      48,

    metal:
      10000 +
      12 -
      75,
  }
);

console.log(
  "PASS: recruitment authority"
);

console.log(
  "PASS: ship recruitment disabled"
);

console.log(
  "PASS: mobilization capacity"
);

console.log(
  "PASS: resource reservation"
);

console.log(
  "PASS: recruitment completion boundary"
);

console.log(
  "PASS: UnitBlock creation"
);

console.log(
  "PASS: Army creation"
);

console.log(
  "PASS: canonical army position"
);

console.log(
  "PASS: daily production + recruitment accounting"
);

console.log("");

console.log(
  "PACKAGE 3 RECRUITMENT FOUNDATION: PASS"
);