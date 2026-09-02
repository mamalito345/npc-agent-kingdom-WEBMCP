import assert from "node:assert/strict";

import {
  addWorldPauseReason,
  getRuntimeWorldState,
  getWorldPauseReasons,
  removeWorldPauseReason,
  setEntityPosition,
  setWorldPaused,
} from "../lib/world/runtime";

import {
  canConverse,
  setCharacterPresenceContext,
} from "../lib/conversation/presence";

import {
  addCharacterKnowledge,
} from "../lib/conversation/character-knowledge";

import {
  buildGmCharacterContext,
} from "../lib/conversation/context";

import {
  humanTalkToCharacter,
} from "../lib/conversation/human-actions";

import {
  endConversation,
  startConversation,
  talkToCharacter,
} from "../lib/conversation/service";

import {
  spawnCourier,
} from "../lib/world/couriers";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

async function main(): Promise<void> {

const SESSION_ID = "demo-session";
const PLAYER_ID = "player-edwyn";

setWorldPaused(false);

// P4-01 — Presence
setCharacterPresenceContext({
  id: "test-army-presence",
  kind: "army",
  characterIds: [
    "lord_edwyn",
    "lord_merek",
  ],
  active: true,
  referenceId: "army-northreach-edwyn",
});

assert.equal(
  canConverse(
    "lord_edwyn",
    "lord_merek"
  ).ok,
  true
);

assert.equal(
  canConverse(
    "lord_edwyn",
    "king_aldric"
  ).ok,
  false
);

console.log("PASS P4-01: presence rules");

// P4-02 — Conversation Pause
const started = startConversation(
  SESSION_ID,
  PLAYER_ID,
  "lord_merek"
);

if (!started.ok) {
  throw new Error(started.error);
}

assert.equal(
  getRuntimeWorldState()
    .simulation
    .paused,
  true
);

const ended = endConversation(
  SESSION_ID,
  PLAYER_ID,
  started.conversation.id
);

if (!ended.ok) {
  throw new Error(ended.error);
}

assert.equal(
  getRuntimeWorldState()
    .simulation
    .paused,
  false
);

console.log("PASS P4-02: conversation pause");

// P4-03 — Nested Pause
addWorldPauseReason(
  "army_contact:test"
);

const nested = startConversation(
  SESSION_ID,
  PLAYER_ID,
  "lord_merek"
);

if (!nested.ok) {
  throw new Error(nested.error);
}

assert.equal(
  getWorldPauseReasons().includes(
    "army_contact:test"
  ),
  true
);

assert.equal(
  getWorldPauseReasons().includes(
    nested.conversation.pauseReasonId
  ),
  true
);

const nestedEnded = endConversation(
  SESSION_ID,
  PLAYER_ID,
  nested.conversation.id
);

if (!nestedEnded.ok) {
  throw new Error(nestedEnded.error);
}

assert.equal(
  getWorldPauseReasons().includes(
    "army_contact:test"
  ),
  true
);

assert.equal(
  getRuntimeWorldState()
    .simulation
    .paused,
  true
);

removeWorldPauseReason(
  "army_contact:test"
);

console.log("PASS P4-03: nested pause survives close");

// P4-04 / P4-05 — Knowledge isolation
setCharacterPresenceContext({
  id: "test-council",
  kind: "council",
  characterIds: [
    "lord_edwyn",
    "king_aldric",
  ],
  active: true,
  referenceId:
    "northreach-war-council",
});

const now =
  getRuntimeWorldState()
    .simulation
    .worldTimeMinutes;

addCharacterKnowledge({
  characterId:
    "king_aldric",
  subjectId:
    "enemy-force-demo",
  kind:
    "army",
  observedAt:
    now - 14 * 60,
  deliveredAt:
    now,
  source:
    "scout",
  confidence:
    "medium",
  summary:
    "enemy force is approximately 3000–4000 and the report is 14 hours old",
  data: {
    estimatedMin:
      3000,
    estimatedMax:
      4000,
    ageHours:
      14,
  },
});

addCharacterKnowledge({
  characterId:
    "lord_edwyn",
  subjectId:
    "secret-x",
  kind:
    "event",
  observedAt:
    now,
  deliveredAt:
    now,
  source:
    "system",
  confidence:
    "confirmed",
  summary:
    "SECRET_X_4250",
  data: {
    exactHiddenValue:
      4250,
  },
});

const aldricConversation =
  startConversation(
    SESSION_ID,
    PLAYER_ID,
    "king_aldric"
  );

if (!aldricConversation.ok) {
  throw new Error(
    aldricConversation.error
  );
}

const aldricContext =
  buildGmCharacterContext(
    "king_aldric",
    aldricConversation
      .conversation
      .id
  );

assert.ok(
  aldricContext
);

const serialized =
  JSON.stringify(
    aldricContext
  );

assert.equal(
  serialized.includes(
    "SECRET_X_4250"
  ),
  false
);

assert.equal(
  serialized.includes(
    '"exactHiddenValue":4250'
  ),
  false
);

assert.equal(
  serialized.includes(
    "3000–4000"
  ),
  true
);

const response =
  await talkToCharacter(
    SESSION_ID,
    PLAYER_ID,
    "king_aldric",
    "Düşman ordusu hakkında ne düşünüyorsun?",
    aldricConversation
      .conversation
      .id
  );

if (!response.ok) {
  throw new Error(
    response.error
  );
}

assert.equal(
  response
    .npcTurn
    .text
    .includes(
      "3000–4000"
    ),
  true
);

assert.equal(
  response
    .npcTurn
    .text
    .includes(
      "4250"
    ),
  false
);

endConversation(
  SESSION_ID,
  PLAYER_ID,
  aldricConversation
    .conversation
    .id
);

console.log("PASS P4-04/05: character context isolation");

// P4-06 — Remote conversation
const remoteTalk =
  await talkToCharacter(
    SESSION_ID,
    PLAYER_ID,
    "lord_theon",
    "Can you hear me?"
  );

assert.equal(
  remoteTalk.ok,
  false
);

if (!remoteTalk.ok) {
  assert.equal(
    remoteTalk.error,
    "NOT_PRESENT"
  );
}

console.log("PASS P4-06: remote talk rejected");

// P4-07/08/09 — Memory
const memoryConversation =
  startConversation(
    SESSION_ID,
    PLAYER_ID,
    "lord_merek"
  );

if (!memoryConversation.ok) {
  throw new Error(
    memoryConversation.error
  );
}

const memoryTurn =
  await talkToCharacter(
    SESSION_ID,
    PLAYER_ID,
    "lord_merek",
    "I promise I will support you with soldiers at Northwatch.",
    memoryConversation
      .conversation
      .id
  );

if (!memoryTurn.ok) {
  throw new Error(
    memoryTurn.error
  );
}

const memoryEnd =
  endConversation(
    SESSION_ID,
    PLAYER_ID,
    memoryConversation
      .conversation
      .id
  );

if (!memoryEnd.ok) {
  throw new Error(
    memoryEnd.error
  );
}

const memories =
  getRuntimeWorldState()
    .session
    .memories[
      "lord_merek"
    ] ??
  [];

assert.equal(
  memories.some(
    (memory) =>
      memory.type ===
      "PROMISE"
  ),
  true
);

assert.equal(
  "promises" in
    getRuntimeWorldState()
      .session,
  false
);

const later =
  startConversation(
    SESSION_ID,
    PLAYER_ID,
    "lord_merek"
  );

if (!later.ok) {
  throw new Error(
    later.error
  );
}

const laterContext =
  buildGmCharacterContext(
    "lord_merek",
    later
      .conversation
      .id
  );

assert.ok(
  laterContext
);

assert.equal(
  laterContext
    .relevantMemories
    .some(
      (memory) =>
        memory
          .sourceConversationId ===
        memoryConversation
          .conversation
          .id
    ),
  true
);

endConversation(
  SESSION_ID,
  PLAYER_ID,
  later
    .conversation
    .id
);

console.log("PASS P4-07/08/09: persistent subjective memory");

// P4-10 — Human/WebMCP parity foundation
assert.equal(
  humanTalkToCharacter,
  talkToCharacter
);

console.log("PASS P4-10: human facade uses same canonical service");

// P4-11 — Courier delay regression
setEntityPosition(
  "lord_edwyn",
  {
    kind:
      "node",
    nodeId:
      "stoneford",
  }
);

setEntityPosition(
  "king_aldric",
  {
    kind:
      "node",
    nodeId:
      "northwatch",
  }
);

setWorldPaused(
  false
);

const courier =
  spawnCourier(
    "lord_edwyn",
    "king_aldric",
    "Physical message regression test",
    "stoneford",
    "northwatch"
  );

if (!courier.ok) {
  throw new Error(
    courier.error
  );
}

assert.equal(
  courier.message
    .deliveredAt,
  undefined
);

const movement =
  getRuntimeWorldState()
    .simulation
    .activeMovements[
      courier
        .courier
        .id
    ];

assert.ok(
  movement
);

const beforeArrival =
  Math.max(
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes,
    movement
      .estimatedArrivalAt -
      1
  );

advanceWorldUntil(
  beforeArrival
);

assert.equal(
  getRuntimeWorldState()
    .messages[
      courier
        .message
        .id
    ]
    ?.deliveredAt,
  undefined
);

advanceWorldUntil(
  movement
    .estimatedArrivalAt
);

assert.notEqual(
  getRuntimeWorldState()
    .messages[
      courier
        .message
        .id
    ]
    ?.deliveredAt,
  undefined
);

console.log("PASS P4-11: courier delay");

// Serialization foundation
const serializable =
  JSON.stringify({
    conversations:
      getRuntimeWorldState()
        .session
        .conversations,
    memories:
      getRuntimeWorldState()
        .session
        .memories,
    characterKnowledge:
      getRuntimeWorldState()
        .session
        .characterKnowledge,
  });

assert.ok(
  JSON.parse(
    serializable
  )
);

console.log("PASS: Package 4 state serializable");
console.log("");
console.log("PACKAGE 4 NPC MIND & COMMUNICATION MVP: PASS");

}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});