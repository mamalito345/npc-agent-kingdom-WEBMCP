import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  buildDirectorContext,
} from "../lib/director/context";

import {
  runDirectorTurn,
  submitDirectorProposal,
} from "../lib/director/gateway";

import type {
  DirectorModelAdapter,
} from "../types/director";

//
// =====================================================
// DIRECTOR IS NOT PLAYER
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
  Object.values(
    initial.session.players
  ).some(
    (player) =>
      player.id ===
      "world-director"
  ),
  false
);

assert.ok(
  initial.session
    .director
);

console.log(
  "PASS: World Director is separate from PlayerSlot"
);

//
// =====================================================
// OMNISCIENT BUT READ-ONLY CONTEXT
// =====================================================
//

const context =
  buildDirectorContext();

assert.equal(
  context.session.id,
  "demo-session"
);

assert.ok(
  context.armies.length >
  0
);

assert.ok(
  context.kingdoms.length >=
  5
);

assert.ok(
  context.rules.some(
    (rule) =>
      rule.includes(
        "Never directly mutate"
      )
  )
);

console.log(
  "PASS: Director receives structured canonical context"
);

//
// =====================================================
// DIRECTOR CANNOT MOVE PLAYER CHARACTER
// =====================================================
//

const illegalCharacterMove =
  submitDirectorProposal({
    type:
      "npc_character_travel",

    reason:
      "Director attempts to take over the human player.",

    payload: {
      characterId:
        "lord_edwyn",

      destinationNodeId:
        "riverhold",
    },
  });

assert.equal(
  illegalCharacterMove.status,
  "rejected"
);

assert.equal(
  illegalCharacterMove
    .rejectionReason,
  "DIRECTOR_CANNOT_CONTROL_PLAYER_CHARACTER"
);

console.log(
  "PASS: Director cannot control player character"
);

//
// =====================================================
// DIRECTOR CANNOT MOVE PLAYER KINGDOM ARMY
// =====================================================
//

const illegalArmyMove =
  submitDirectorProposal({
    type:
      "npc_army_move",

    reason:
      "Director attempts to move Edwyn's army.",

    payload: {
      armyId:
        "army-northreach-edwyn",

      destinationNodeId:
        "riverhold",
    },
  });

assert.equal(
  illegalArmyMove.status,
  "rejected"
);

assert.equal(
  illegalArmyMove
    .rejectionReason,
  "DIRECTOR_CANNOT_CONTROL_PLAYER_ARMY"
);

console.log(
  "PASS: Director cannot control player army"
);

//
// =====================================================
// MOCK LLM ADAPTER
// =====================================================
//

const fakeDirector:
  DirectorModelAdapter = {
  async generateProposals(
    directorContext
  ) {
    const now =
      directorContext
        .worldTimeMinutes;

    return [
      {
        type:
          "schedule_world_interrupt",

        reason:
          "A distant border incident should become relevant later rather than instantly.",

        payload: {
          executeAt:
            now +
            360,

          interruptType:
            "MAJOR_WORLD_EVENT",

          message:
            "Scouts report fires along the eastern frontier.",
        },
      },

      {
        type:
          "npc_character_travel",

        reason:
          "Lord Merek reacts to regional tension by traveling to Northwatch.",

        payload: {
          characterId:
            "lord_merek",

          destinationNodeId:
            "northwatch",
        },
      },
    ];
  },
};

const directorTurn =
  await runDirectorTurn(
    fakeDirector
  );

assert.equal(
  directorTurn
    .proposed
    .length,
  2
);

assert.equal(
  directorTurn
    .rejected
    .length,
  0
);

assert.equal(
  directorTurn
    .failed
    .length,
  0
);

assert.equal(
  directorTurn
    .applied
    .length,
  2
);

console.log(
  "PASS: mock LLM produced validated structured proposals"
);

//
// =====================================================
// WORLD EVENT ENTERED CANONICAL SCHEDULER
// =====================================================
//

const afterDirector =
  getRuntimeWorldState();

const scheduledEvent =
  afterDirector
    .simulation
    .scheduledEvents
    .find(
      (event) =>
        event.type ===
          "SIMULATION_INTERRUPT" &&
        event.payload
          .message ===
          "Scouts report fires along the eastern frontier."
    );

assert.ok(
  scheduledEvent
);

console.log(
  "PASS: Director event entered canonical world scheduler"
);

//
// =====================================================
// NPC MOVEMENT IS PHYSICAL
// =====================================================
//

const merekMovement =
  afterDirector
    .simulation
    .activeMovements[
      "lord_merek"
    ];

assert.ok(
  merekMovement
);

assert.equal(
  merekMovement
    ?.destinationNodeId,
  "northwatch"
);

assert.deepEqual(
  afterDirector
    .simulation
    .entityPositions[
      "lord_merek"
    ],
  {
    kind:
      "node",

    nodeId:
      "riverhold",
  }
);

console.log(
  "PASS: Director NPC travel uses canonical no-teleport movement"
);

//
// =====================================================
// AUDIT TRAIL
// =====================================================
//

const appliedProposals =
  Object.values(
    afterDirector
      .session
      .director
      .proposals
  ).filter(
    (proposal) =>
      proposal.status ===
      "applied"
  );

assert.ok(
  appliedProposals.length >=
  2
);

assert.ok(
  afterDirector
    .session
    .director
    .lastTurnAt !==
  undefined
);

console.log(
  "PASS: Director decisions retained in auditable proposal history"
);

console.log(
  ""
);

console.log(
  "D WORLD DIRECTOR / GM BOUNDARY: PASS"
);