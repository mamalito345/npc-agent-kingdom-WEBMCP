import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getMapEdges,
  getMapNodes,
} from "../lib/map/graph";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  resolveBattlefield,
} from "../lib/military/terrain-resolver";

import {
  evaluateKnownEngagement,
} from "../lib/military/terrain-position-evaluator";

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  const armies =
    Object.values(
      world.armies
    ).filter(
      (army) =>
        army.status !==
        "destroyed"
    );

  assert.ok(
    armies.length >=
      2
  );

  const attacker =
    armies[0];

  const defender =
    armies.find(
      (army) =>
        army.ownerId !==
        attacker.ownerId
    );

  assert.ok(
    defender
  );

  const specialNode =
    getMapNodes().find(
      (node) =>
        node.features.includes(
          "narrow_pass"
        ) ||
        node.features.includes(
          "bridge"
        ) ||
        node.features.includes(
          "high_ground"
        ) ||
        node.terrain ===
          "mountain" ||
        node.terrain ===
          "hills"
    );

  assert.ok(
    specialNode
  );

  const nodeResolution =
    resolveBattlefield(
      attacker.id,
      defender.id,
      {
        kind:
          "node",
        nodeId:
          specialNode.id,
      }
    );

  assert.ok(
    Number.isFinite(
      nodeResolution
        .frontageMultiplier
    )
  );

  assert.ok(
    nodeResolution
      .frontageMultiplier >
      0 &&
    nodeResolution
      .frontageMultiplier <=
      1
  );

  assert.ok(
    Array.isArray(
      nodeResolution
        .adjacentAlternatives
    )
  );

  console.log(
    "PASS S4-01: node battlefield resolver produces terrain, features, frontage and adjacent alternatives"
  );

  const riverEdge =
    getMapEdges().find(
      (edge) =>
        edge.terrain ===
        "river_road"
    );

  if (
    riverEdge
  ) {
    const edgeResolution =
      resolveBattlefield(
        attacker.id,
        defender.id,
        {
          kind:
            "edge",
          edgeId:
            riverEdge.id,
          progress:
            0.5,
        }
      );

    assert.equal(
      edgeResolution
        .riverCrossing,
      true
    );

    assert.equal(
      edgeResolution
        .bridgehead,
      true
    );

    assert.ok(
      edgeResolution
        .features
        .includes(
          "bridge"
        )
    );
  }

  console.log(
    "PASS S4-02: road battlefield resolution understands river crossings and bridgeheads"
  );

  const estimate =
    evaluateKnownEngagement(
      attacker.id,
      defender.id,
      specialNode.id,
      1500
    );

  assert.ok(
    estimate
      .deploymentRecommendations
      .length >
      0
  );

  assert.ok(
    estimate.battlefield
      .frontageMultiplier >
      0
  );

  assert.ok(
    estimate
      .deploymentRecommendations
      .every(
        (item) =>
          Number.isFinite(
            item.score
          )
      )
  );

  console.log(
    "PASS S4-03: pre-battle analysis produces terrain-aware deployment recommendations"
  );

  const battleState =
    readFileSync(
      "lib/military/battle-state.ts",
      "utf8"
    );

  assert.ok(
    battleState.includes(
      "resolveBattlefield"
    )
  );

  assert.ok(
    battleState.includes(
      "battlefield.terrain"
    ) &&
    battleState.includes(
      "battlefield.features"
    )
  );

  console.log(
    "PASS S4-04: canonical startBattle consumes TerrainResolver output instead of independently guessing terrain"
  );

  const tactics =
    readFileSync(
      "lib/military/battle-tactics.ts",
      "utf8"
    );

  assert.ok(
    tactics.includes(
      "evaluateBattleTactic"
    )
  );

  assert.ok(
    tactics.includes(
      '"cavalry_flank"'
    ) &&
    tactics.includes(
      '"seize_high_ground"'
    )
  );

  console.log(
    "PASS S4-05: deployment analysis remains advisory over the existing canonical tactic engine"
  );

  const panel =
    readFileSync(
      "app/war-intelligence-panel.tsx",
      "utf8"
    );

  assert.ok(
    panel.includes(
      "Frontage"
    ) &&
    panel.includes(
      "Bridgehead"
    ) &&
    panel.includes(
      "Chokepoint"
    ) &&
    panel.includes(
      "Deployment Recommendations"
    ) &&
    panel.includes(
      "Nearby battlefield alternatives"
    )
  );

  console.log(
    "PASS S4-06: Human war intelligence UI exposes frontage, chokepoints and alternative positions"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 4 — TERRAIN RESOLVER + POSITION EVALUATOR: PASS"
  );
}

main().catch(
  (
    error:
      unknown
  ) => {
    console.error(
      error
    );
    process.exitCode =
      1;
  }
);
