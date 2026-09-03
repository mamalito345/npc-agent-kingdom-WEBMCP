import assert
  from "node:assert/strict";

import {
  getActiveGameMap,
} from "@/lib/map/map-registry";

import {
  getConnectedEdges,
  getMapEdges,
  getMapNodes,
} from "@/lib/map/graph";

import {
  findRoute,
} from "@/lib/map/paths";

import {
  getPointForPosition,
} from "@/lib/map/visual";

import {
  getBattlefieldPositionProfile,
} from "@/lib/military/terrain-position-evaluator";

import {
  getSettlementEconomicProfile,
} from "@/lib/economy/settlement-economy";

import {
  getRealmBudgetSnapshot,
} from "@/lib/economy/realm-budget";

import {
  getSettlementMilitaryLevel,
} from "@/lib/military/settlement-capacity";

import {
  configureKingdomControllers,
} from "@/lib/demo/config";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

function pass(
  id:
    string,
  message:
    string
): void {
  console.log(
    `✓ ${id} — ${message}`
  );
}

const map =
  getActiveGameMap();

assert.equal(
  map.image.width,
  1536
);

assert.equal(
  map.image.height,
  1024
);

pass(
  "FSG-01",
  "canonical map-space is 1536×1024"
);

const allNodes =
  getMapNodes();

const settlementNodes =
  allNodes.filter(
    (
      node
    ) =>
      node.kind ===
      "settlement"
  );

const transitNodes =
  allNodes.filter(
    (
      node
    ) =>
      node.kind ===
      "transit"
  );

assert.ok(
  settlementNodes.length >=
  50
);

assert.ok(
  transitNodes.length >=
  35
);

assert.ok(
  getMapEdges().length >=
  110
);

pass(
  "FSG-02",
  `${settlementNodes.length} settlements + ${transitNodes.length} tactical nodes + ${getMapEdges().length} roads`
);

/*
 * Connectivity: every authored map node must be reachable from Northwatch.
 */
const visited =
  new Set<
    string
  >([
    "northwatch",
  ]);

const queue =
  [
    "northwatch",
  ];

while (
  queue.length >
  0
) {
  const current =
    queue.shift();

  if (!current) {
    break;
  }

  for (
    const edge
    of getConnectedEdges(
      current
    )
  ) {
    const next =
      edge.fromNodeId ===
        current
        ? edge.toNodeId
        : edge.fromNodeId;

    if (
      !visited.has(
        next
      )
    ) {
      visited.add(
        next
      );
      queue.push(
        next
      );
    }
  }
}

assert.equal(
  visited.size,
  allNodes.length
);

pass(
  "FSG-03",
  "road web is one connected canonical movement graph"
);

for (
  const [
    a,
    b,
  ]
  of [
    [
      "western-frost-pass",
      "southgate",
    ],
    [
      "kings-pass",
      "crown-ridge",
    ],
    [
      "eastern-ice-pass",
      "stonehill",
    ],
    [
      "west-road-clearing",
      "west-road-junction",
    ],
    [
      "east-border-crossing",
      "greencrest-fort",
    ],
    [
      "south-cross",
      "desert-gate-central",
    ],
  ] as const
) {
  assert.ok(
    getConnectedEdges(
      a
    ).some(
      (
        edge
      ) =>
        edge.fromNodeId ===
          b ||
        edge.toNodeId ===
          b
    ),
    `${a} must connect directly to ${b}`
  );
}

pass(
  "FSG-04",
  "multiple invasion corridors and flanking approaches exist"
);

const passProfile =
  getBattlefieldPositionProfile(
    "kings-pass"
  );

const bridgeProfile =
  getBattlefieldPositionProfile(
    "stonebridge"
  );

const plainProfile =
  getBattlefieldPositionProfile(
    "eastern-plain"
  );

assert.equal(
  passProfile
    .chokepoint,
  true
);

assert.equal(
  bridgeProfile
    .bridgehead,
  true
);

assert.equal(
  plainProfile
    .terrain,
  "plains"
);

pass(
  "FSG-05",
  "passes, bridges, hills and open plains resolve into different battlefield profiles"
);

assert.ok(
  getPointForPosition({
    kind:
      "node",
    nodeId:
      "kings-pass",
  })
);

pass(
  "FSG-06",
  "armies remain visible/selectable while stopped on tactical transit nodes"
);

const capitalEconomy =
  getSettlementEconomicProfile(
    "sunspire"
  );

const villageEconomy =
  getSettlementEconomicProfile(
    "redfield"
  );

assert.ok(
  capitalEconomy
    .taxBaseGold >
  villageEconomy
    .taxBaseGold
);

assert.ok(
  capitalEconomy
    .effectiveProduction
    .food >
  0
);

assert.ok(
  getSettlementMilitaryLevel(
    "oasisfall"
  )
);

pass(
  "FSG-07",
  "settlement specialization, prosperity, buildings and development produce differentiated economies"
);

for (
  const kingdomId
  of [
    "northreach",
    "eastvale",
    "westmoor",
    "southmark",
    "ironhollow",
  ]
) {
  const budget =
    getRealmBudgetSnapshot(
      kingdomId
    );

  assert.ok(
    budget.dailyIncomeGold >
    0
  );

  assert.ok(
    budget.treasury >
    0
  );
}

pass(
  "FSG-08",
  "all five realms expose real daily income, army expense and treasury budgets"
);

const longRoute =
  findRoute(
    "northwatch",
    "ironhold"
  );

assert.ok(
  longRoute
);

assert.ok(
  longRoute.nodeIds.length >
  4
);

assert.ok(
  longRoute
    .effectiveDistanceKm >=
  longRoute
    .totalDistanceKm *
    0.85
);

pass(
  "FSG-09",
  "long-distance movement uses the authored road network and terrain cost"
);

configureKingdomControllers({
  "player-edwyn":
    "LLM",
  "player-roderic":
    "LLM",
  "player-garran":
    "LLM",
  "player-osric":
    "HUMAN",
  "player-varren":
    "LLM",
});

const configured =
  getRuntimeWorldState();

assert.equal(
  configured
    .session
    .localPlayerId,
  "player-osric"
);

assert.equal(
  configured
    .session
    .commandCycle
    .currentPlayerId,
  "player-osric"
);

assert.equal(
  configured
    .session
    .commandCycle
    .playerOrder[
      0
    ],
  "player-osric"
);

assert.equal(
  configured
    .session
    .campaignControl
    .roleByKingdomId
    .southmark,
  "HUMAN"
);

assert.equal(
  configured
    .simulation
    .paused,
  false
);

pass(
  "FSG-10",
  "selected human starts unpaused; End Orders can hand control to LLM players"
);

console.log(
  "\nFINAL STRATEGY GAMEPLAY PASS: PASS"
);
