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

function assertTwoSidedOrders(
  battleId: string
): void {
  const battle =
    getRuntimeWorldState()
      .battles[
        battleId
      ];

  assert.ok(
    battle
  );

  assert.equal(
    battle.activeOrders.length,
    2
  );

  const attackerOrder =
    battle.activeOrders.find(
      (order) =>
        battle.attackerArmyIds
          .includes(
            order.armyId
          )
    );

  const defenderOrder =
    battle.activeOrders.find(
      (order) =>
        battle.defenderArmyIds
          .includes(
            order.armyId
          )
    );

  assert.ok(
    attackerOrder,
    "Attacker side must have an order."
  );

  assert.ok(
    defenderOrder,
    "Defender side must have an order."
  );
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

const playerBattleStart =
  startBattle({
    attackerArmyId:
      playerArmy.id,

    defenderArmyId:
      enemyArmy.id,
  });

assert.equal(
  playerBattleStart.ok,
  true
);

if (
  !playerBattleStart.ok
) {
  throw new Error(
    "Player battle failed to start."
  );
}

console.log(
  "PASS: player-present battle started"
);

assert.equal(
  playerBattleStart
    .battle
    .currentPhase,
  "contact"
);

assert.equal(
  playerBattleStart
    .battle
    .status,
  "active"
);

//
// =====================================================
// ADVANCE TO CRISIS
// =====================================================
//
// contact      45
// deployment   75
// engagement  180
//
// crisis starts at +300
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

let playerBattle =
  getRuntimeWorldState()
    .battles[
      playerBattleStart
        .battle.id
    ];

assert.ok(
  playerBattle
);

assert.equal(
  playerBattle.currentPhase,
  "crisis"
);

assert.ok(
  playerBattle.pendingDecision
);

assert.equal(
  playerBattle
    .pendingDecision
    ?.armyId,
  playerArmy.id
);

console.log(
  "PASS: pending player decision created"
);

//
// =====================================================
// ENEMY COMMANDER MUST ALREADY HAVE DECIDED
// =====================================================
//

const enemyCommanderOrderBeforePlayer =
  playerBattle.activeOrders.find(
    (order) =>
      order.actorType ===
        "commander" &&
      order.armyId ===
        enemyArmy.id
  );

assert.ok(
  enemyCommanderOrderBeforePlayer
);

console.log(
  "PASS: opposing commander decided before player interrupt"
);

//
// =====================================================
// WORLD BLOCKED WHILE PLAYER DECISION PENDING
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
      playerBattleStart
        .battle.id,

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

playerBattle =
  getRuntimeWorldState()
    .battles[
      playerBattleStart
        .battle.id
    ];

assert.equal(
  playerBattle.pendingDecision,
  undefined
);

assertTwoSidedOrders(
  playerBattle.id
);

const persistedPlayerOrder =
  playerBattle.activeOrders.find(
    (order) =>
      order.actorType ===
        "player" &&
      order.armyId ===
        playerArmy.id
  );

assert.ok(
  persistedPlayerOrder
);

assert.equal(
  persistedPlayerOrder.type,
  "hold_position"
);

const persistedEnemyCommanderOrder =
  playerBattle.activeOrders.find(
    (order) =>
      order.actorType ===
        "commander" &&
      order.armyId ===
        enemyArmy.id
  );

assert.ok(
  persistedEnemyCommanderOrder
);

console.log(
  "PASS: player and opposing commander orders persisted"
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

playerBattle =
  getRuntimeWorldState()
    .battles[
      playerBattleStart
        .battle.id
    ];

assert.equal(
  playerBattle.status,
  "ended"
);

assert.equal(
  playerBattle.currentPhase,
  "ended"
);

assert.ok(
  playerBattle.finalBattleResultId
);

assertTwoSidedOrders(
  playerBattle.id
);

console.log(
  "PASS: player battle resumed and resolved"
);

//
// =====================================================
// PLAYER BATTLE HISTORY
// =====================================================
//

assert.ok(
  playerBattle.history.some(
    (entry) =>
      entry.type ===
      "decision_requested"
  )
);

assert.ok(
  playerBattle.history.some(
    (entry) =>
      entry.type ===
      "order_issued"
  )
);

assert.ok(
  playerBattle.history.some(
    (entry) =>
      entry.type ===
      "battle_ended"
  )
);

console.log(
  "PASS: player battle history recorded"
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

const commanderUnitA:
  UnitBlock = {
  id:
    "c2-commander-unit-a",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const commanderUnitB:
  UnitBlock = {
  id:
    "c2-commander-unit-b",

  type:
    "infantry",

  currentSoldiers:
    250,
};

const commanderArmyA =
  makeArmy(
    "c2-commander-army-a",
    playerCharacter.kingdomId,
    commanderUnitA.id,
    "npc-commander-a"
  );

const commanderArmyB =
  makeArmy(
    "c2-commander-army-b",
    enemyKingdomId!,
    commanderUnitB.id,
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

      [commanderUnitA.id]:
        commanderUnitA,

      [commanderUnitB.id]:
        commanderUnitB,
    },

    armies: {
      ...current.armies,

      [commanderArmyA.id]:
        commanderArmyA,

      [commanderArmyB.id]:
        commanderArmyB,
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
        // Player physically absent.
        //
        [playerId]: {
          kind:
            "node",

          nodeId:
            "riverhold",
        },

        [commanderArmyA.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },

        [commanderArmyB.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

const commanderBattleStart =
  startBattle({
    attackerArmyId:
      commanderArmyA.id,

    defenderArmyId:
      commanderArmyB.id,
  });

assert.equal(
  commanderBattleStart.ok,
  true
);

if (
  !commanderBattleStart.ok
) {
  throw new Error(
    "Commander battle failed to start."
  );
}

console.log(
  "PASS: commander battle started"
);

//
// =====================================================
// ABSENT PLAYER → BOTH COMMANDERS AUTO-DECIDE
// =====================================================
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

const commanderBattle =
  getRuntimeWorldState()
    .battles[
      commanderBattleStart
        .battle.id
    ];

assert.ok(
  commanderBattle
);

assert.equal(
  commanderBattle.status,
  "ended"
);

assert.equal(
  commanderBattle.currentPhase,
  "ended"
);

assert.equal(
  commanderBattle.pendingDecision,
  undefined
);

assertTwoSidedOrders(
  commanderBattle.id
);

const commanderOrders =
  commanderBattle
    .activeOrders
    .filter(
      (order) =>
        order.actorType ===
        "commander"
    );

assert.equal(
  commanderOrders.length,
  2
);

const attackerCommanderOrder =
  commanderOrders.find(
    (order) =>
      commanderBattle
        .attackerArmyIds
        .includes(
          order.armyId
        )
  );

const defenderCommanderOrder =
  commanderOrders.find(
    (order) =>
      commanderBattle
        .defenderArmyIds
        .includes(
          order.armyId
        )
  );

assert.ok(
  attackerCommanderOrder
);

assert.ok(
  defenderCommanderOrder
);

assert.ok(
  commanderBattle
    .finalBattleResultId
);

console.log(
  "PASS: both sides received deterministic commander orders"
);

console.log(
  "PASS: commanders used same canonical battle order path"
);

console.log(
  "PASS: commander battle resolved without player interrupt"
);

//
// =====================================================
// COMMANDER HISTORY VALIDATION
// =====================================================
//

const commanderOrderHistory =
  commanderBattle
    .history
    .filter(
      (entry) =>
        entry.type ===
        "order_issued"
    );

assert.equal(
  commanderOrderHistory.length,
  2
);

assert.ok(
  commanderBattle.history.some(
    (entry) =>
      entry.type ===
      "battle_ended"
  )
);

console.log(
  "PASS: commander decision/order history recorded"
);

//
// =====================================================
// FINAL
// =====================================================
//

console.log("");

console.log(
  "============================================"
);

console.log(
  "PACKAGE 3 C2.2/C2.3 BATTLE DECISION: PASS"
);

console.log(
  "============================================"
);