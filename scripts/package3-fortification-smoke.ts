import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  fortify,
} from "../lib/military/fortification";

import {
  getNextFortificationCompletionBoundary,
  processFortificationCompletions,
} from "../lib/military/fortification-completion";

import {
  getAvailableSettlementResources,
} from "../lib/economy/reservations";

const worldBefore =
  getRuntimeWorldState();

const stoneford =
  worldBefore.settlements[
    "stoneford"
  ];

assert.ok(
  stoneford
);

//
// Give Stoneford enough resources
// and reset fortification.
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

        fortificationLevel:
          0,

        controllerKingdomId:
          world.characters[
            world.player.characterId
          ].kingdomId,

        resources: {
          gold:
            50000,

          food:
            50000,

          wood:
            50000,

          stone:
            50000,

          metal:
            50000,
        },
      },
    },

    fortificationOrders:
      {},
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
  fortify({
    settlementId:
      "stoneford",
  });

assert.equal(
  result.ok,
  true
);

if (!result.ok) {
  throw new Error(
    "Fortification should start."
  );
}

assert.equal(
  result.order.fromLevel,
  0
);

assert.equal(
  result.order.toLevel,
  1
);

assert.equal(
  result.order.status,
  "active"
);

console.log(
  "PASS: fortification started"
);

const availableAfterReservation =
  getAvailableSettlementResources(
    "stoneford"
  );

assert.ok(
  availableAfterReservation
);

assert.equal(
  availableAfterReservation
    .gold <
    availableBefore.gold,
  true
);

assert.equal(
  availableAfterReservation
    .wood <
    availableBefore.wood,
  true
);

assert.equal(
  availableAfterReservation
    .stone <
    availableBefore.stone,
  true
);

assert.equal(
  availableAfterReservation
    .metal <
    availableBefore.metal,
  true
);

console.log(
  "PASS: resources reserved"
);

const boundary =
  getNextFortificationCompletionBoundary();

assert.equal(
  boundary,
  result.order
    .completesAt
);

processFortificationCompletions(
  result.order
    .completesAt
);

const completedWorld =
  getRuntimeWorldState();

assert.equal(
  completedWorld
    .fortificationOrders[
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

console.log(
  "PASS: fortification completed"
);

console.log(
  "PASS: canonical fortification level updated"
);

console.log("");

console.log(
  "PACKAGE 3 FORTIFICATION: PASS"
);