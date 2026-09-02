import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  recruitUnits,
} from "../lib/military/recruitment";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import {
  moveArmy,
} from "../lib/military/army-movement";

import {
  splitArmy,
  mergeArmies,
} from "../lib/military/army-organization";

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
          food: 20000,
          gold: 20000,
          wood: 20000,
          stone: 20000,
          metal: 20000,
        },
      },
    },
  })
);

const recruitment =
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
  recruitment.ok,
  true
);

if (
  !recruitment.ok
) {
  throw new Error(
    "Recruitment should succeed."
  );
}

advanceWorldUntil(
  recruitment
    .order
    .completesAt
);

const originalArmyId =
  `${recruitment.order.id}-army`;

let world =
  getRuntimeWorldState();

const originalArmy =
  world.armies[
    originalArmyId
  ];

assert.ok(
  originalArmy
);

assert.equal(
  originalArmy
    .unitIds
    .length,
  3
);

const split =
  splitArmy(
    originalArmyId,
    [
      originalArmy
        .unitIds[
          0
        ],
    ]
  );

assert.equal(
  split.ok,
  true
);

if (!split.ok) {
  throw new Error(
    "Army split should succeed."
  );
}

world =
  getRuntimeWorldState();

assert.equal(
  world.armies[
    originalArmyId
  ].unitIds.length,
  2
);

assert.equal(
  world.armies[
    split.newArmyId
  ].unitIds.length,
  1
);

assert.deepEqual(
  world.simulation
    .entityPositions[
      originalArmyId
    ],
  world.simulation
    .entityPositions[
      split.newArmyId
    ]
);

const merge =
  mergeArmies(
    originalArmyId,
    split.newArmyId
  );

assert.equal(
  merge.ok,
  true
);

world =
  getRuntimeWorldState();

assert.equal(
  world.armies[
    originalArmyId
  ].unitIds.length,
  3
);

assert.equal(
  world.armies[
    split.newArmyId
  ],
  undefined
);

const movement =
  moveArmy(
    originalArmyId,
    "riverhold"
  );

assert.equal(
  movement.ok,
  true
);

if (
  !movement.ok
) {
  throw new Error(
    "Army movement should succeed."
  );
}

world =
  getRuntimeWorldState();

assert.equal(
  world.armies[
    originalArmyId
  ].status,
  "field"
);

assert.ok(
  world.simulation
    .activeMovements[
      originalArmyId
    ]
);

const arrival =
  movement
    .estimatedArrivalAt;

advanceWorldUntil(
  arrival
);

world =
  getRuntimeWorldState();

assert.equal(
  world.simulation
    .activeMovements[
      originalArmyId
    ],
  undefined
);

assert.deepEqual(
  world.simulation
    .entityPositions[
      originalArmyId
    ],
  {
    kind: "node",
    nodeId: "riverhold",
  }
);

console.log(
  "PASS: army split"
);

console.log(
  "PASS: army merge"
);

console.log(
  "PASS: canonical army movement"
);

console.log(
  "PASS: army movement completion"
);

console.log("");

console.log(
  "PACKAGE 3 ARMY OPERATIONS: PASS"
);