import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  setEntityPosition,
  setWorldPaused,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  addPlayerKnowledge,
} from "../lib/session/knowledge";

import {
  issuePlayerArmyMove,
  issuePlayerInterception,
} from "../lib/session/player-actions";

import {
  buildLlmPlayerContext,
} from "../lib/actors/context";

import {
  configureAllActivePlayersAsLlm,
} from "../lib/actors/controller";

import {
  getCurrentLlmActivation,
  runPendingLlmCommandWindows,
} from "../lib/actors/orchestrator";

import {
  executeQueuedStrategicOrders,
} from "../lib/session/executor";

import {
  openCommandInterrupt,
} from "../lib/session/command-cycle";

import {
  setCharacterPresenceContext,
} from "../lib/conversation/presence";

import {
  executeLlmPlayerAction,
} from "../lib/actors/tool-executor";

import type {
  LlmPlayerContext,
  LlmPlayerDecision,
  LlmPlayerModelAdapter,
} from "../types/actors";

const SESSION_ID = "demo-session";

function moveForPlayer(playerId: string) {
  switch (playerId) {
    case "player-edwyn":
      return {
        armyId: "army-northreach-edwyn",
        destination: "riverhold",
      };
    case "player-roderic":
      return {
        armyId: "army-eastvale-roderic",
        destination: "greenharbor",
      };
    case "player-garran":
      return {
        armyId: "army-westmoor-garran",
        destination: "blackfen",
      };
    case "player-osric":
      return {
        armyId: "army-southmark-osric",
        destination: "goldmeadow",
      };
    case "player-varren":
      return {
        armyId: "army-ironhollow-varren",
        destination: "emberfall",
      };
    default:
      throw new Error(`Unknown player ${playerId}`);
  }
}

const fakeAdapter: LlmPlayerModelAdapter = {
  async generateDecision(
    context: LlmPlayerContext
  ): Promise<LlmPlayerDecision> {
    const move = moveForPlayer(context.playerId);

    const actions: LlmPlayerDecision["actions"] = [
      {
        tool: "inspect_player_state",
        args: {},
      },
      {
        tool: "inspect_known_world",
        args: {},
      },
    ];

    if (context.playerId === "player-roderic") {
      actions.push(
        {
          tool: "issue_army_move",
          args: {
            army_id: "army-northreach-edwyn",
            destination_node_id: "riverhold",
          },
        },
        {
          tool: "recruit_units",
          args: {
            settlement_id: "eastkeep",
            unit_type: "infantry",
            blocks: 1,
          },
        }
      );
    }

    actions.push({
      tool: "issue_army_move",
      args: {
        army_id: move.armyId,
        destination_node_id: move.destination,
      },
    });

    return {
      decisionSummary: `Maintain a bounded strategic turn for ${context.playerId}.`,
      actions,
      planUpdate: {
        goal: context.playerId === "player-roderic" ? "BUILD_ARMY" : "DEFEND_REALM",
        priority: 70,
        nextActionAt: context.worldTimeMinutes + 24 * 60,
      },
      passWindow: true,
    };
  },
};

async function main(): Promise<void> {
  setWorldPaused(false);

  // =====================================================
  // P5-01 / P5-02 / P5-13 — SAFE CONTEXT + OWN STATE + ISOLATION
  // =====================================================

  const now = getRuntimeWorldState().simulation.worldTimeMinutes;

  addPlayerKnowledge({
    playerId: "player-roderic",
    subjectId: "army-northreach-edwyn",
    kind: "army",
    observedAt: now - 120,
    deliveredAt: now,
    source: "scout",
    confidence: "medium",
    summary: "Northreach force last reported near highcrest two hours ago.",
    data: {
      locationKnown: true,
      nodeId: "highcrest",
    },
  });

  addPlayerKnowledge({
    playerId: "player-roderic",
    subjectId: "eastvale-private-secret",
    kind: "event",
    observedAt: now,
    deliveredAt: now,
    source: "system",
    confidence: "confirmed",
    summary: "EASTVALE_ONLY_SECRET",
    data: {},
  });

  const rodericContext = buildLlmPlayerContext(
    "player-roderic",
    "NORMAL_COMMAND_WINDOW"
  );
  const garranContext = buildLlmPlayerContext(
    "player-garran",
    "NORMAL_COMMAND_WINDOW"
  );

  assert.ok(rodericContext);
  assert.ok(garranContext);

  const rodericText = JSON.stringify(rodericContext);
  const garranText = JSON.stringify(garranContext);

  assert.equal(rodericText.includes("army-eastvale-roderic"), true);
  assert.equal(rodericText.includes("EASTVALE_ONLY_SECRET"), true);
  assert.equal(garranText.includes("EASTVALE_ONLY_SECRET"), false);

  const knownEnemyText = JSON.stringify(rodericContext.knownEnemyForces);
  assert.equal(knownEnemyText.includes("activeMovements"), false);
  assert.equal(knownEnemyText.includes("estimatedArrivalAt"), false);
  assert.equal(knownEnemyText.includes("routeNodeIds"), false);

  console.log("PASS P5-01/02/13: player-safe isolated context");

  // =====================================================
  // P5-03 / P5-04 — AUTHORIZATION + WINDOW
  // =====================================================

  const crossPlayer = issuePlayerArmyMove(
    SESSION_ID,
    "player-edwyn",
    "army-eastvale-roderic",
    "greenharbor"
  );
  assert.equal(crossPlayer.ok, false);

  const wrongWindow = issuePlayerArmyMove(
    SESSION_ID,
    "player-roderic",
    "army-eastvale-roderic",
    "greenharbor"
  );
  assert.equal(wrongWindow.ok, false);

  console.log("PASS P5-03/04: authorization and command-window safety");

  // =====================================================
  // P5-10 — KNOWLEDGE-SAFE INTERCEPT
  // =====================================================

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      commandCycle: {
        ...current.session.commandCycle,
        phase: "planning",
        requiredPlayerIds: ["player-roderic"],
        readyPlayerIds: [],
        currentPlayerId: "player-roderic",
      },
    },
  }));

  setEntityPosition("army-eastvale-roderic", {
    kind: "node",
    nodeId: "eastkeep",
  });

  const intercept = issuePlayerInterception(
    SESSION_ID,
    "player-roderic",
    "army-eastvale-roderic",
    "army-northreach-edwyn"
  );

  assert.equal(intercept.ok, true);
  if (intercept.ok) {
    assert.equal(intercept.order.type, "intercept_army");
    assert.equal("interceptNodeId" in intercept.order.payload, true);
    if (
      intercept.order.type === "intercept_army" &&
      "interceptNodeId" in intercept.order.payload
    ) {
      assert.equal(intercept.order.payload.interceptNodeId, "highcrest");
      assert.ok(intercept.order.payload.knowledgeFactId);
    }
  }

  console.log("PASS P5-10: intercept destination derived from delivered knowledge");

  // =====================================================
  // P5-09 — BATTLE CRISIS ACTIVATION ROUTING
  // =====================================================

  openCommandInterrupt({
    type: "BATTLE_CRISIS",
    affectedPlayerIds: ["player-roderic"],
    message: "A battle crisis requires a player decision.",
  });

  const crisisActivation = getCurrentLlmActivation();
  assert.ok(crisisActivation);
  assert.equal(crisisActivation.playerId, "player-roderic");
  assert.equal(crisisActivation.reason, "BATTLE_CRISIS");

  console.log("PASS P5-09: battle crisis activates only the affected LLM player");

  // =====================================================
  // P5-11 — PACKAGE 4 NPC CONVERSATION THROUGH PLAYER TOOL SURFACE
  // =====================================================

  setCharacterPresenceContext({
    id: "p5-roderic-council",
    kind: "council",
    characterIds: ["king_roderic", "lord_theon"],
    active: true,
    referenceId: "eastvale-council",
  });

  const nearbyTalk = await executeLlmPlayerAction(
    SESSION_ID,
    "player-roderic",
    {
      tool: "talk_to_character",
      args: {
        character_id: "lord_theon",
        text: "What do you advise?",
      },
    }
  );
  assert.equal(nearbyTalk.ok, true);

  const remoteTalk = await executeLlmPlayerAction(
    SESSION_ID,
    "player-roderic",
    {
      tool: "talk_to_character",
      args: {
        character_id: "lord_merek",
        text: "Can you hear me?",
      },
    }
  );
  assert.equal(remoteTalk.ok, false);

  const openConversation = Object.values(
    getRuntimeWorldState().session.conversations
  ).find(
    (conversation) =>
      conversation.status === "open" &&
      conversation.controllerPlayerId === "player-roderic"
  );

  if (openConversation) {
    const closeTalk = await executeLlmPlayerAction(
      SESSION_ID,
      "player-roderic",
      {
        tool: "end_conversation",
        args: {
          conversation_id: openConversation.id,
        },
      }
    );
    assert.equal(closeTalk.ok, true);
  }

  console.log("PASS P5-11: LLM uses Package 4 conversation presence rules");

  // Reset order state for clean autonomous round.
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      orders: {},
    },
  }));

  // =====================================================
  // P5-05/06/08/12 — AI-ONLY AUTONOMOUS COMMAND ROUND
  // =====================================================

  /*
   * P5-06 explicitly tests the "LLM has enough resources"
   * branch. The normal demo balance intentionally starts
   * Eastkeep below the 700 gold infantry recruitment cost,
   * so make the test precondition explicit instead of
   * weakening production recruitment validation.
   */
  updateRuntimeWorldState((current) => ({
    ...current,
    settlements: {
      ...current.settlements,
      eastkeep: {
        ...current.settlements.eastkeep,
        resources: {
          ...current.settlements.eastkeep.resources,
          gold: 1000,
          food: 1000,
          metal: 200,
        },
      },
    },
  }));

  configureAllActivePlayersAsLlm();

  const autonomous = await runPendingLlmCommandWindows(fakeAdapter, 10);

  assert.equal(autonomous.length, 5);
  assert.equal(autonomous.every((result) => result.ok), true);
  assert.equal(getRuntimeWorldState().session.commandCycle.phase, "executing");

  const decisions = getRuntimeWorldState().session.llmPlayers.decisions;
  assert.equal(decisions.length >= 5, true);

  const rodericDecision = decisions.find(
    (decision) => decision.playerId === "player-roderic"
  );
  assert.ok(rodericDecision);

  const invalidRecovery = rodericDecision.actionResults.find(
    (result) =>
      result.tool === "issue_army_move" &&
      result.ok === false
  );
  const legalMove = rodericDecision.actionResults.find(
    (result) =>
      result.tool === "issue_army_move" &&
      result.ok === true
  );

  assert.ok(invalidRecovery);
  assert.ok(legalMove);

  const recruitmentResult = rodericDecision.actionResults.find(
    (result) => result.tool === "recruit_units"
  );
  assert.ok(recruitmentResult);
  assert.equal(recruitmentResult.ok, true);
  assert.equal(Object.keys(getRuntimeWorldState().recruitmentOrders).length > 0, true);

  console.log("PASS P5-05/06/08/12: bounded AI-only command cycle and invalid recovery");

  // =====================================================
  // P5-07 — PHYSICAL MOVEMENT AFTER NORMAL EXECUTION
  // =====================================================

  executeQueuedStrategicOrders();

  const activeMovements = getRuntimeWorldState().simulation.activeMovements;
  assert.ok(activeMovements["army-northreach-edwyn"]);
  assert.ok(activeMovements["army-eastvale-roderic"]);

  assert.deepEqual(
    getRuntimeWorldState().simulation.entityPositions["army-eastvale-roderic"],
    {
      kind: "node",
      nodeId: "eastkeep",
    }
  );

  console.log("PASS P5-07: LLM movement creates physical ActiveMovement, no teleport");

  // =====================================================
  // P5-14 — PLAN PERSISTENCE / SERIALIZATION FOUNDATION
  // =====================================================

  const rodericPlanId =
    getRuntimeWorldState().session.llmPlayers.activePlanByPlayerId[
      "player-roderic"
    ];
  assert.ok(rodericPlanId);
  assert.equal(
    getRuntimeWorldState().session.llmPlayers.plans[rodericPlanId].goal,
    "BUILD_ARMY"
  );

  const serialized = JSON.stringify(getRuntimeWorldState().session.llmPlayers);
  const parsed = JSON.parse(serialized) as {
    plans: Record<string, { goal: string }>;
  };
  assert.equal(parsed.plans[rodericPlanId].goal, "BUILD_ARMY");

  console.log("PASS P5-14: LLM plan/runtime state is plain serializable state");

  console.log("");
  console.log("PACKAGE 5 AUTONOMOUS LLM PLAYERS MVP: PASS");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
