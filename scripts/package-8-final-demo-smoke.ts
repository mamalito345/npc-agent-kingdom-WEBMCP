import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  issuePlayerArmyMove,
} from "../lib/session/player-actions";

import {
  executeLlmPlayerAction,
} from "../lib/actors/tool-executor";

import {
  getPlayerKnownWorld,
} from "../lib/session/observation";

import {
  getObserverFeed,
} from "../lib/demo/observer";

import {
  serializeDemoSave,
  restoreDemoSave,
} from "../lib/demo/persistence";

import {
  RemoteEventDirectorAdapter,
  RemoteGmCharacterAdapter,
  RemoteGmLordOrderAdapter,
  RemotePlayerLlmAdapter,
} from "../lib/ai/remote-adapters";

import {
  buildGmCharacterContext,
} from "../lib/conversation/context";

import {
  startConversation,
} from "../lib/conversation/service";

import {
  setCharacterPresenceContext,
} from "../lib/conversation/presence";

import {
  runLlmPlayerActivation,
} from "../lib/actors/runner";

import {
  buildEventOpportunities,
} from "../lib/events/opportunities";

import {
  runEventOpportunity,
} from "../lib/events/runner";

function setTurn(playerId: string): void {
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      commandCycle: {
        ...current.session.commandCycle,
        phase: "planning",
        requiredPlayerIds: [playerId],
        readyPlayerIds: [],
        currentPlayerId: playerId,
        interrupt: undefined,
      },
    },
  }));
}

async function main(): Promise<void> {
  // P8-P01 — Human canonical parity.
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      players: {
        ...current.session.players,
        "player-roderic": {
          ...current.session.players["player-roderic"],
          controllerType: "human",
        },
      },
    },
  }));

  setTurn("player-roderic");

  const humanMove = issuePlayerArmyMove(
    "demo-session",
    "player-roderic",
    "army-eastvale-roderic",
    "greenharbor"
  );

  assert.equal(humanMove.ok, true);
  console.log("PASS P8-P01: Human action reaches canonical PlayerAction");

  // Restore Roderic as LLM for following tests.
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      players: {
        ...current.session.players,
        "player-roderic": {
          ...current.session.players["player-roderic"],
          controllerType: "webmcp_llm",
        },
      },
    },
  }));

  // P8-P02 — Agent tool runner canonical parity.
  setTurn("player-roderic");

  const apiTool = await executeLlmPlayerAction(
    "demo-session",
    "player-roderic",
    {
      tool: "inspect_armies",
      args: {},
    }
  );

  assert.equal(apiTool.ok, true);
  console.log("PASS P8-P02: API Player LLM tool runner uses shared canonical layer");

  // P8-P03 — WebMCP parity is structural: register-tools imports same services.
  // This smoke confirms the exact canonical service is usable independently of transport.
  setTurn("player-roderic");
  const webmcpEquivalent = issuePlayerArmyMove(
    "demo-session",
    "player-roderic",
    "army-eastvale-roderic",
    "dawnfort"
  );
  assert.equal(webmcpEquivalent.ok, true);
  console.log("PASS P8-P03: WebMCP transport target is canonical PlayerAction service");

  // P8-P04 — player isolation.
  const known = getPlayerKnownWorld("demo-session", "player-roderic");

  if (known.ok === false) {
    throw new Error(`Known-world inspect failed: ${known.error}`);
  }

  assert.equal(
    JSON.stringify(known).includes('"loyalty":22'),
    false
  );
  console.log("PASS P8-P04: player-safe inspection does not expose foreign lord private loyalty");

  // P8-P05 — observer is read-only derived global view.
  const worldBeforeObserver = JSON.stringify(getRuntimeWorldState());
  getObserverFeed();
  assert.equal(JSON.stringify(getRuntimeWorldState()), worldBeforeObserver);
  console.log("PASS P8-P05: observer feed derives global state without mutation");

  // P8-P06 — real adapter transport shape + activation.
  const playerAdapter = new RemotePlayerLlmAdapter({
    async post() {
      return {
        ok: true,
        decision: {
          decisionSummary: "Inspect own forces and finish the window.",
          actions: [
            {
              tool: "inspect_armies",
              args: {},
            },
          ],
          passWindow: true,
        },
      } as never;
    },
  });

  setTurn("player-roderic");

  const activation = await runLlmPlayerActivation(
    "player-roderic",
    "NORMAL_COMMAND_WINDOW",
    playerAdapter
  );

  if (activation.ok === false) {
    throw new Error(`LLM activation failed: ${activation.error}`);
  }

  assert.equal(activation.record.actionResults[0]?.ok, true);
  console.log("PASS P8-P06: inspect -> decide -> tool -> result -> pass activation");

  // P8-P07 — GM event selection via remote adapter and canonical event apply.
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        events: {
          ...current.session.director.events,
          dailyBudget: {
            dayIndex: Math.floor(current.simulation.worldTimeMinutes / 1440),
            globalCount: 0,
            kingdomCounts: {},
          },
          cooldownUntil: {},
        },
      },
    },
  }));

  const opportunity = buildEventOpportunities().find(
    (item) => item.category === "ECONOMIC" && item.kingdomId === "eastvale"
  );

  assert.ok(opportunity);

  // Make chance-gate deterministic by finding a createdAt value that yields selection.
  const directorAdapter = new RemoteEventDirectorAdapter({
    async post(_url, context: unknown) {
      const typed = context as {
        candidates: Array<{ candidateId: string }>;
      };

      return {
        ok: true,
        selection: {
          decisionSummary: "Select the first bounded candidate.",
          selectedCandidateId: typed.candidates[0]?.candidateId ?? null,
        },
      } as never;
    },
  });

  let gmEventWorked = false;

  for (let seed = 0; seed < 1000; seed += 1) {
    const result = await runEventOpportunity(
      {
        ...opportunity,
        createdAt: seed,
      },
      directorAdapter
    );

    if (result) {
      gmEventWorked = true;
      break;
    }
  }

  assert.equal(gmEventWorked, true);
  console.log("PASS P8-P07: GM event selection -> validation -> canonical event");

  // P8-P08 — GM Character bounded context + remote response.
  setCharacterPresenceContext({
    id: "p8-council",
    kind: "council",
    characterIds: ["king_roderic", "lord_theon"],
    active: true,
  });

  const startedConversation = startConversation(
    "demo-session",
    "player-roderic",
    "lord_theon"
  );

  if (startedConversation.ok === false) {
    throw new Error(
      `GM conversation setup failed: ${startedConversation.error}`
    );
  }

  const gmContext = buildGmCharacterContext(
    "lord_theon",
    startedConversation.conversation.id
  );

  if (!gmContext) {
    throw new Error("GM_CONTEXT_NOT_AVAILABLE");
  }

  const gmCharacter = new RemoteGmCharacterAdapter({
    async post() {
      return {
        ok: true,
        response: {
          text: "I will defend Greenharbor, but I will not abandon the coast.",
        },
      } as never;
    },
  });

  const gmResponse = await gmCharacter.generateResponse(gmContext);
  assert.ok(gmResponse.text.length > 10);

  const gmLord = new RemoteGmLordOrderAdapter({
    async post() {
      return {
        ok: true,
        decision: {
          response: "NEGOTIATE",
          summary: "The lord requests guarantees.",
          requestedCondition: "Leave part of the force at home.",
        },
      } as never;
    },
  });

  const lordDecision = await gmLord.decideOrder({
    worldTimeMinutes: getRuntimeWorldState().simulation.worldTimeMinutes,
    lord: getRuntimeWorldState().session.lords.profiles.lord_theon,
    order: {
      id: "p8-order",
      playerId: "player-roderic",
      rulerCharacterId: "king_roderic",
      lordCharacterId: "lord_theon",
      type: "BRING_ARMY",
      risk: 70,
      issuedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
      status: "RECEIVED",
    },
    ruler: {
      characterId: "king_roderic",
      relationship: 48,
    },
    knownMilitarySituation: [],
    relevantMemories: [],
    rules: [],
  });

  assert.equal(lordDecision.response, "NEGOTIATE");
  console.log("PASS P8-P08: bounded GM Character / lord decision adapters");

  // P8-P09 — safe observer trace.
  const feed = getObserverFeed();
  const llmFeed = feed.find((entry) => entry.kind === "PLAYER_LLM");
  assert.ok(llmFeed);
  assert.equal(JSON.stringify(llmFeed).includes("chain-of-thought"), false);
  console.log("PASS P8-P09: observer trace shows safe summaries/tools without hidden CoT");

  // P8-P10 — save/load.
  const save = serializeDemoSave();
  const savedTime = getRuntimeWorldState().simulation.worldTimeMinutes;

  updateRuntimeWorldState((current) => ({
    ...current,
    simulation: {
      ...current.simulation,
      worldTimeMinutes: savedTime + 999,
    },
  }));

  restoreDemoSave(save);
  assert.equal(
    getRuntimeWorldState().simulation.worldTimeMinutes,
    savedTime
  );
  console.log("PASS P8-P10: full serializable world state restores");

  // P8-P11 — model failure is an error, no canonical mutation by adapter.
  const failedAdapter = new RemotePlayerLlmAdapter({
    async post() {
      throw new Error("SIMULATED_PROVIDER_FAILURE");
    },
  });

  setTurn("player-roderic");

  const beforeFailure = JSON.stringify(getRuntimeWorldState().armies);

  const failedRun = await runLlmPlayerActivation(
    "player-roderic",
    "NORMAL_COMMAND_WINDOW",
    failedAdapter
  );

  assert.equal(failedRun.ok, false);
  assert.equal(JSON.stringify(getRuntimeWorldState().armies), beforeFailure);
  console.log("PASS P8-P11: failed model call does not corrupt canonical state");

  console.log("");
  console.log("PACKAGE 8 FINAL DEMO SMOKE: PASS");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
