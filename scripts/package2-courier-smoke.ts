import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  spawnCourier,
} from "../lib/world/couriers";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

const start =
  getRuntimeWorldState();

const courierResult =
  spawnCourier(
    "lord_edwyn",
    "king_aldric",
    "The road is secure.",
    "stoneford",
    "northwatch"
  );

if (!courierResult.ok) {
  throw new Error(
    `Courier spawn failed: ${courierResult.error}`
  );
}

const courier =
  courierResult.courier;

const activeMovement =
  getRuntimeWorldState()
    .simulation
    .activeMovements[
    courier.id
  ];

assert.ok(
  activeMovement,
  "Courier must have active movement."
);

assert.deepEqual(
  activeMovement.routeNodeIds,
  [
    "stoneford",
    "riverhold",
    "northwatch",
  ]
);

assert.equal(
  courier.status,
  "traveling"
);

console.log(
  "PASS: courier spawned"
);

console.log(
  "PASS: courier uses canonical graph route"
);

advanceWorldUntil(
  activeMovement.estimatedArrivalAt
);

const final =
  getRuntimeWorldState();

const deliveredCourier =
  final.couriers[
    courier.id
  ];

assert.equal(
  deliveredCourier.status,
  "delivered"
);

assert.ok(
  deliveredCourier.deliveredAt !==
    undefined
);

const finalPosition =
  final.simulation
    .entityPositions[
    courier.id
  ];

assert.deepEqual(
  finalPosition,
  {
    kind: "node",
    nodeId: "northwatch",
  }
);

const message =
  final.messages[
    courier.messageId
  ];

assert.ok(
  message.deliveredAt !==
    undefined
);

assert.equal(
  final.simulation
    .activeMovements[
    courier.id
  ],
  undefined
);

console.log(
  "PASS: courier moved through generic movement"
);

console.log(
  "PASS: courier arrived"
);

console.log(
  "PASS: message delivered"
);

console.log("");
console.log(
  "PACKAGE 2 COURIER FOUNDATION: PASS"
);