import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  scheduleInterruptEvent,
} from "../lib/world/events";

import {
  beginTravelTo,
} from "../lib/world/actions";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import {
  formatWorldTime,
  isWorldPaused,
  pauseWorld,
  resumeWorld,
} from "../lib/world/time";

const initial = getRuntimeWorldState();

const playerId = initial.player.characterId;

assert.equal(
  initial.simulation.worldTimeMinutes,
  480
);

console.log(
  "Initial:",
  formatWorldTime(
    initial.simulation.worldTimeMinutes
  )
);

/*
 * Pause / resume state.
 *
 * Paused state is reserved for the future automatic
 * simulation runner.
 *
 * Explicit advanceWorldUntil() calls are still allowed.
 */

pauseWorld();

assert.equal(
  isWorldPaused(),
  true
);

resumeWorld();

assert.equal(
  isWorldPaused(),
  false
);

/*
 * Begin travel without automatically resolving it.
 */

const travel = beginTravelTo(
  "northwatch"
);

if (!travel.ok) {
  throw new Error(
    `Travel start failed: ${travel.error}`
  );
}

assert.ok(
  travel.movement,
  "Expected active movement after beginTravelTo()."
);

if (!travel.movement) {
  throw new Error(
    "Expected travel.movement to exist."
  );
}

const movement = travel.movement;

assert.equal(
  movement.destinationNodeId,
  "northwatch"
);

assert.deepEqual(
  movement.routeNodeIds,
  [
    "stoneford",
    "riverhold",
    "northwatch",
  ]
);

assert.deepEqual(
  movement.routeEdgeIds,
  [
    "stoneford_riverhold",
    "riverhold_northwatch",
  ]
);

assert.equal(
  travel.durationMinutes,
  2850
);

assert.equal(
  movement.estimatedArrivalAt,
  travel.departedAt +
    travel.durationMinutes
);

console.log(
  "PASS: movement started without teleport"
);

/*
 * Schedule deterministic interrupt
 * 12 world hours after departure.
 */

const interruptTime =
  travel.departedAt +
  12 * 60;

const interruptEvent =
  scheduleInterruptEvent(
    interruptTime,
    "TEST_ROAD_CONTACT",
    "A traveller blocks the road."
  );

/*
 * Try to advance all the way to arrival.
 *
 * The simulation must stop at the interrupt.
 */

const firstAdvance =
  advanceWorldUntil(
    travel.estimatedArrivalAt
  );

assert.equal(
  firstAdvance.reachedTarget,
  false
);

assert.equal(
  firstAdvance.currentTime,
  interruptTime
);

assert.ok(
  firstAdvance.interrupt,
  "Expected simulation interrupt."
);

assert.equal(
  firstAdvance.interrupt?.type,
  "TEST_ROAD_CONTACT"
);

assert.equal(
  firstAdvance.interrupt?.eventId,
  interruptEvent.id
);

console.log(
  "PASS: interrupt stopped advanceWorldUntil"
);

/*
 * Inspect interrupted world state.
 */

const interruptedState =
  getRuntimeWorldState();

assert.equal(
  interruptedState.simulation
    .worldTimeMinutes,
  interruptTime
);

const interruptedPosition =
  interruptedState.simulation
    .entityPositions[playerId];

assert.ok(
  interruptedPosition,
  "Expected player position."
);

/*
 * Player must physically be on an edge,
 * not already at Northwatch.
 */

assert.equal(
  interruptedPosition.kind,
  "edge"
);

assert.notEqual(
  interruptedState.player.locationId,
  "northwatch"
);

console.log(
  "PASS: player remained physically on edge"
);

/*
 * Active movement must survive the interrupt.
 */

const interruptedMovement =
  interruptedState.simulation
    .activeMovements[playerId];

assert.ok(
  interruptedMovement,
  "Movement should survive interrupt."
);

assert.equal(
  interruptedMovement.destinationNodeId,
  "northwatch"
);

assert.equal(
  interruptedMovement.id,
  movement.id
);

console.log(
  "PASS: movement survived interrupt"
);

/*
 * Interrupt event must leave scheduled queue
 * and enter resolved event history.
 */

const stillScheduled =
  interruptedState.simulation
    .scheduledEvents
    .some(
      (event) =>
        event.id ===
        interruptEvent.id
    );

assert.equal(
  stillScheduled,
  false
);

const resolvedInterrupt =
  interruptedState.simulation
    .resolvedEvents
    .find(
      (event) =>
        event.id ===
        interruptEvent.id
    );

assert.ok(
  resolvedInterrupt,
  "Expected interrupt in resolved history."
);

assert.equal(
  resolvedInterrupt.timestamp,
  interruptTime
);

assert.equal(
  resolvedInterrupt.type,
  "SIMULATION_INTERRUPT"
);

console.log(
  "PASS: interrupt entered event history"
);

/*
 * Resume the SAME movement.
 *
 * No second beginTravelTo() call should happen.
 */

const secondAdvance =
  advanceWorldUntil(
    movement.estimatedArrivalAt
  );

assert.equal(
  secondAdvance.reachedTarget,
  true
);

assert.equal(
  secondAdvance.currentTime,
  movement.estimatedArrivalAt
);

console.log(
  "PASS: interrupted movement resumed"
);

/*
 * Final state.
 */

const final =
  getRuntimeWorldState();

assert.equal(
  final.simulation.worldTimeMinutes,
  movement.estimatedArrivalAt
);

assert.equal(
  final.player.locationId,
  "northwatch"
);

const finalPosition =
  final.simulation
    .entityPositions[playerId];

assert.deepEqual(
  finalPosition,
  {
    kind: "node",
    nodeId: "northwatch",
  }
);

assert.equal(
  final.simulation
    .activeMovements[playerId],
  undefined
);

console.log(
  "PASS: final arrival"
);

console.log(
  "Final:",
  formatWorldTime(
    final.simulation.worldTimeMinutes
  )
);

assert.equal(
  formatWorldTime(
    final.simulation.worldTimeMinutes
  ),
  "Day 3 — 07:30"
);

console.log(
  "PASS: deterministic final world time"
);

console.log("");
console.log(
  "PACKAGE 1 INTERRUPT TEST: PASS"
);