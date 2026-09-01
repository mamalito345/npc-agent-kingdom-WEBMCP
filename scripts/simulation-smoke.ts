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
  formatWorldTime,
} from "../lib/world/time";

const initial =
  getRuntimeWorldState();

assert.equal(
  initial.simulation.worldTimeMinutes,
  480
);

assert.equal(
  formatWorldTime(480),
  "Day 1 — 08:00"
);

const route = findRoute(
  "stoneford",
  "northwatch"
);

assert.ok(route);

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
  travelTo("northwatch");

assert.equal(
  travel.ok,
  true
);

if (!travel.ok) {
  throw new Error(
    "Travel unexpectedly failed."
  );
}

assert.equal(
  travel.interrupted,
  false
);

const final =
  getRuntimeWorldState();

assert.equal(
  final.player.locationId,
  "northwatch"
);

assert.deepEqual(
  final.simulation
    .entityPositions[
    final.player.characterId
  ],
  {
    kind: "node",
    nodeId: "northwatch",
  }
);

assert.equal(
  final.simulation
    .activeMovements[
    final.player.characterId
  ],
  undefined
);

assert.ok(
  final.simulation
    .resolvedEvents
    .some(
      (resolved) =>
        resolved.id === event.id
    )
);

assert.equal(
  final.simulation
    .worldTimeMinutes,
  travel.arrivedAt
);

console.log(
  "PASS: world clock"
);

console.log(
  "PASS: graph/pathfinding"
);

console.log(
  "PASS: scheduled intermediate event"
);

console.log(
  "PASS: timed travel"
);

console.log(
  "PASS: final node position"
);

console.log(
  "PASS: canonical arrival state"
);

console.log(
  `Final world time: ${formatWorldTime(
    final.simulation
      .worldTimeMinutes
  )}`
);

console.log(
  "PACKAGE 1 CORE SMOKE TEST: PASS"
);