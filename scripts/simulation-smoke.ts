import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  findRoute,
} from "../lib/map/paths";

import {
  scheduleMarkerEvent,
} from "../lib/world/events";

import {
  travelTo,
} from "../lib/world/actions";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import {
  formatWorldTime,
} from "../lib/world/time";

const initial =
  getRuntimeWorldState();

assert.equal(
  initial
    .simulation
    .worldTimeMinutes,
  480
);

assert.equal(
  formatWorldTime(
    480
  ),
  "Day 1 — 08:00"
);

console.log(
  "PASS: world clock"
);

const route =
  findRoute(
    "stoneford",
    "northwatch"
  );

if (!route) {
  throw new Error(
    "Route Stoneford -> Northwatch not found."
  );
}

assert.deepEqual(
  route.nodeIds,
  [
    "stoneford",
    "riverhold",
    "northwatch",
  ]
);

assert.deepEqual(
  route.edgeIds,
  [
    "stoneford_riverhold",
    "riverhold_northwatch",
  ]
);

assert.equal(
  route.totalDistanceKm,
  380
);

assert.equal(
  route.effectiveDistanceKm,
  402
);

console.log(
  "PASS: physical route distance = 380 km"
);

console.log(
  "PASS: effective route movement cost = 402 km"
);

const event =
  scheduleMarkerEvent(
    1680,
    "Intermediate travel event"
  );

assert.equal(
  event.executeAt,
  1680
);

const travel =
  travelTo(
    "northwatch"
  );

if (
  travel.ok ===
  false
) {
  throw new Error(
    `Travel failed: ${travel.error}`
  );
}

assert.equal(
  travel.characterId,
  initial
    .player
    .characterId
);

assert.equal(
  travel.destinationId,
  "northwatch"
);

assert.equal(
  travel.physicalDistanceKm,
  380
);

assert.equal(
  travel.effectiveDistanceKm,
  402
);

assert.ok(
  travel.durationMinutes >
  0
);

const afterOrder =
  getRuntimeWorldState();

assert.equal(
  afterOrder
    .simulation
    .worldTimeMinutes,
  480
);

assert.equal(
  afterOrder
    .player
    .locationId,
  "stoneford"
);

assert.deepEqual(
  afterOrder
    .simulation
    .entityPositions[
      afterOrder
        .player
        .characterId
    ],
  {
    kind:
      "node",

    nodeId:
      "stoneford",
  }
);

const activeMovement =
  afterOrder
    .simulation
    .activeMovements[
      afterOrder
        .player
        .characterId
    ];

if (!activeMovement) {
  throw new Error(
    "Travel did not create ActiveMovement."
  );
}

assert.equal(
  activeMovement
    .destinationNodeId,
  "northwatch"
);

console.log(
  "PASS: travel begins without teleport"
);

const intermediateTarget =
  Math.min(
    event.executeAt,

    travel
      .estimatedArrivalAt -
      1
  );

if (
  intermediateTarget >
  afterOrder
    .simulation
    .worldTimeMinutes
) {
  const intermediateResult =
    advanceWorldUntil(
      intermediateTarget
    );

  if (
    intermediateResult
      .interrupt
  ) {
    throw new Error(
      `Unexpected intermediate interrupt: ${intermediateResult.interrupt.type}`
    );
  }
}

const during =
  getRuntimeWorldState();

if (
  during
    .simulation
    .worldTimeMinutes <
  travel
    .estimatedArrivalAt
) {
  const position =
    during
      .simulation
      .entityPositions[
        during
          .player
          .characterId
      ];

  if (!position) {
    throw new Error(
      "Travelling player has no canonical position."
    );
  }

  assert.ok(
    position.kind ===
      "node" ||
    position.kind ===
      "edge"
  );

  assert.ok(
    during
      .simulation
      .activeMovements[
        during
          .player
          .characterId
      ]
  );

  console.log(
    "PASS: physical travel position progresses through world time"
  );
}

const arrival =
  advanceWorldUntil(
    travel
      .estimatedArrivalAt
  );

if (
  arrival.interrupt
) {
  throw new Error(
    `Unexpected arrival interrupt: ${arrival.interrupt.type}`
  );
}

assert.equal(
  arrival.reachedTarget,
  true
);

const final =
  getRuntimeWorldState();

assert.equal(
  final
    .simulation
    .worldTimeMinutes,
  travel
    .estimatedArrivalAt
);

assert.equal(
  final.player.locationId,
  "northwatch"
);

assert.deepEqual(
  final.simulation
    .entityPositions[
      final
        .player
        .characterId
    ],
  {
    kind:
      "node",

    nodeId:
      "northwatch",
  }
);

assert.equal(
  final.simulation
    .activeMovements[
      final
        .player
        .characterId
    ],
  undefined
);

console.log(
  "PASS: canonical arrival state"
);

if (
  event.executeAt <=
  final
    .simulation
    .worldTimeMinutes
) {
  assert.ok(
    final
      .simulation
      .resolvedEvents
      .some(
        (
          resolved
        ) =>
          resolved.id ===
          event.id
      )
  );

  console.log(
    "PASS: scheduled event resolved during travel"
  );
}

console.log(
  `Final world time: ${formatWorldTime(
    final
      .simulation
      .worldTimeMinutes
  )}`
);

console.log(
  "PACKAGE 1 CORE SMOKE TEST: PASS"
);