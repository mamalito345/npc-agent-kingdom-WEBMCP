import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import {
  getPointAlongPolyline,
} from "../lib/map/visual";

import {
  settlementVisuals,
} from "../data/map/settlement-visuals";

import {
  roadVisuals,
} from "../data/map/road-visuals";

import {
  mapEdges,
} from "../data/map";

import {
  visualMapConfig,
} from "../data/map/map-config";

const initial =
  getRuntimeWorldState();

const stonefordBefore =
  initial.settlements
    .stoneford.resources.food;

const dailyFood =
  initial.settlements
    .stoneford
    .dailyProduction.food;

const startTime =
  initial.simulation
    .worldTimeMinutes;

const thirdBoundary =
  3 * 24 * 60;

advanceWorldUntil(
  thirdBoundary
);

const after =
  getRuntimeWorldState();

const crossedBoundaries =
  Math.floor(
    thirdBoundary /
      (24 * 60)
  ) -
  Math.floor(
    startTime /
      (24 * 60)
  );

assert.equal(
  after.settlements
    .stoneford.resources.food,
  stonefordBefore +
    dailyFood *
      crossedBoundaries
);

console.log(
  "PASS: daily production"
);

for (
  const visual of Object.values(
    settlementVisuals
  )
) {
  assert.ok(
    initial.settlements[
      visual.settlementId
    ],
    `Missing settlement ${visual.settlementId}`
  );

  assert.ok(
    visual.x >= 0 &&
      visual.x <=
        visualMapConfig.width
  );

  assert.ok(
    visual.y >= 0 &&
      visual.y <=
        visualMapConfig.height
  );
}

console.log(
  "PASS: settlement visuals valid"
);

for (
  const road of Object.values(
    roadVisuals
  )
) {
  assert.ok(
    mapEdges[
      road.edgeId
    ],
    `Missing graph edge ${road.edgeId}`
  );

  assert.ok(
    road.points.length >= 2
  );
}

console.log(
  "PASS: road visuals valid"
);

const unevenPolyline = [
  {
    x: 0,
    y: 0,
  },
  {
    x: 10,
    y: 0,
  },
  {
    x: 10,
    y: 30,
  },
];

assert.deepEqual(
  getPointAlongPolyline(
    unevenPolyline,
    0
  ),
  {
    x: 0,
    y: 0,
  }
);

assert.deepEqual(
  getPointAlongPolyline(
    unevenPolyline,
    1
  ),
  {
    x: 10,
    y: 30,
  }
);

const halfway =
  getPointAlongPolyline(
    unevenPolyline,
    0.5
  );

assert.ok(
  halfway
);

assert.equal(
  halfway?.x,
  10
);

assert.equal(
  halfway?.y,
  10
);

console.log(
  "PASS: polyline sampling uses distance"
);

console.log("");
console.log(
  "PACKAGE 2 ECONOMY + MAP CONFIG: PASS"
);