import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  moveArmy,
} from "../lib/military/army-movement";

import {
  getNextRoadEncounterBoundary,
} from "../lib/military/road-encounters";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import {
  getDeliveredPlayerKnowledge,
} from "../lib/session/knowledge";

const ARMY_A =
  "army-northreach-edwyn";

const ARMY_B =
  "army-eastvale-roderic";

//
// =====================================================
// CONTROLLED WORLD SETUP
// =====================================================
//

updateRuntimeWorldState(
  (world) => {
    const edwynKnowledge =
      world.session
        .knowledge[
          "player-edwyn"
        ];

    if (
      !edwynKnowledge
    ) {
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

      armyContacts:
        {},

      battles:
        {},

      battleResults:
        {},

      session: {
        ...world.session,

        commandCycle: {
          ...world
            .session
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
          ...world
            .session
            .knowledge,

          "player-edwyn": {
            ...edwynKnowledge,

            facts:
              [],
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
          480,

        activeMovements:
          {},

        entityPositions: {
          ...world
            .simulation
            .entityPositions,

          [ARMY_A]: {
            kind:
              "node",

            nodeId:
              "stoneford",
          },

          [ARMY_B]: {
            kind:
              "node",

            nodeId:
              "riverhold",
          },
        },
      },
    };
  }
);

console.log(
  "PASS: controlled B2 world prepared"
);

//
// =====================================================
// START OPPOSING MOVEMENTS
// =====================================================
//

const moveA =
  moveArmy(
    ARMY_A,
    "riverhold"
  );

if (
  !moveA.ok
) {
  throw new Error(
    `Army A movement failed: ${moveA.error}`
  );
}

const moveB =
  moveArmy(
    ARMY_B,
    "stoneford"
  );

if (
  !moveB.ok
) {
  throw new Error(
    `Army B movement failed: ${moveB.error}`
  );
}

assert.ok(
  moveA.movementId
);

assert.ok(
  moveB.movementId
);

console.log(
  "PASS: opposing road movements started"
);

//
// =====================================================
// ROAD ENCOUNTER BOUNDARY
// =====================================================
//

const boundary =
  getNextRoadEncounterBoundary(
    480
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
    480
);

console.log(
  `PASS: road encounter boundary detected at world minute ${boundary}`
);

//
// =====================================================
// ADVANCE THROUGH ENCOUNTER
// =====================================================
//

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

//
// =====================================================
// EXACT ROAD POSITION
// =====================================================
//

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
  "stoneford_riverhold"
);

assert.equal(
  positionB.edgeId,
  "stoneford_riverhold"
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

//
// =====================================================
// PHYSICAL MOVEMENT STOP
// =====================================================
//

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

//
// =====================================================
// PERSISTENT BATTLE
// =====================================================
//

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

if (
  !activeBattle
) {
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

//
// =====================================================
// PLAYER-SCOPED COMMAND INTERRUPT
// =====================================================
//

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

//
// =====================================================
// DIRECT OBSERVATION KNOWLEDGE
// =====================================================
//

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

if (
  !enemyFact
) {
  throw new Error(
    "Road encounter was not written into player knowledge."
  );
}

assert.equal(
  enemyFact.confidence,
  "confirmed"
);

console.log(
  "PASS: enemy encounter entered player knowledge immediately"
);

console.log(
  ""
);

console.log(
  "B2 ROAD ENCOUNTER + SESSION INTERRUPT INTEGRATION: PASS"
);