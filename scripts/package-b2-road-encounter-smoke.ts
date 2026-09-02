import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  createMovement,
} from "../lib/world/movement";

import {
  getNextRoadEncounterBoundary,
} from "../lib/military/road-encounters";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import {
  getDeliveredPlayerKnowledge,
} from "../lib/session/knowledge";

import {
  getMapEdges,
  getEffectiveEdgeDistance,
  getPhysicalEdgeDistance,
} from "../lib/map/graph";

import type {
  Route,
} from "../types/map";

const ARMY_A =
  "army-northreach-edwyn";

const ARMY_B =
  "army-eastvale-roderic";

const START_TIME =
  480;

const ARMY_SPEED_KM_PER_HOUR =
  5;

/*
 * IMPORTANT REGRESSION NOTE
 * -------------------------
 * B2 predates the dense-map migration.
 *
 * Old fixture:
 *   stoneford <-> riverhold
 * was one direct edge and both endpoints were valid settlement destinations.
 *
 * Phase A intentionally inserted hidden transit nodes. `moveArmy()` correctly
 * rejects a hidden transit node as a player-facing final destination, so a
 * smoke that tries to move an army directly to a transit endpoint now gets
 * DESTINATION_NOT_FOUND.
 *
 * For this B2 test we are testing the ROAD ENCOUNTER / SIMULATION layer, not
 * the player destination validator. Therefore we construct two canonical
 * ActiveMovement objects over one real dense-map edge using the same world
 * movement primitive (`createMovement`) used by the movement system.
 *
 * No production code is changed.
 */

const directTestEdge =
  getMapEdges()
    .filter(
      (edge) =>
        edge.distanceKm >
        0
    )
    .sort(
      (a, b) =>
        a.id.localeCompare(
          b.id
        )
    )[0];

if (!directTestEdge) {
  throw new Error(
    "No canonical map edge is available for the B2 road encounter smoke."
  );
}

const NODE_A =
  directTestEdge.fromNodeId;

const NODE_B =
  directTestEdge.toNodeId;

const TEST_EDGE_ID =
  directTestEdge.id;

const physicalDistanceKm =
  getPhysicalEdgeDistance(
    directTestEdge
  );

const effectiveDistanceKm =
  getEffectiveEdgeDistance(
    directTestEdge
  );

const forwardRoute:
  Route = {
  nodeIds: [
    NODE_A,
    NODE_B,
  ],

  edgeIds: [
    TEST_EDGE_ID,
  ],

  totalDistanceKm: physicalDistanceKm,

  effectiveDistanceKm,
};

const backwardRoute:
  Route = {
  nodeIds: [
    NODE_B,
    NODE_A,
  ],

  edgeIds: [
    TEST_EDGE_ID,
  ],

  totalDistanceKm: physicalDistanceKm,

  effectiveDistanceKm,
};

const movementA =
  createMovement(
    "b2-smoke-movement-a",
    ARMY_A,
    forwardRoute,
    ARMY_SPEED_KM_PER_HOUR,
    START_TIME
  );

const movementB =
  createMovement(
    "b2-smoke-movement-b",
    ARMY_B,
    backwardRoute,
    ARMY_SPEED_KM_PER_HOUR,
    START_TIME
  );

// =====================================================
// CONTROLLED WORLD SETUP
// =====================================================

updateRuntimeWorldState(
  (world) => {
    const edwynKnowledge =
      world.session
        .knowledge[
          "player-edwyn"
        ];

    if (!edwynKnowledge) {
      throw new Error(
        "player-edwyn knowledge state is missing."
      );
    }

    const armyA =
      world.armies[
        ARMY_A
      ];

    const armyB =
      world.armies[
        ARMY_B
      ];

    if (
      !armyA ||
      !armyB
    ) {
      throw new Error(
        "Required demo armies are missing."
      );
    }

    return {
      ...world,

      armyContacts: {},

      battles: {},

      battleResults: {},

      session: {
        ...world.session,

        commandCycle: {
          ...world.session
            .commandCycle,

          phase:
            "executing",

          requiredPlayerIds:
            [],

          readyPlayerIds:
            [],

          currentPlayerId:
            undefined,

          interrupt:
            undefined,
        },

        knowledge: {
          ...world.session
            .knowledge,

          "player-edwyn": {
            ...edwynKnowledge,

            facts: [],
          },
        },
      },

      armies: {
        ...world.armies,

        [ARMY_A]: {
          ...armyA,

          status:
            "field",
        },

        [ARMY_B]: {
          ...armyB,

          status:
            "field",
        },
      },

      simulation: {
        ...world.simulation,

        worldTimeMinutes:
          START_TIME,

        activeMovements: {
          [ARMY_A]:
            movementA,

          [ARMY_B]:
            movementB,
        },

        entityPositions: {
          ...world.simulation
            .entityPositions,

          [ARMY_A]: {
            kind:
              "node",

            nodeId:
              NODE_A,
          },

          [ARMY_B]: {
            kind:
              "node",

            nodeId:
              NODE_B,
          },
        },
      },
    };
  }
);

console.log(
  `PASS: controlled B2 world prepared on dense edge ${TEST_EDGE_ID}`
);

console.log(
  "PASS: opposing canonical ActiveMovements started on same dense-map edge"
);

// =====================================================
// ROAD ENCOUNTER BOUNDARY
// =====================================================

const boundary =
  getNextRoadEncounterBoundary(
    START_TIME
  );

if (
  boundary ===
  undefined
) {
  throw new Error(
    "No road encounter boundary was detected."
  );
}

assert.ok(
  boundary >
    START_TIME
);

console.log(
  `PASS: road encounter boundary detected at world minute ${boundary}`
);

// =====================================================
// ADVANCE THROUGH ENCOUNTER
// =====================================================

const advance =
  advanceWorldUntil(
    boundary +
      60
  );

assert.equal(
  advance.reachedTarget,
  false
);

if (
  !advance.interrupt
) {
  throw new Error(
    "Expected ROAD_ENCOUNTER interrupt was not produced."
  );
}

assert.equal(
  advance.interrupt.type,
  "ROAD_ENCOUNTER"
);

assert.equal(
  advance.currentTime,
  boundary
);

console.log(
  "PASS: simulation paused on road encounter"
);

// =====================================================
// EXACT ROAD POSITION
// =====================================================

const after =
  getRuntimeWorldState();

const positionA =
  after.simulation
    .entityPositions[
      ARMY_A
    ];

const positionB =
  after.simulation
    .entityPositions[
      ARMY_B
    ];

if (
  !positionA ||
  !positionB
) {
  throw new Error(
    "Encounter armies lost their canonical positions."
  );
}

if (
  positionA.kind !==
  "edge"
) {
  throw new Error(
    "Army A was teleported to a node instead of remaining on the road."
  );
}

if (
  positionB.kind !==
  "edge"
) {
  throw new Error(
    "Army B was teleported to a node instead of remaining on the road."
  );
}

assert.equal(
  positionA.edgeId,
  TEST_EDGE_ID
);

assert.equal(
  positionB.edgeId,
  TEST_EDGE_ID
);

assert.ok(
  Math.abs(
    positionA.progress -
      positionB.progress
  ) <
    0.00001
);

assert.ok(
  positionA.progress >
    0
);

assert.ok(
  positionA.progress <
    1
);

console.log(
  `PASS: armies met at exact road progress ${(positionA.progress * 100).toFixed(2)}%`
);

// =====================================================
// PHYSICAL MOVEMENT STOP
// =====================================================

assert.equal(
  after.simulation
    .activeMovements[
      ARMY_A
    ],
  undefined
);

assert.equal(
  after.simulation
    .activeMovements[
      ARMY_B
    ],
  undefined
);

console.log(
  "PASS: movements stopped without node teleport"
);

// =====================================================
// PERSISTENT BATTLE
// =====================================================

const activeBattle =
  Object.values(
    after.battles
  ).find(
    (battle) => {
      if (
        battle.status !==
        "active"
      ) {
        return false;
      }

      const containsArmyA =
        battle
          .attackerArmyIds
          .includes(
            ARMY_A
          ) ||
        battle
          .defenderArmyIds
          .includes(
            ARMY_A
          );

      const containsArmyB =
        battle
          .attackerArmyIds
          .includes(
            ARMY_B
          ) ||
        battle
          .defenderArmyIds
          .includes(
            ARMY_B
          );

      return (
        containsArmyA &&
        containsArmyB
      );
    }
  );

if (!activeBattle) {
  throw new Error(
    "Road encounter did not create a persistent battle."
  );
}

assert.equal(
  after.armies[
    ARMY_A
  ]?.status,
  "battle"
);

assert.equal(
  after.armies[
    ARMY_B
  ]?.status,
  "battle"
);

console.log(
  `PASS: persistent road battle created (${activeBattle.id})`
);

// =====================================================
// PLAYER-SCOPED COMMAND INTERRUPT
// =====================================================

assert.ok(
  advance
    .interrupt
    .affectedPlayerIds
    ?.includes(
      "player-edwyn"
    )
);

assert.equal(
  after.session
    .commandCycle
    .phase,
  "interrupted"
);

assert.equal(
  after.session
    .commandCycle
    .currentPlayerId,
  "player-edwyn"
);

console.log(
  "PASS: affected player command window opened"
);

// =====================================================
// DIRECT OBSERVATION KNOWLEDGE
// =====================================================

const knowledge =
  getDeliveredPlayerKnowledge(
    "player-edwyn"
  );

const enemyFact =
  knowledge.find(
    (fact) =>
      fact.subjectId ===
        ARMY_B &&
      fact.source ===
        "direct_observation"
  );

if (!enemyFact) {
  throw new Error(
    "Road encounter was not written into player knowledge."
  );
}

assert.equal(
  enemyFact.confidence,
  "confirmed"
);

assert.equal(
  enemyFact.data.edgeId,
  TEST_EDGE_ID
);

console.log(
  "PASS: enemy encounter entered player knowledge immediately"
);

console.log("");
console.log(
  "B2 ROAD ENCOUNTER + SESSION INTERRUPT INTEGRATION: PASS"
);
