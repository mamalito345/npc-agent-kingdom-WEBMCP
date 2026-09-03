import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getPlayableStrategicNodes,
  isPlayableStrategicNodeId,
} from "../lib/map/strategic-nodes";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  moveArmy,
} from "../lib/military/army-movement";

import {
  getMapInteractionState,
  selectMapArmy,
  targetMapArmy,
} from "../lib/ui/map-interaction";

async function main():
  Promise<void> {
  const strategicNodes =
    getPlayableStrategicNodes();

  assert.ok(
    strategicNodes.length >=
      50,
    `Expected many playable strategic nodes, got ${strategicNodes.length}`
  );

  const node =
    strategicNodes[0];

  if (!node) {
    throw new Error(
      "No playable strategic node found."
    );
  }

  assert.equal(
    isPlayableStrategicNodeId(
      node.id
    ),
    true
  );

  console.log(
    `PASS S1-01: ${strategicNodes.length} strategic/transit nodes are intentionally playable`
  );

  const worldBefore =
    getRuntimeWorldState();

  const armyId =
    "army-northreach-edwyn";

  const army =
    worldBefore.armies[
      armyId
    ];

  if (!army) {
    throw new Error(
      "Demo army missing."
    );
  }

  const originalPosition =
    worldBefore.simulation
      .entityPositions[
        armyId
      ];

  if (
    !originalPosition ||
    originalPosition.kind !==
      "node"
  ) {
    throw new Error(
      "Demo army is not at a node."
    );
  }

  const reachable =
    strategicNodes.find(
      (candidate) =>
        candidate.id !==
        originalPosition.nodeId
    );

  if (!reachable) {
    throw new Error(
      "No alternate strategic node available."
    );
  }

  const result =
    moveArmy(
      armyId,
      reachable.id
    );

  if (
    result.ok ===
    false
  ) {
    throw new Error(
      `Playable strategic node movement failed: ${result.error}`
    );
  }

  assert.ok(
    getRuntimeWorldState()
      .simulation
      .activeMovements[
        armyId
      ]
  );

  console.log(
    "PASS S1-02: army movement accepts a real strategic map node without teleporting"
  );

  updateRuntimeWorldState(
    () =>
      worldBefore
  );

  selectMapArmy(
    armyId
  );

  targetMapArmy(
    "army-eastvale-roderic"
  );

  const interaction =
    getMapInteractionState();

  assert.equal(
    interaction
      .selectedArmyId,
    armyId
  );

  assert.equal(
    interaction
      .targetArmyId,
    "army-eastvale-roderic"
  );

  console.log(
    "PASS S1-03: enemy targeting preserves the selected own army"
  );

  const armyLayer =
    readFileSync(
      "app/army-layer.tsx",
      "utf8"
    );

  assert.ok(
    armyLayer.includes(
      "getPlayerKnownEnemyForces"
    )
  );

  assert.ok(
    armyLayer.includes(
      "LAST KNOWN"
    )
  );

  assert.ok(
    !armyLayer.includes(
      "getArmySoldierCount(\n                  fact.subjectId"
    )
  );

  console.log(
    "PASS S1-04: foreign map tokens are knowledge-backed ghost markers, not canonical enemy leakage"
  );

  const panel =
    readFileSync(
      "app/operational-panel.tsx",
      "utf8"
    );

  assert.ok(
    panel.includes(
      "cancelPlayerOrder"
    )
  );

  assert.ok(
    panel.includes(
      "changeQueuedPlayerArmyOrder"
    )
  );

  assert.ok(
    panel.includes(
      "issuePlayerInterception"
    )
  );

  assert.ok(
    panel.includes(
      "recruitPlayerUnits"
    )
  );

  assert.ok(
    !panel.includes(
      "recruitUnits("
    )
  );

  console.log(
    "PASS S1-05: Human UI exposes cancel/change/intercept/recruit through canonical PlayerActions"
  );

  const movement =
    readFileSync(
      "lib/military/army-movement.ts",
      "utf8"
    );

  assert.ok(
    movement.includes(
      "isPlayableStrategicNode"
    )
  );

  assert.ok(
    !movement.includes(
      "world.locations[\n      destinationNodeId"
    )
  );

  console.log(
    "PASS S1-06: destination validation is map-node based rather than settlement-only"
  );

  console.log("");
  console.log(
    "FINAL GAMEPLAY BIG STEP 1 — STRATEGIC CORE: PASS"
  );
}

main().catch(
  (error: unknown) => {
    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
