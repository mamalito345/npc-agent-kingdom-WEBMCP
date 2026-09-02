import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  startBattle,
} from "../lib/military/battle-state";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import type {
  Army,
  UnitBlock,
} from "../types/military";

function makeUnit(
  id: string
): UnitBlock {
  return {
    id,
    type: "infantry",
    currentSoldiers: 250,
  };
}

function makeArmy(
  id: string,
  ownerId: string,
  unitId: string,
  commanderId: string
): Army {
  return {
    id,
    ownerId,
    commanderId,

    unitIds: [
      unitId,
    ],

    morale: "normal",

    supply: {
      foodSupply: 1000,
      state: "supplied",
    },

    funding: {
      unpaidDays: 0,
      state: "funded",
    },

    status: "field",
  };
}

const initial =
  getRuntimeWorldState();

const playerId =
  initial.player.characterId;

const playerCharacter =
  initial.characters[
    playerId
  ];

assert.ok(
  playerCharacter
);

const attackerRealmId =
  playerCharacter.kingdomId;

const defenderRealmId =
  Object.keys(
    initial.kingdoms
  ).find(
    (id) =>
      id !== attackerRealmId
  );

assert.ok(
  defenderRealmId
);

//
// Start at 20:00.
//
// 10-hour battle therefore crosses
// midnight, allowing us to verify
// the daily processor runs while
// battle is active.
//
const startTime =
  20 * 60;

const attackerUnit =
  makeUnit(
    "c25-attacker-unit"
  );

const defenderUnit =
  makeUnit(
    "c25-defender-unit"
  );

const attackerArmy =
  makeArmy(
    "c25-attacker-army",
    attackerRealmId,
    attackerUnit.id,
    "c25-attacker-commander"
  );

const defenderArmy =
  makeArmy(
    "c25-defender-army",
    defenderRealmId!,
    defenderUnit.id,
    "c25-defender-commander"
  );

const markerId =
  "c25-world-marker";

const movingEntityId =
  "c25-independent-mover";

//
// =====================================================
// CLEAN FIXTURE
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    wars: {},

    battles: {},

    battleResults: {},

    armyContacts: {},

    unitBlocks: {
      ...current.unitBlocks,

      [attackerUnit.id]:
        attackerUnit,

      [defenderUnit.id]:
        defenderUnit,
    },

    armies: {
      ...current.armies,

      [attackerArmy.id]:
        attackerArmy,

      [defenderArmy.id]:
        defenderArmy,
    },

    player: {
      ...current.player,

      locationId:
        "riverhold",
    },

    simulation: {
      ...current.simulation,

      worldTimeMinutes:
        startTime,

      //
      // Player absent from battle.
      //
      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        [playerId]: {
          kind: "node",
          nodeId: "riverhold",
        },

        [attackerArmy.id]: {
          kind: "node",
          nodeId: "stoneford",
        },

        [defenderArmy.id]: {
          kind: "node",
          nodeId: "stoneford",
        },

        //
        // Independent world entity.
        //
        [movingEntityId]: {
          kind: "node",
          nodeId: "stoneford",
        },
      },

      activeMovements: {
        [movingEntityId]: {
          id:
            "c25-independent-movement",

          entityId:
            movingEntityId,

          routeNodeIds: [
            "stoneford",
            "riverhold",
          ],

          routeEdgeIds: [
            "stoneford_riverhold",
          ],

          currentEdgeIndex:
            0,

          //
          // 160 km / 16 km/h = 10h
          //
          speedKmPerHour:
            16,

          startedAt:
            startTime,

          estimatedArrivalAt:
            startTime +
            600,

          destinationNodeId:
            "riverhold",
        },
      },

      scheduledEvents: [
        {
          id:
            markerId,

          type:
            "SIMULATION_MARKER",

          executeAt:
            startTime +
            200,

          sequence:
            900001,

          causeEventIds: [],

          payload: {
            label:
              "C2.5 world continued during battle",
          },
        },
      ],

      resolvedEvents: [],
    },
  })
);

const stonefordFoodBefore =
  getRuntimeWorldState()
    .settlements
    .stoneford
    .resources
    .food;

//
// =====================================================
// START BATTLE
// =====================================================
//

const started =
  startBattle({
    attackerArmyId:
      attackerArmy.id,

    defenderArmyId:
      defenderArmy.id,
  });

assert.equal(
  started.ok,
  true
);

if (!started.ok) {
  throw new Error(
    "C2.5 battle failed to start"
  );
}

const battleId =
  started.battle.id;

assert.ok(
  started.battle.warId
);

console.log(
  "PASS: battle automatically linked to active war"
);

//
// =====================================================
// WAR EXISTS
// =====================================================
//

let world =
  getRuntimeWorldState();

const war =
  world.wars[
    started.battle.warId!
  ];

assert.ok(
  war
);

assert.equal(
  war.status,
  "active"
);

assert.ok(
  war.attackerRealmIds.includes(
    attackerRealmId
  )
);

assert.ok(
  war.defenderRealmIds.includes(
    defenderRealmId!
  )
);

assert.equal(
  Object.keys(
    world.wars
  ).length,
  1
);

console.log(
  "PASS: one canonical War created"
);

//
// =====================================================
// ADVANCE ENTIRE 10-HOUR BATTLE
// =====================================================
//

const targetTime =
  startTime +
  600;

const result =
  advanceWorldUntil(
    targetTime
  );

assert.equal(
  result.reachedTarget,
  true
);

assert.equal(
  result.interrupt,
  undefined
);

assert.equal(
  result.currentTime,
  targetTime
);

console.log(
  "PASS: full 10-hour battle advanced without player interrupt"
);

world =
  getRuntimeWorldState();

//
// =====================================================
// BATTLE ENDED
// =====================================================
//

const finishedBattle =
  world.battles[
    battleId
  ];

assert.equal(
  finishedBattle.status,
  "ended"
);

assert.equal(
  finishedBattle.currentPhase,
  "ended"
);

assert.ok(
  finishedBattle.finalBattleResultId
);

assert.equal(
  finishedBattle.warId,
  war.id
);

console.log(
  "PASS: battle ended while retaining war linkage"
);

//
// =====================================================
// WAR MUST OUTLIVE SINGLE BATTLE
// =====================================================
//

assert.equal(
  world.wars[
    war.id
  ].status,
  "active"
);

console.log(
  "PASS: war remains active after battle ends"
);

//
// =====================================================
// SCHEDULED WORLD EVENT RAN DURING BATTLE
// =====================================================
//

const resolvedMarker =
  world.simulation
    .resolvedEvents
    .find(
      (event) =>
        event.id ===
        markerId
    );

assert.ok(
  resolvedMarker,
  "Scheduled world event should resolve during battle."
);

assert.equal(
  resolvedMarker.timestamp,
  startTime +
    200
);

console.log(
  "PASS: scheduled world event resolved during battle"
);

//
// =====================================================
// INDEPENDENT MOVEMENT COMPLETED
// =====================================================
//

const moverPosition =
  world.simulation
    .entityPositions[
      movingEntityId
    ];

assert.ok(
  moverPosition
);

assert.equal(
  moverPosition.kind,
  "node"
);

if (
  moverPosition.kind ===
  "node"
) {
  assert.equal(
    moverPosition.nodeId,
    "riverhold"
  );
}

assert.equal(
  world.simulation
    .activeMovements[
      movingEntityId
    ],
  undefined
);

console.log(
  "PASS: unrelated entity movement continued and completed during battle"
);

//
// =====================================================
// MIDNIGHT DAILY BOUNDARY RAN
// =====================================================
//

const stonefordFoodAfter =
  world.settlements
    .stoneford
    .resources
    .food;

assert.ok(
  stonefordFoodAfter >
    stonefordFoodBefore,
  "Stoneford production should run at midnight while battle exists."
);

console.log(
  "PASS: daily economy boundary processed during battle"
);

//
// =====================================================
// ALL BATTLE PHASES OCCURRED
// =====================================================
//

const phaseChanges =
  finishedBattle.history
    .filter(
      (entry) =>
        entry.type ===
        "phase_changed"
    );

assert.ok(
  phaseChanges.some(
    (entry) =>
      entry.summary.includes(
        "deployment"
      )
  )
);

assert.ok(
  phaseChanges.some(
    (entry) =>
      entry.summary.includes(
        "engagement"
      )
  )
);

assert.ok(
  phaseChanges.some(
    (entry) =>
      entry.summary.includes(
        "crisis"
      )
  )
);

assert.ok(
  phaseChanges.some(
    (entry) =>
      entry.summary.includes(
        "resolution"
      )
  )
);

assert.ok(
  phaseChanges.some(
    (entry) =>
      entry.summary.includes(
        "retreat"
      )
  )
);

console.log(
  "PASS: persistent battle phases progressed normally"
);

//
// =====================================================
// SAME REALMS MUST REUSE SAME WAR
// =====================================================
//

const activeWars =
  Object.values(
    world.wars
  ).filter(
    (item) =>
      item.status ===
      "active"
  );

assert.equal(
  activeWars.length,
  1
);

console.log(
  "PASS: no duplicate war created for the encounter"
);

console.log("");

console.log(
  "==========================================="
);

console.log(
  "PACKAGE 3 C2.5 WAR + CONTINUITY: PASS"
);

console.log(
  "==========================================="
);