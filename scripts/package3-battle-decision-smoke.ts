import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  startBattle,
} from "../lib/military/battle-state";

import {
  submitBattleOrder,
} from "../lib/military/battle-orders";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import type {
  Army,
  UnitBlock,
} from "../types/military";

function makeArmy(
  id: string,
  ownerId: string,
  unitId: string,
  commanderId?: string
): Army {
  return {
    id,

    ownerId,

    commanderId,

    unitIds: [
      unitId,
    ],

    morale:
      "normal",

    supply: {
      foodSupply:
        1000,

      state:
        "supplied",
    },

    funding: {
      unpaidDays:
        0,

      state:
        "funded",
    },

    status:
      "field",
  };
}

//
// =====================================================
// INITIAL WORLD
// =====================================================
//

const initial =
  getRuntimeWorldState();

const playerId =
  initial.player.characterId;

const playerCharacter =
  initial.characters[
    playerId
  ];

assert.ok(
  playerCharacter,
  "Player character must exist."
);

const enemyKingdomId =
  Object.keys(
    initial.kingdoms
  ).find(
    (kingdomId) =>
      kingdomId !==
      playerCharacter.kingdomId
  );

assert.ok(
  enemyKingdomId,
  "Need at least one enemy kingdom."
);

const originalStartTime =
  initial.simulation
    .worldTimeMinutes;

//
// =====================================================
// SCENARIO A
// PLAYER PRESENT
// =====================================================
//

const playerUnit:
  UnitBlock = {
  id:
    "c2-decision-unit-player",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const enemyUnit:
  UnitBlock = {
  id:
    "c2-decision-unit-enemy",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const playerArmy =
  makeArmy(
    "c2-decision-army-player",
    playerCharacter.kingdomId,
    playerUnit.id,
    playerId
  );

const enemyArmy =
  makeArmy(
    "c2-decision-army-enemy",
    enemyKingdomId!,
    enemyUnit.id,
    "npc-enemy-commander"
  );

updateRuntimeWorldState(
  (current) => ({
    ...current,

    battles: {},

    battleResults: {},

    armyContacts: {},

    unitBlocks: {
      ...current.unitBlocks,

      [playerUnit.id]:
        playerUnit,

      [enemyUnit.id]:
        enemyUnit,
    },

    armies: {
      ...current.armies,

      [playerArmy.id]:
        playerArmy,

      [enemyArmy.id]:
        enemyArmy,
    },

    simulation: {
      ...current.simulation,

      worldTimeMinutes:
        originalStartTime,

      activeMovements: {},

      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        //
        // Player physically present.
        //
        [playerId]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [playerArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [enemyArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

const started =
  startBattle({
    attackerArmyId:
      playerArmy.id,

    defenderArmyId:
      enemyArmy.id,
  });

if (!started.ok) {
  throw new Error(
    "Player battle failed to start."
  );
}

assert.equal(
  started.ok,
  true
);

assert.equal(
  started.battle
    .currentPhase,
  "contact"
);

assert.equal(
  started.battle
    .status,
  "active"
);

console.log(
  "PASS: player-present battle started"
);

//
// Phase timings:
//
// contact       45
// deployment    75
// engagement   180
//
// crisis begins after:
//
// 45 + 75 + 180
// = 300 minutes
//

const crisisTime =
  originalStartTime +
  300;

const firstAdvance =
  advanceWorldUntil(
    originalStartTime +
    600
  );

assert.equal(
  firstAdvance.reachedTarget,
  false
);

assert.equal(
  firstAdvance.currentTime,
  crisisTime
);

assert.equal(
  firstAdvance.interrupt?.type,
  "BATTLE_DECISION"
);

console.log(
  "PASS: player-present battle interrupted at crisis"
);

let battle =
  getRuntimeWorldState()
    .battles[
      started.battle.id
    ];

assert.equal(
  battle.currentPhase,
  "crisis"
);

assert.ok(
  battle.pendingDecision
);

assert.equal(
  battle.pendingDecision
    ?.armyId,
  playerArmy.id
);

console.log(
  "PASS: pending player decision created"
);

//
// =====================================================
// WORLD MUST REMAIN BLOCKED
// =====================================================
//

const blockedAgain =
  advanceWorldUntil(
    originalStartTime +
    600
  );

assert.equal(
  blockedAgain.reachedTarget,
  false
);

assert.equal(
  blockedAgain.currentTime,
  crisisTime
);

assert.equal(
  blockedAgain.interrupt?.type,
  "BATTLE_DECISION"
);

console.log(
  "PASS: world cannot advance while decision is pending"
);

//
// =====================================================
// PLAYER SUBMITS CANONICAL ORDER
// =====================================================
//

const playerOrder =
  submitBattleOrder({
    battleId:
      started.battle.id,

    armyId:
      playerArmy.id,

    actorType:
      "player",

    actorId:
      playerId,

    order:
      "hold_position",
  });

assert.equal(
  playerOrder.ok,
  true
);

console.log(
  "PASS: player submitted canonical battle order"
);

battle =
  getRuntimeWorldState()
    .battles[
      started.battle.id
    ];

assert.equal(
  battle.pendingDecision,
  undefined
);

assert.equal(
  battle.activeOrders.length,
  1
);

assert.equal(
  battle.activeOrders[
    0
  ].actorType,
  "player"
);

assert.equal(
  battle.activeOrders[
    0
  ].type,
  "hold_position"
);

console.log(
  "PASS: player order persisted in battle state"
);

//
// =====================================================
// RESUME AFTER PLAYER ORDER
// =====================================================
//

const resumed =
  advanceWorldUntil(
    originalStartTime +
    600
  );

console.log(
  "RESUMED RESULT:",
  JSON.stringify(
    resumed,
    null,
    2
  )
);

//
// If something interrupted us,
// fail with useful information.
//
if (
  !resumed.reachedTarget
) {
  throw new Error(
    `Battle failed to resume. Interrupt: ${
      resumed.interrupt?.type ??
      "UNKNOWN"
    } / ${
      resumed.interrupt?.message ??
      "no message"
    }`
  );
}

assert.equal(
  resumed.reachedTarget,
  true
);

battle =
  getRuntimeWorldState()
    .battles[
      started.battle.id
    ];

assert.equal(
  battle.status,
  "ended"
);

assert.equal(
  battle.currentPhase,
  "ended"
);

assert.ok(
  battle.finalBattleResultId
);

console.log(
  "PASS: battle resumed after player decision"
);

console.log(
  "PASS: player battle eventually resolved"
);

//
// =====================================================
// SCENARIO B
// PLAYER ABSENT
// =====================================================
//

const worldAfterScenarioA =
  getRuntimeWorldState();

const scenarioBStart =
  worldAfterScenarioA
    .simulation
    .worldTimeMinutes +
  60;

const commanderUnit:
  UnitBlock = {
  id:
    "c2-commander-unit-a",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const commanderEnemyUnit:
  UnitBlock = {
  id:
    "c2-commander-unit-b",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const commanderArmy =
  makeArmy(
    "c2-commander-army-a",
    playerCharacter.kingdomId,
    commanderUnit.id,
    "npc-commander-a"
  );

const commanderEnemyArmy =
  makeArmy(
    "c2-commander-army-b",
    enemyKingdomId!,
    commanderEnemyUnit.id,
    "npc-commander-b"
  );

updateRuntimeWorldState(
  (current) => ({
    ...current,

    battles: {},

    battleResults: {},

    armyContacts: {},

    unitBlocks: {
      ...current.unitBlocks,

      [commanderUnit.id]:
        commanderUnit,

      [commanderEnemyUnit.id]:
        commanderEnemyUnit,
    },

    armies: {
      ...current.armies,

      [commanderArmy.id]:
        commanderArmy,

      [commanderEnemyArmy.id]:
        commanderEnemyArmy,
    },

    simulation: {
      ...current.simulation,

      worldTimeMinutes:
        scenarioBStart,

      activeMovements: {},

      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        //
        // Player deliberately absent.
        //
        [playerId]: {
          kind:
            "node",

          nodeId:
            "riverhold",
        },

        [commanderArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [commanderEnemyArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

const commanderBattle =
  startBattle({
    attackerArmyId:
      commanderArmy.id,

    defenderArmyId:
      commanderEnemyArmy.id,
  });

if (
  !commanderBattle.ok
) {
  throw new Error(
    "Commander battle failed to start."
  );
}

assert.equal(
  commanderBattle.ok,
  true
);

console.log(
  "PASS: commander battle started"
);

//
// Player is absent.
//
// Therefore reaching CRISIS must:
//
// NOT create external interrupt
// commander must decide automatically
// same submitBattleOrder() path used
//

const commanderAdvance =
  advanceWorldUntil(
    scenarioBStart +
    600
  );

console.log(
  "COMMANDER RESULT:",
  JSON.stringify(
    commanderAdvance,
    null,
    2
  )
);

if (
  !commanderAdvance.reachedTarget
) {
  throw new Error(
    `Commander battle unexpectedly interrupted: ${
      commanderAdvance
        .interrupt
        ?.type ??
      "UNKNOWN"
    } / ${
      commanderAdvance
        .interrupt
        ?.message ??
      "no message"
    }`
  );
}

assert.equal(
  commanderAdvance.reachedTarget,
  true
);

assert.equal(
  commanderAdvance.interrupt,
  undefined
);

const finishedCommanderBattle =
  getRuntimeWorldState()
    .battles[
      commanderBattle
        .battle.id
    ];

assert.equal(
  finishedCommanderBattle
    .status,
  "ended"
);

assert.equal(
  finishedCommanderBattle
    .currentPhase,
  "ended"
);

assert.equal(
  finishedCommanderBattle
    .pendingDecision,
  undefined
);

assert.equal(
  finishedCommanderBattle
    .activeOrders.length,
  1
);

assert.equal(
  finishedCommanderBattle
    .activeOrders[
      0
    ].actorType,
  "commander"
);

assert.equal(
  finishedCommanderBattle
    .activeOrders[
      0
    ].armyId,
  commanderArmy.id
);

assert.ok(
  finishedCommanderBattle
    .finalBattleResultId
);

console.log(
  "PASS: absent player caused deterministic commander order"
);

console.log(
  "PASS: commander used same canonical battle order path"
);

console.log(
  "PASS: commander battle resolved without player interrupt"
);

//
// =====================================================
// HISTORY VALIDATION
// =====================================================
//

assert.ok(
  battle.history.some(
    (entry) =>
      entry.type ===
      "decision_requested"
  )
);

assert.ok(
  battle.history.some(
    (entry) =>
      entry.type ===
      "order_issued"
  )
);

assert.ok(
  finishedCommanderBattle
    .history
    .some(
      (entry) =>
        entry.type ===
        "order_issued"
    )
);

console.log(
  "PASS: battle decision/order history recorded"
);

console.log("");

console.log(
  "============================================"
);

console.log(
  "PACKAGE 3 C2.2 BATTLE DECISION: PASS"
);

console.log(
  "============================================"
);