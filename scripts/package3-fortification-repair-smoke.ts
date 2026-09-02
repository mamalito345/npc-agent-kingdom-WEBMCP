import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  repairFortification,
} from "../lib/military/fortification-repair";

import {
  getNextFortificationRepairBoundary,
  processFortificationRepairs,
} from "../lib/military/fortification-repair-completion";

import {
  getAvailableSettlementResources,
} from "../lib/economy/reservations";

import {
  MINUTES_PER_DAY,
} from "../lib/world/time";

const initialWorld =
  getRuntimeWorldState();

const playerKingdomId =
  initialWorld.characters[
    initialWorld.player
      .characterId
  ].kingdomId;

updateRuntimeWorldState(
  (world) => ({
    ...world,

    settlements: {
      ...world.settlements,

      stoneford: {
        ...world
          .settlements
          .stoneford,

        fortificationLevel:
          1,

        fortificationIntegrity:
          50,

        controllerKingdomId:
          playerKingdomId,

        resources: {
          food: 50000,
          gold: 50000,
          wood: 50000,
          stone: 50000,
          metal: 50000,
        },
      },
    },

    fortificationOrders:
      {},

    fortificationRepairOrders:
      {},

    settlementResourceReservations:
      {
        ...world
          .settlementResourceReservations,

        stoneford: {
          food: 0,
          gold: 0,
          wood: 0,
          stone: 0,
          metal: 0,
        },
      },
  })
);

const availableBefore =
  getAvailableSettlementResources(
    "stoneford"
  );

assert.ok(
  availableBefore
);

const result =
  repairFortification({
    settlementId:
      "stoneford",
  });

assert.equal(
  result.ok,
  true
);

if (!result.ok) {
  throw new Error(
    "Repair should start."
  );
}

assert.equal(
  result.order
    .fromIntegrity,
  50
);

assert.equal(
  result.order
    .toIntegrity,
  100
);

console.log(
  "PASS: repair started"
);

//
// Level 1 full cost:
// G1000 / W500 / S200 / M30
//
// 50% damage:
// G500 / W250 / S100 / M15
//
assert.deepEqual(
  result.order
    .reservedResources,
  {
    food: 0,
    gold: 500,
    wood: 250,
    stone: 100,
    metal: 15,
  }
);

console.log(
  "PASS: repair cost scales with damage"
);

//
// Level 1 full duration = 6 days.
// 50% damage = 3 days.
//
assert.equal(
  result.order
    .completesAt -
    result.order
      .startedAt,
  3 *
    MINUTES_PER_DAY
);

console.log(
  "PASS: repair duration scales with damage"
);

const availableAfter =
  getAvailableSettlementResources(
    "stoneford"
  );

assert.ok(
  availableAfter
);

assert.equal(
  availableBefore.gold -
    availableAfter.gold,
  500
);

assert.equal(
  availableBefore.wood -
    availableAfter.wood,
  250
);

assert.equal(
  availableBefore.stone -
    availableAfter.stone,
  100
);

assert.equal(
  availableBefore.metal -
    availableAfter.metal,
  15
);

console.log(
  "PASS: repair resources reserved"
);

const boundary =
  getNextFortificationRepairBoundary();

assert.equal(
  boundary,
  result.order
    .completesAt
);

processFortificationRepairs(
  result.order
    .completesAt
);

const completedWorld =
  getRuntimeWorldState();

assert.equal(
  completedWorld
    .fortificationRepairOrders[
      result.order.id
    ]
    .status,
  "completed"
);

assert.equal(
  completedWorld
    .settlements
    .stoneford
    .fortificationLevel,
  1
);

assert.equal(
  completedWorld
    .settlements
    .stoneford
    .fortificationIntegrity,
  100
);

console.log(
  "PASS: repair completed"
);

console.log(
  "PASS: fortification level preserved"
);

console.log(
  "PASS: fortification integrity restored"
);

console.log("");

console.log(
  "PACKAGE 3 FORTIFICATION REPAIR: PASS"
);