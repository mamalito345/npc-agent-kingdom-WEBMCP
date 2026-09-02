import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  validatePlayerAccess,
  validatePlayerCommandAccess,
} from "../lib/session/access";

import {
  getPlayerObservation,
  getPlayerKnownEnemyForces,
} from "../lib/session/observation";

import {
  issuePlayerArmyMove,
} from "../lib/session/player-actions";

//
// =====================================================
// MULTIPLAYER SESSION
// =====================================================
//

const initial =
  getRuntimeWorldState();

assert.equal(
  Object.keys(
    initial.session.players
  ).length,
  5
);

assert.equal(
  initial.session
    .players[
      "player-edwyn"
    ]?.controllerType,
  "human"
);

assert.equal(
  initial.session
    .players[
      "player-roderic"
    ]?.controllerType,
  "webmcp_llm"
);

assert.equal(
  initial.session
    .players[
      "player-garran"
    ]?.controllerType,
  "webmcp_llm"
);

assert.equal(
  initial.session
    .players[
      "player-osric"
    ]?.controllerType,
  "webmcp_llm"
);

assert.equal(
  initial.session
    .players[
      "player-varren"
    ]?.controllerType,
  "webmcp_llm"
);

console.log(
  "PASS: human + four WebMCP player slots"
);

//
// =====================================================
// SESSION AUTH
// =====================================================
//

const badSession =
  validatePlayerAccess(
    "wrong-session",
    "player-roderic"
  );

assert.equal(
  badSession.ok,
  false
);

const validSession =
  validatePlayerAccess(
    "demo-session",
    "player-roderic"
  );

assert.equal(
  validSession.ok,
  true
);

console.log(
  "PASS: session/player access boundary"
);

//
// =====================================================
// TURN AUTHORIZATION
// =====================================================
//

const rodericBeforeTurn =
  validatePlayerCommandAccess(
    "demo-session",
    "player-roderic"
  );

assert.equal(
  rodericBeforeTurn.ok,
  false
);

if (
  rodericBeforeTurn.ok ===
  false
) {
  assert.equal(
    rodericBeforeTurn.error,
    "NOT_CURRENT_PLAYER"
  );
}

console.log(
  "PASS: LLM cannot act outside its command window"
);

//
// =====================================================
// OBSERVATION FIREWALL
// =====================================================
//

const rodericObservation =
  getPlayerObservation(
    "player-roderic"
  );

if (
  !rodericObservation
) {
  throw new Error(
    "Roderic observation missing."
  );
}

assert.ok(
  rodericObservation
    .ownArmies
    .every(
      (army) =>
        initial.armies[
          army.id
        ]?.ownerId ===
        "eastvale"
    )
);

const knownEnemies =
  getPlayerKnownEnemyForces(
    "demo-session",
    "player-roderic"
  );

if (
  knownEnemies.ok ===
  false
) {
  throw new Error(
    knownEnemies.error
  );
}

/*
 * Initial knowledge is empty.
 *
 * Roderic MUST NOT magically see
 * Northreach's canonical army position.
 */
assert.equal(
  knownEnemies
    .forces
    .length,
  0
);

console.log(
  "PASS: enemy canonical state does not leak through observation"
);

//
// =====================================================
// GIVE RODERIC HIS COMMAND WINDOW
// =====================================================
//

updateRuntimeWorldState(
  (world) => ({
    ...world,

    session: {
      ...world.session,

      commandCycle: {
        ...world
          .session
          .commandCycle,

        phase:
          "planning",

        requiredPlayerIds: [
          "player-roderic",
        ],

        readyPlayerIds:
          [],

        currentPlayerId:
          "player-roderic",

        interrupt:
          undefined,
      },
    },
  })
);

//
// =====================================================
// OWN ARMY ORDER
// =====================================================
//

const ownMove =
  issuePlayerArmyMove(
    "demo-session",
    "player-roderic",
    "army-eastvale-roderic",
    "greenharbor"
  );

if (
  ownMove.ok ===
  false
) {
  throw new Error(
    `Valid Roderic order failed: ${ownMove.error}`
  );
}

assert.equal(
  ownMove
    .order
    .status,
  "queued"
);

console.log(
  "PASS: WebMCP player can queue canonical own-army order"
);

//
// =====================================================
// CROSS-PLAYER AUTHORIZATION
// =====================================================
//

const stolenArmyMove =
  issuePlayerArmyMove(
    "demo-session",
    "player-roderic",
    "army-northreach-edwyn",
    "riverhold"
  );

assert.equal(
  stolenArmyMove.ok,
  false
);

if (
  stolenArmyMove.ok ===
  false
) {
  assert.equal(
    stolenArmyMove.error,
    "NOT_AUTHORIZED"
  );
}

console.log(
  "PASS: WebMCP player cannot control another kingdom's army"
);

//
// =====================================================
// CHARACTER PHYSICAL POSITIONS
// =====================================================
//

assert.deepEqual(
  getRuntimeWorldState()
    .simulation
    .entityPositions[
      "king_roderic"
    ],
  {
    kind:
      "node",

    nodeId:
      "eastkeep",
  }
);

assert.deepEqual(
  getRuntimeWorldState()
    .simulation
    .entityPositions[
      "king_varren"
    ],
  {
    kind:
      "node",

    nodeId:
      "ironhold",
  }
);

console.log(
  "PASS: all player characters have canonical physical positions"
);

console.log(
  ""
);

console.log(
  "C MULTIPLAYER WEBMCP PLAYER BOUNDARY: PASS"
);