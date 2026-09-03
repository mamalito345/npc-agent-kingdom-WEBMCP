import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  startBattle,
} from "../lib/military/battle-state";

import {
  detectArmyContacts,
} from "../lib/military/contact";

import {
  getArmySoldierCount,
} from "../lib/military/army-queries";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import type {
  Army,
  UnitBlock,
} from "../types/military";

//
// =====================================================
// HELPERS
// =====================================================
//

function makeUnit(
  id: string,
  soldiers = 250
): UnitBlock {
  return {
    id,
    type: "infantry",
    currentSoldiers: soldiers,
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

function getSoldiers(
  armyId: string
): number {
  return getArmySoldierCount(
    armyId
  );
}

function assertAllParticipating(
  armyIds: string[]
): void {
  const world =
    getRuntimeWorldState();

  for (
    const armyId
    of armyIds
  ) {
    assert.equal(
      world.armies[
        armyId
      ].status,
      "battle",
      `${armyId} should be in battle`
    );
  }
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

const attackerRealmId =
  playerCharacter.kingdomId;

const defenderRealmId =
  Object.keys(
    initial.kingdoms
  ).find(
    (kingdomId) =>
      kingdomId !==
      attackerRealmId
  );

assert.ok(
  defenderRealmId,
  "Need an enemy kingdom."
);

const startTime =
  initial.simulation
    .worldTimeMinutes;

//
// =====================================================
// CREATE FIVE UNIT BLOCKS
// =====================================================
//

const unitA1 =
  makeUnit(
    "c24-unit-a1"
  );

const unitA2 =
  makeUnit(
    "c24-unit-a2"
  );

const unitB1 =
  makeUnit(
    "c24-unit-b1"
  );

const unitB2 =
  makeUnit(
    "c24-unit-b2"
  );

const unitB3 =
  makeUnit(
    "c24-unit-b3"
  );

//
// =====================================================
// CREATE FIVE ARMIES
// =====================================================
//

const armyA1 =
  makeArmy(
    "c24-army-a1",
    attackerRealmId,
    unitA1.id,
    "c24-commander-a1"
  );

const armyA2 =
  makeArmy(
    "c24-army-a2",
    attackerRealmId,
    unitA2.id,
    "c24-commander-a2"
  );

const armyB1 =
  makeArmy(
    "c24-army-b1",
    defenderRealmId!,
    unitB1.id,
    "c24-commander-b1"
  );

const armyB2 =
  makeArmy(
    "c24-army-b2",
    defenderRealmId!,
    unitB2.id,
    "c24-commander-b2"
  );

const armyB3 =
  makeArmy(
    "c24-army-b3",
    defenderRealmId!,
    unitB3.id,
    "c24-commander-b3"
  );

const allArmyIds = [
  armyA1.id,
  armyA2.id,
  armyB1.id,
  armyB2.id,
  armyB3.id,
];

//
// =====================================================
// PREPARE CLEAN TEST WORLD
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    battles: {},

    battleResults: {},

    armyContacts: {},

    unitBlocks: {
      ...current.unitBlocks,

      [unitA1.id]:
        unitA1,

      [unitA2.id]:
        unitA2,

      [unitB1.id]:
        unitB1,

      [unitB2.id]:
        unitB2,

      [unitB3.id]:
        unitB3,
    },

    armies: {
      ...current.armies,

      [armyA1.id]:
        armyA1,

      [armyA2.id]:
        armyA2,

      [armyB1.id]:
        armyB1,

      [armyB2.id]:
        armyB2,

      [armyB3.id]:
        armyB3,
    },

    simulation: {
      ...current.simulation,

      worldTimeMinutes:
        startTime,

      activeMovements: {},

      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        //
        // Player deliberately absent.
        //
        [playerId]: {
          kind: "node",
          nodeId: "riverhold",
        },

        //
        // Initial combatants.
        //
        [armyA1.id]: {
          kind: "node",
          nodeId: "stoneford",
        },

        [armyB1.id]: {
          kind: "node",
          nodeId: "stoneford",
        },

        //
        // Reinforcements start away
        // from the battlefield.
        //
        [armyA2.id]: {
          kind: "node",
          nodeId: "riverhold",
        },

        [armyB2.id]: {
          kind: "node",
          nodeId: "riverhold",
        },

        [armyB3.id]: {
          kind: "node",
          nodeId: "riverhold",
        },
      },
    },
  })
);

//
// =====================================================
// START INITIAL A1 VS B1 BATTLE
// =====================================================
//

const started =
  startBattle({
    attackerArmyId:
      armyA1.id,

    defenderArmyId:
      armyB1.id,
  });

assert.equal(
  started.ok,
  true
);

if (!started.ok) {
  throw new Error(
    "C2.4 battle could not start."
  );
}

const battleId =
  started.battle.id;

console.log(
  "PASS: initial A1 vs B1 battle started"
);

//
// =====================================================
// REINFORCEMENTS ARRIVE
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    simulation: {
      ...current.simulation,

      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        [armyA2.id]: {
          kind: "node",
          nodeId: "stoneford",
        },

        [armyB2.id]: {
          kind: "node",
          nodeId: "stoneford",
        },

        [armyB3.id]: {
          kind: "node",
          nodeId: "stoneford",
        },
      },
    },
  })
);

detectArmyContacts();

let battle =
  getRuntimeWorldState()
    .battles[
      battleId
    ];

assert.equal(
  battle.attackerArmyIds.length,
  2
);

assert.equal(
  battle.defenderArmyIds.length,
  3
);

assert.ok(
  battle.attackerArmyIds.includes(
    armyA2.id
  )
);

assert.ok(
  battle.defenderArmyIds.includes(
    armyB2.id
  )
);

assert.ok(
  battle.defenderArmyIds.includes(
    armyB3.id
  )
);

assertAllParticipating(
  allArmyIds
);

console.log(
  "PASS: battle expanded to A1+A2 vs B1+B2+B3"
);

//
// =====================================================
// RECORD ORIGINAL SOLDIER COUNTS
// =====================================================
//

const initialSoldiers =
  Object.fromEntries(
    allArmyIds.map(
      (armyId) => [
        armyId,
        getSoldiers(
          armyId
        ),
      ]
    )
  );

for (
  const armyId
  of allArmyIds
) {
  assert.equal(
    initialSoldiers[
      armyId
    ],
    250
  );
}

console.log(
  "PASS: all armies begin with 250 soldiers"
);

//
// =====================================================
// ENGAGEMENT
//
// Timeline:
//
// contact      +45
// deployment   +120
// engagement   starts at +120
//
// First progressive casualty pulse
// must happen here.
// =====================================================
//

const engagementTime =
  startTime +
  120;

const engagementAdvance =
  advanceWorldUntil(
    engagementTime
  );

assert.equal(
  engagementAdvance.reachedTarget,
  true
);

battle =
  getRuntimeWorldState()
    .battles[
      battleId
    ];

assert.equal(
  battle.currentPhase,
  "engagement"
);

const afterEngagement =
  Object.fromEntries(
    allArmyIds.map(
      (armyId) => [
        armyId,
        getSoldiers(
          armyId
        ),
      ]
    )
  );

for (
  const armyId
  of allArmyIds
) {
  assert.ok(
    afterEngagement[
      armyId
    ] <
      initialSoldiers[
        armyId
      ],
    `${armyId} must suffer engagement casualties`
  );
}

assert.ok(
  battle.history.some(
    (entry) =>
      entry.summary.includes(
        "Progressive casualties applied during engagement."
      )
  )
);

console.log(
  "PASS: engagement applied casualties to all five armies"
);

//
// =====================================================
// CRISIS
//
// crisis starts at +300.
//
// Player absent:
//
// attacker commander decides
// defender commander decides
//
// Another casualty pulse must occur.
// =====================================================
//

const crisisTime =
  startTime +
  300;

const crisisAdvance =
  advanceWorldUntil(
    crisisTime
  );

assert.equal(
  crisisAdvance.reachedTarget,
  true
);

assert.equal(
  crisisAdvance.interrupt,
  undefined
);

battle =
  getRuntimeWorldState()
    .battles[
      battleId
    ];

assert.equal(
  battle.currentPhase,
  "crisis"
);

assert.equal(
  battle.activeOrders.length,
  2
);

const afterCrisis =
  Object.fromEntries(
    allArmyIds.map(
      (armyId) => [
        armyId,
        getSoldiers(
          armyId
        ),
      ]
    )
  );

for (
  const armyId
  of allArmyIds
) {
  assert.ok(
    afterCrisis[
      armyId
    ] <
      afterEngagement[
        armyId
      ],
    `${armyId} must suffer additional crisis casualties`
  );
}

assert.ok(
  battle.history.some(
    (entry) =>
      entry.summary.includes(
        "Progressive casualties applied during crisis."
      )
  )
);

console.log(
  "PASS: crisis applied second casualty pulse"
);

console.log(
  "PASS: both sides issued battle orders"
);

//
// =====================================================
// RESOLUTION
//
// resolution starts at +450.
//
// Third casualty pulse must occur.
// =====================================================
//

const resolutionTime =
  startTime +
  450;

const resolutionAdvance =
  advanceWorldUntil(
    resolutionTime
  );

assert.equal(
  resolutionAdvance.reachedTarget,
  true
);

battle =
  getRuntimeWorldState()
    .battles[
      battleId
    ];

assert.equal(
  battle.currentPhase,
  "resolution"
);

const afterResolution =
  Object.fromEntries(
    allArmyIds.map(
      (armyId) => [
        armyId,
        getSoldiers(
          armyId
        ),
      ]
    )
  );

for (
  const armyId
  of allArmyIds
) {
  assert.ok(
    afterResolution[
      armyId
    ] <
      afterCrisis[
        armyId
      ],
    `${armyId} must suffer additional resolution casualties`
  );
}

assert.ok(
  battle.history.some(
    (entry) =>
      entry.summary.includes(
        "Progressive casualties applied during resolution."
      )
  )
);

assert.ok(
  battle.history.some(
    (entry) =>
      entry.summary.includes(
        "Operational battle power calculated."
      )
  )
);

console.log(
  "PASS: resolution applied third casualty pulse"
);

console.log(
  "PASS: multi-army resolution power snapshot recorded"
);

//
// =====================================================
// ENSURE CASUALTIES ARE NOT ONLY ON LEAD ARMIES
// =====================================================
//

assert.ok(
  getSoldiers(
    armyA2.id
  ) <
    250
);

assert.ok(
  getSoldiers(
    armyB2.id
  ) <
    250
);

assert.ok(
  getSoldiers(
    armyB3.id
  ) <
    250
);

console.log(
  "PASS: reinforcement armies receive real casualties"
);

//
// =====================================================
// RETREAT PHASE
//
// retreat starts at +540.
//
// Final side outcome is decided here.
// =====================================================
//

const retreatTime =
  startTime +
  540;

const retreatAdvance =
  advanceWorldUntil(
    retreatTime
  );

assert.equal(
  retreatAdvance.reachedTarget,
  true
);

battle =
  getRuntimeWorldState()
    .battles[
      battleId
    ];

assert.equal(
  battle.currentPhase,
  "retreat"
);

assert.ok(
  battle.finalBattleResultId,
  "Battle must have canonical result before ending."
);

const worldAtRetreat =
  getRuntimeWorldState();

const finalResult =
  worldAtRetreat
    .battleResults[
      battle.finalBattleResultId!
    ];

assert.ok(
  finalResult,
  "finalBattleResultId must point to a real BattleResult."
);

console.log(
  "FINAL RESULT:",
  JSON.stringify(
    {
      id:
        finalResult.id,

      band:
        finalResult.band,

      winnerArmyId:
        finalResult
          .winnerArmyId,

      loserArmyId:
        finalResult
          .loserArmyId,

      attackerPower:
        finalResult
          .attacker
          .totalPower,

      defenderPower:
        finalResult
          .defender
          .totalPower,
    },
    null,
    2
  )
);

//
// =====================================================
// DETERMINE WINNING / LOSING SIDE
// FROM CANONICAL RESULT
// =====================================================
//

assert.notEqual(
  finalResult.band,
  "stalemate",
  "2 vs 3 equal-strength armies should not produce stalemate in this fixture."
);

assert.ok(
  finalResult.winnerArmyId
);

assert.ok(
  finalResult.loserArmyId
);

const attackerWon =
  battle.attackerArmyIds.includes(
    finalResult.winnerArmyId!
  );

const defenderWon =
  battle.defenderArmyIds.includes(
    finalResult.winnerArmyId!
  );

assert.notEqual(
  attackerWon,
  defenderWon
);

const winningArmyIds =
  attackerWon
    ? battle.attackerArmyIds
    : battle.defenderArmyIds;

const losingArmyIds =
  attackerWon
    ? battle.defenderArmyIds
    : battle.attackerArmyIds;

//
// =====================================================
// LOSING SIDE RETREATS
// =====================================================
//

const postOutcomeWorld =
  getRuntimeWorldState();

for (
  const armyId
  of losingArmyIds
) {
  const army =
    postOutcomeWorld.armies[
      armyId
    ];

  if (
    army.status ===
    "destroyed"
  ) {
    continue;
  }

  assert.equal(
    army.status,
    "retreating",
    `${armyId} must retreat`
  );
}

console.log(
  "PASS: every surviving army on losing side retreats"
);

//
// =====================================================
// WINNING SIDE RELEASED TO FIELD
// =====================================================
//

for (
  const armyId
  of winningArmyIds
) {
  const army =
    postOutcomeWorld.armies[
      armyId
    ];

  if (
    army.status ===
    "destroyed"
  ) {
    continue;
  }

  assert.equal(
    army.status,
    "field",
    `${armyId} must return to field status`
  );
}

console.log(
  "PASS: every surviving army on winning side returns to field"
);

//
// =====================================================
// LOSING ARMIES SHOULD NO LONGER BE AT BATTLE NODE
// WHEN A RETREAT ROUTE EXISTS
// =====================================================
//

let movedRetreatingArmyCount =
  0;

for (
  const armyId
  of losingArmyIds
) {
  const army =
    postOutcomeWorld.armies[
      armyId
    ];

  if (
    army.status !==
    "retreating"
  ) {
    continue;
  }

  const position =
    postOutcomeWorld
      .simulation
      .entityPositions[
        armyId
      ];

  if (
    position?.kind ===
      "node" &&
    position.nodeId !==
      "stoneford"
  ) {
    movedRetreatingArmyCount +=
      1;
  }
}

console.log(
  `INFO: ${movedRetreatingArmyCount} retreating armies found a deterministic retreat node`
);

//
// =====================================================
// ONLY ONE FINAL RESULT
// =====================================================
//

const resultIds =
  Object.keys(
    getRuntimeWorldState()
      .battleResults
  );

assert.equal(
  resultIds.length,
  1
);

assert.equal(
  resultIds[
    0
  ],
  battle.finalBattleResultId
);

console.log(
  "PASS: persistent battle created exactly one canonical final result"
);

//
// =====================================================
// FINISH BATTLE
//
// retreat duration = 60.
//
// Total battle time = 600.
// =====================================================
//

const endTime =
  startTime +
  600;

const endAdvance =
  advanceWorldUntil(
    endTime
  );

assert.equal(
  endAdvance.reachedTarget,
  true
);

const finishedBattle =
  getRuntimeWorldState()
    .battles[
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

assert.equal(
  finishedBattle.nextPhaseAt,
  undefined
);

assert.equal(
  finishedBattle.pendingDecision,
  undefined
);

assert.equal(
  finishedBattle.finalBattleResultId,
  finalResult.id
);

console.log(
  "PASS: battle ended with same canonical result"
);

//
// =====================================================
// HISTORY VALIDATION
// =====================================================
//

const casualtyEntries =
  finishedBattle.history.filter(
    (entry) =>
      entry.summary.includes(
        "Progressive casualties applied"
      )
  );

assert.equal(
  casualtyEntries.length,
  3
);

assert.ok(
  casualtyEntries.some(
    (entry) =>
      entry.summary.includes(
        "engagement"
      )
  )
);

assert.ok(
  casualtyEntries.some(
    (entry) =>
      entry.summary.includes(
        "crisis"
      )
  )
);

assert.ok(
  casualtyEntries.some(
    (entry) =>
      entry.summary.includes(
        "resolution"
      )
  )
);

assert.ok(
  finishedBattle.history.some(
    (entry) =>
      entry.summary.includes(
        "Battlefield outcome decided"
      )
  )
);

assert.ok(
  finishedBattle.history.some(
    (entry) =>
      entry.type ===
      "battle_ended"
  )
);

console.log(
  "PASS: casualty/outcome/end history recorded"
);

//
// =====================================================
// FINAL SOLDIER SANITY
// =====================================================
//

for (
  const armyId
  of allArmyIds
) {
  const soldiers =
    getSoldiers(
      armyId
    );

  assert.ok(
    soldiers >= 0,
    `${armyId} cannot have negative soldiers`
  );

  assert.ok(
    soldiers < 250,
    `${armyId} should have suffered battle casualties`
  );
}

console.log(
  "PASS: soldier counts remain valid after progressive battle"
);

//
// =====================================================
// FINAL
// =====================================================
//

console.log("");

console.log(
  "================================================"
);

console.log(
  "PACKAGE 3 C2.4 PROGRESSIVE BATTLE: PASS"
);

console.log(
  "================================================"
);