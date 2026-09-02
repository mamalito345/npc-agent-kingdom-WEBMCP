import assert from "node:assert/strict";

import {
  getActiveGameMap,
} from "../lib/map/map-registry";

import {
  getBorderEdges,
  getTransitMapNodes,
  getVisibleMapNodes,
} from "../lib/map/graph";

import {
  findRoute,
} from "../lib/map/paths";

import {
  getRouteBorderCrossings,
} from "../lib/map/borders";

async function main(): Promise<void> {
  const map =
    getActiveGameMap();

  const nodes =
    Object.values(
      map.nodes
    );

  const edges =
    Object.values(
      map.edges
    );

  const transit =
    getTransitMapNodes();

  const visible =
    getVisibleMapNodes();

  assert.ok(
    nodes.length >= 100,
    `Expected >=100 dense nodes, got ${nodes.length}`
  );

  assert.ok(
    transit.length >= 70,
    `Expected >=70 transit nodes, got ${transit.length}`
  );

  assert.equal(
    visible.length,
    21,
    "Normal UI must still expose only the 21 settlement nodes."
  );

  assert.ok(
    edges.length >= 100,
    `Expected >=100 dense edges, got ${edges.length}`
  );

  assert.ok(
    getBorderEdges().length >= 6,
    "Expected multiple explicit physical border edges."
  );

  const northreachRoute =
    findRoute(
      "stoneford",
      "riverhold"
    );

  assert.ok(
    northreachRoute,
    "Stoneford -> Riverhold route missing."
  );

  assert.ok(
    northreachRoute.nodeIds.length >
      2,
    "Route must physically traverse hidden transit nodes."
  );

  const internationalRoute =
    findRoute(
      "highcrest",
      "eastkeep"
    );

  assert.ok(
    internationalRoute,
    "Highcrest -> Eastkeep route missing."
  );

  const crossings =
    getRouteBorderCrossings(
      internationalRoute.edgeIds
    );

  assert.ok(
    crossings.length >= 1,
    "Cross-realm route must contain explicit border metadata."
  );

  assert.ok(
    crossings.some(
      (crossing) =>
        (
          crossing.fromKingdomId ===
            "northreach" &&
          crossing.toKingdomId ===
            "eastvale"
        ) ||
        (
          crossing.fromKingdomId ===
            "eastvale" &&
          crossing.toKingdomId ===
            "northreach"
        )
    ),
    "Northreach/Eastvale physical crossing metadata missing."
  );

  assert.ok(
    transit.every(
      (node) =>
        node.hidden === true
    ),
    "Every transit node must remain hidden from normal UI."
  );

  console.log(
    `PASS dense graph: ${nodes.length} nodes / ${edges.length} edges`
  );
  console.log(
    `PASS hidden transit: ${transit.length}`
  );
  console.log(
    `PASS visible settlements: ${visible.length}`
  );
  console.log(
    `PASS border edges: ${getBorderEdges().length}`
  );
  console.log(
    "PASS route physicality and border metadata"
  );
  console.log("");
  console.log(
    "FINAL GAME UX PHASE A — DENSE STRATEGIC GRAPH: PASS"
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
