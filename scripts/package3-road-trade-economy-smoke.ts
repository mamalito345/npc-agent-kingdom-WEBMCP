import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getRoadSecurity,
} from "../lib/economy/road-security";

import {
  getSettlementTradeState,
  processDailyTradeIncome,
} from "../lib/economy/trade";

import {
  getKingdomStrategicEconomy,
} from "../lib/economy/strategic-metrics";

import type {
  Army,
  PersistentBattle,
} from "../types/military";

function makeForeignArmy(
  id: string,
  ownerId: string
): Army {
  return {
    id,
    ownerId,

    unitIds: [],

    morale:
      "normal",

    supply: {
      foodSupply:
        0,

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

const initial =
  getRuntimeWorldState();

const stoneford =
  initial.settlements
    .stoneford;

assert.ok(
  stoneford
);

const ownerKingdomId =
  stoneford.kingdomId;

const enemyKingdomId =
  Object.keys(
    initial.kingdoms
  ).find(
    (id) =>
      id !==
      ownerKingdomId
  );

assert.ok(
  enemyKingdomId
);

const edgeId =
  "stoneford_riverhold";

//
// =====================================================
// CLEAN BASELINE
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    battles: {},

    sieges: {},

    settlementOperations: {},

    armies: {
      ...current.armies,
    },

    settlements: {
      ...current.settlements,

      stoneford: {
        ...current
          .settlements
          .stoneford,

        kingdomId:
          ownerKingdomId,

        controllerKingdomId:
          ownerKingdomId,

        occupiedAt:
          undefined,

        productionDamage:
          undefined,
      },

      riverhold: {
        ...current
          .settlements
          .riverhold,

        controllerKingdomId:
          current.settlements
            .riverhold
            .kingdomId,

        occupiedAt:
          undefined,

        productionDamage:
          undefined,
      },
    },
  })
);

//
// =====================================================
// SAFE ROAD
// =====================================================
//

let road =
  getRoadSecurity(
    edgeId
  );

assert.equal(
  road.state,
  "safe"
);

assert.equal(
  road.multiplier,
  1
);

console.log(
  "PASS: peaceful road is SAFE"
);

const safeTrade =
  getSettlementTradeState(
    "stoneford"
  );

assert.ok(
  safeTrade.tradeMultiplier >
    0
);

console.log(
  `PASS: safe settlement trade multiplier=${safeTrade.tradeMultiplier.toFixed(2)}`
);

//
// =====================================================
// FOREIGN ARMY → THREATENED
// =====================================================
//

const foreignArmy =
  makeForeignArmy(
    "e-foreign-army",
    enemyKingdomId!
  );

updateRuntimeWorldState(
  (current) => ({
    ...current,

    armies: {
      ...current.armies,

      [foreignArmy.id]:
        foreignArmy,
    },

    simulation: {
      ...current.simulation,

      entityPositions: {
        ...current
          .simulation
          .entityPositions,

        [foreignArmy.id]: {
          kind:
            "node",

          nodeId:
            "stoneford",
        },
      },
    },
  })
);

road =
  getRoadSecurity(
    edgeId
  );

assert.equal(
  road.state,
  "threatened"
);

assert.equal(
  road.multiplier,
  0.75
);

console.log(
  "PASS: foreign army makes road THREATENED"
);

//
// =====================================================
// RAID → RAIDED
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    settlementOperations: {
      ...current
        .settlementOperations,

      "e-raid": {
        id:
          "e-raid",

        type:
          "raid",

        armyId:
          foreignArmy.id,

        settlementId:
          "stoneford",

        startedAt:
          current.simulation
            .worldTimeMinutes,

        completesAt:
          current.simulation
            .worldTimeMinutes +
          60,

        status:
          "active",
      },
    },
  })
);

road =
  getRoadSecurity(
    edgeId
  );

assert.equal(
  road.state,
  "raided"
);

assert.equal(
  road.multiplier,
  0.4
);

console.log(
  "PASS: active raid makes road RAIDED"
);

//
// =====================================================
// BATTLE → BLOCKED
// =====================================================
//

const battle:
  PersistentBattle = {
  id:
    "e-test-battle",

  nodeId:
    "stoneford",

  attackerArmyIds: [
    "e-attacker",
  ],

  defenderArmyIds: [
    "e-defender",
  ],

  startedAt:
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes,

  currentPhase:
    "engagement",

  nextPhaseAt:
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes +
    60,
  battleHour:
    0,

  frontMomentum:
    0,

  attackerTactic:
    "aggressive_push",

  defenderTactic:
    "hold_ground",

  attackerMoralePressure:
    0,

  defenderMoralePressure:
    0,

  attackerReserveCommitted:
    false,

  defenderReserveCommitted:
    false,

  terrain:
    "hills",

  features: [
    "high_ground",
  ],

  rounds: [],
  status:
    "active",

  activeOrders: [],

  history: [],
};

updateRuntimeWorldState(
  (current) => ({
    ...current,

    battles: {
      ...current.battles,

      [battle.id]:
        battle,
    },
  })
);

road =
  getRoadSecurity(
    edgeId
  );

assert.equal(
  road.state,
  "blocked"
);

assert.equal(
  road.multiplier,
  0
);

console.log(
  "PASS: active battle makes road BLOCKED"
);

const blockedTrade =
  getSettlementTradeState(
    "stoneford"
  );

assert.ok(
  blockedTrade.tradeMultiplier <
    safeTrade.tradeMultiplier
);

console.log(
  "PASS: blocked road reduces settlement trade"
);

//
// =====================================================
// OCCUPATION PENALTY
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    battles: {},

    settlementOperations: {},

    armies: {
      ...current.armies,

      [foreignArmy.id]: {
        ...current.armies[
          foreignArmy.id
        ],

        status:
          "destroyed",
      },
    },

    settlements: {
      ...current.settlements,

      stoneford: {
        ...current
          .settlements
          .stoneford,

        controllerKingdomId:
          enemyKingdomId!,

        occupiedAt:
          current.simulation
            .worldTimeMinutes,
      },
    },
  })
);

const occupationTrade =
  getSettlementTradeState(
    "stoneford"
  );

assert.equal(
  occupationTrade
    .occupationMultiplier,
  0.25
);

assert.ok(
  occupationTrade.tradeMultiplier <=
    0.25
);

console.log(
  "PASS: new occupation applies 0.25 trade multiplier"
);

//
// =====================================================
// DAILY TRADE → KINGDOM TREASURY
// =====================================================
//

updateRuntimeWorldState(
  (current) => ({
    ...current,

    settlements: {
      ...current.settlements,

      stoneford: {
        ...current
          .settlements
          .stoneford,

        controllerKingdomId:
          ownerKingdomId,

        occupiedAt:
          undefined,
      },
    },
  })
);

const treasuryBefore =
  getRuntimeWorldState()
    .kingdoms[
      ownerKingdomId
    ].treasury;

processDailyTradeIncome();

const treasuryAfter =
  getRuntimeWorldState()
    .kingdoms[
      ownerKingdomId
    ].treasury;

assert.ok(
  treasuryAfter >
    treasuryBefore
);

console.log(
  "PASS: daily trade income reaches central kingdom treasury"
);

//
// =====================================================
// STRATEGIC METRICS
// =====================================================
//

const metrics =
  getKingdomStrategicEconomy(
    ownerKingdomId
  );

assert.ok(
  metrics.dailyTradeIncome >=
    0
);

assert.ok(
  metrics.dailyMilitaryGoldCost >=
    0
);

assert.ok(
  metrics.tradeDisruptionRatio >=
    0 &&
  metrics.tradeDisruptionRatio <=
    1
);

assert.ok(
  metrics.mobilizationRatio >=
    0 &&
  metrics.mobilizationRatio <=
    1
);

assert.ok(
  [
    "normal",
    "major",
    "full",
    "emergency",
  ].includes(
    metrics.mobilizationLevel
  )
);

console.log(
  "PASS: strategic economy metrics calculated"
);

console.log(
  JSON.stringify(
    metrics,
    null,
    2
  )
);

console.log("");

console.log(
  "============================================="
);

console.log(
  "PACKAGE 3 BLOCK E ROAD + TRADE ECONOMY: PASS"
);

console.log(
  "============================================="
);