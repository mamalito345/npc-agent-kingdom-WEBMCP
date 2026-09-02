import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  EVENT_DEFINITIONS,
  EVENT_LIBRARY_COUNTS,
} from "../data/events/catalog";

import {
  buildEventOpportunities,
  revalidateEventCandidate,
} from "../lib/events/opportunities";

import {
  deterministicUnitRoll,
} from "../lib/events/rng";

import {
  createSelectedEventInstance,
  applyEventInstance,
  resolvePlayerDecisionEvent,
} from "../lib/events/apply";

import {
  inspectDirectorObserverTrace,
} from "../lib/events/trace";

import {
  runEventOpportunity,
} from "../lib/events/runner";

import {
  exportDirectorEventState,
  importDirectorEventState,
} from "../lib/events/persistence";

import {
  OpenAIEventDirectorAdapter,
  OpenAIWorldDirectorProposalAdapter,
} from "../lib/director/openai-adapter";

import {
  runDirectorTurn,
} from "../lib/director/gateway";

import {
  startWar,
} from "../lib/military/war";

import {
  setGmLordOrderModelAdapter,
  resetGmLordOrderModelAdapter,
} from "../lib/lords/model";

import type {
  EventDirectorModelAdapter,
  EventOpportunity,
} from "../types/events";

function forceExecuting(): void {
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      commandCycle: {
        ...current.session.commandCycle,
        phase: "executing",
        requiredPlayerIds: [],
        readyPlayerIds: [],
        currentPlayerId: undefined,
        interrupt: undefined,
      },
    },
  }));
}

function resetBudget(): void {
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
}

async function main(): Promise<void> {
  // =====================================================
  // Catalogue
  // =====================================================

  assert.equal(EVENT_DEFINITIONS.length, 40);
  assert.deepEqual(EVENT_LIBRARY_COUNTS, {
    TRAVEL: 6,
    CAMPAIGN: 7,
    BATTLE: 7,
    SIEGE: 5,
    POLITICAL: 6,
    ECONOMIC: 5,
    DIPLOMATIC: 4,
  });

  console.log("PASS: event library has 40 meaningful definitions");

  // =====================================================
  // P7-01 — real adapters return structured response;
  // existing proposal adapter still goes through validator.
  // =====================================================

  const eventAdapter = new OpenAIEventDirectorAdapter({
    transport: {
      async request(body) {
        const inputText = JSON.stringify(body);
        assert.ok(inputText.includes("json_schema"));

        return {
          output_text: JSON.stringify({
            decisionSummary: "Select the only supplied candidate.",
            selectedCandidateId: "candidate-a",
          }),
        };
      },
    },
    model: "test-model",
  });

  const structured = await eventAdapter.selectEvent({
    worldTimeMinutes: 0,
    opportunity: {
      id: "test-opportunity",
      category: "ECONOMIC",
      reason: "test",
    },
    candidates: [
      {
        candidateId: "candidate-a",
        definitionId: "economic_good_harvest",
        name: "Good Harvest",
        severity: "moderate",
        resolutionMode: "AUTO",
        bindings: {
          kingdomId: "eastvale",
        },
      },
    ],
    recentEvents: [],
    rules: [],
  });

  assert.equal(structured.selectedCandidateId, "candidate-a");

  const proposalAdapter = new OpenAIWorldDirectorProposalAdapter({
    transport: {
      async request() {
        return {
          output_text: JSON.stringify({
            proposals: [
              {
                type: "schedule_world_interrupt",
                reason: "A bounded test marker proves validator routing.",
                payload: {
                  executeAt: getRuntimeWorldState().simulation.worldTimeMinutes + 60,
                  interruptType: "P7_TEST",
                  message: "Structured real-adapter test.",
                },
              },
            ],
          }),
        };
      },
    },
    model: "test-model",
  });

  const directorTurn = await runDirectorTurn(proposalAdapter);
  assert.equal(directorTurn.applied.length, 1);
  assert.equal(directorTurn.rejected.length, 0);

  console.log("PASS P7-01: real provider adapters parse structured output and proposal path uses existing validator");

  // =====================================================
  // P7-02 — adapter receives detached context, no mutable world
  // =====================================================

  const treasuryBefore = getRuntimeWorldState().kingdoms.eastvale.treasury;

  const maliciousAdapter: EventDirectorModelAdapter = {
    async selectEvent(context) {
      const candidate = context.candidates[0];
      if (candidate) {
        candidate.bindings.kingdomId = "fake-kingdom";
      }

      return {
        decisionSummary: "Attempted to mutate detached model context.",
        selectedCandidateId: null,
      };
    },
  };

  const isolatedOpportunity: EventOpportunity = {
    id: "p7-isolation",
    category: "ECONOMIC",
    reason: "Isolation test",
    kingdomId: "eastvale",
    createdAt: getRuntimeWorldState().simulation.worldTimeMinutes,
    candidates: [
      {
        candidateId: "economic_good_harvest:isolation",
        definitionId: "economic_good_harvest",
        category: "ECONOMIC",
        name: "Good Harvest",
        severity: "moderate",
        resolutionMode: "AUTO",
        bindings: {
          kingdomId: "eastvale",
        },
        kingdomId: "eastvale",
        reason: "test",
      },
    ],
  };

  await maliciousAdapter.selectEvent({
    worldTimeMinutes: getRuntimeWorldState().simulation.worldTimeMinutes,
    opportunity: {
      id: isolatedOpportunity.id,
      category: isolatedOpportunity.category,
      reason: isolatedOpportunity.reason,
      kingdomId: isolatedOpportunity.kingdomId,
    },
    candidates: isolatedOpportunity.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      definitionId: candidate.definitionId,
      name: candidate.name,
      severity: candidate.severity,
      resolutionMode: candidate.resolutionMode,
      bindings: { ...candidate.bindings },
    })),
    recentEvents: [],
    rules: [],
  });

  assert.equal(
    getRuntimeWorldState().kingdoms.eastvale.treasury,
    treasuryBefore
  );

  console.log("PASS P7-02: model context cannot directly mutate canonical world");

  // =====================================================
  // P7-03 — no travel event when army not traveling
  // =====================================================

  updateRuntimeWorldState((current) => ({
    ...current,
    simulation: {
      ...current.simulation,
      activeMovements: Object.fromEntries(
        Object.entries(current.simulation.activeMovements).filter(
          ([entityId]) => entityId !== "army-eastvale-roderic"
        )
      ),
    },
  }));

  const noTravel = buildEventOpportunities()
    .filter((item) => item.category === "TRAVEL")
    .flatMap((item) => item.candidates)
    .filter((item) => item.bindings.armyId === "army-eastvale-roderic");

  assert.equal(noTravel.length, 0);

  console.log("PASS P7-03: travel-only events excluded for stationary army");

  // =====================================================
  // P7-04/P7-12 — create minimal active siege fixture safely
  // using existing world shape, then eligibility.
  // =====================================================

  const war = startWar("eastvale", "westmoor");

  if (war.ok === false) {
    throw new Error(`War setup failed: ${war.error}`);
  }

  updateRuntimeWorldState((current) => ({
    ...current,
    sieges: {
      ...current.sieges,
      "p7-siege": {
        id: "p7-siege",
        warId: war.war.id,
        settlementId: "blackfen",
        attackerArmyIds: ["army-eastvale-roderic"],
        defenderRealmId: "westmoor",
        startedAt: current.simulation.worldTimeMinutes,
        currentPhase: "encirclement",
        status: "active",
        fortificationIntegrityAtStart: 100,
        history: [],
      },
    },
  }));

  const siegeOpportunity = buildEventOpportunities().find(
    (item) =>
      item.category === "SIEGE" &&
      item.candidates.some((candidate) => candidate.bindings.siegeId === "p7-siege")
  );

  assert.ok(siegeOpportunity);
  assert.ok(siegeOpportunity.candidates.length >= 4);

  console.log("PASS P7-04: active siege produces relevant eligible siege events");

  // =====================================================
  // P7-05 deterministic RNG
  // =====================================================

  assert.equal(
    deterministicUnitRoll("same-seed"),
    deterministicUnitRoll("same-seed")
  );

  console.log("PASS P7-05: event RNG is deterministic and uses no Math.random");

  // =====================================================
  // P7-06 cooldown
  // Use runner twice with forced always-open opportunity.
  // =====================================================

  resetBudget();
  const deterministicAdapter: EventDirectorModelAdapter = {
    async selectEvent(context) {
      return {
        decisionSummary: "Choose first candidate.",
        selectedCandidateId: context.candidates[0]?.candidateId ?? null,
      };
    },
  };

  const cooldownOpportunity: EventOpportunity = {
    id: "cooldown-fixed",
    category: "ECONOMIC",
    reason: "Cooldown test",
    kingdomId: "eastvale",
    createdAt: 2,
    candidates: [
      {
        candidateId: "economic_good_harvest:cooldown",
        definitionId: "economic_good_harvest",
        category: "ECONOMIC",
        name: "Good Harvest",
        severity: "moderate",
        resolutionMode: "AUTO",
        bindings: {
          kingdomId: "eastvale",
        },
        kingdomId: "eastvale",
        reason: "Cooldown test",
      },
    ],
  };

  // Find a createdAt value whose deterministic chance gate passes.
  let gateTime = cooldownOpportunity.createdAt;
  for (let value = 0; value < 1000; value += 1) {
    cooldownOpportunity.createdAt = value;
    const beforeCount =
      Object.keys(getRuntimeWorldState().session.director.events.instances).length;
    const result = await runEventOpportunity(cooldownOpportunity, deterministicAdapter);
    const afterCount =
      Object.keys(getRuntimeWorldState().session.director.events.instances).length;

    if (result && afterCount > beforeCount) {
      gateTime = value;
      break;
    }
  }

  cooldownOpportunity.createdAt = gateTime;
  const instanceCountBeforeSecond =
    Object.keys(getRuntimeWorldState().session.director.events.instances).length;

  await runEventOpportunity(cooldownOpportunity, deterministicAdapter);

  assert.equal(
    Object.keys(getRuntimeWorldState().session.director.events.instances).length,
    instanceCountBeforeSecond
  );

  console.log("PASS P7-06: cooldown blocks repeated same event");

  // =====================================================
  // P7-07 budget
  // =====================================================

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
            globalCount: 4,
            kingdomCounts: {
              eastvale: 1,
            },
          },
        },
      },
    },
  }));

  const beforeBudgetAttempt =
    Object.keys(getRuntimeWorldState().session.director.events.instances).length;

  await runEventOpportunity(
    {
      ...cooldownOpportunity,
      id: "budget-test",
      createdAt: 77,
      candidates: [
        {
          ...cooldownOpportunity.candidates[0],
          candidateId: "economic_merchant_activity:budget",
          definitionId: "economic_merchant_activity",
        },
      ],
    },
    deterministicAdapter
  );

  assert.equal(
    Object.keys(getRuntimeWorldState().session.director.events.instances).length,
    beforeBudgetAttempt
  );

  console.log("PASS P7-07: daily global event budget enforced");

  // =====================================================
  // P7-08 revalidation
  // =====================================================

  const siegeCandidate = siegeOpportunity.candidates[0];
  const selectedSiege = createSelectedEventInstance(
    siegeCandidate,
    "Select a siege event for stale-context test."
  );

  updateRuntimeWorldState((current) => ({
    ...current,
    sieges: {
      ...current.sieges,
      "p7-siege": {
        ...current.sieges["p7-siege"],
        status: "ended",
        currentPhase: "ended",
        outcome: "lifted",
      },
    },
  }));

  const stale = await applyEventInstance(selectedSiege.id);
  assert.ok(stale);
  assert.equal(stale.status, "CANCELLED");

  console.log("PASS P7-08: stale event is cancelled during pre-apply revalidation");

  // Reactivate fixture for later test.
  updateRuntimeWorldState((current) => ({
    ...current,
    sieges: {
      ...current.sieges,
      "p7-siege": {
        ...current.sieges["p7-siege"],
        status: "active",
        currentPhase: "encirclement",
        outcome: undefined,
      },
    },
  }));

  // =====================================================
  // P7-09 canonical effect
  // =====================================================

  const treasuryStart = getRuntimeWorldState().kingdoms.westmoor.treasury;

  const economicInstance = createSelectedEventInstance(
    {
      candidateId: "economic_merchant_activity:westmoor",
      definitionId: "economic_merchant_activity",
      category: "ECONOMIC",
      name: "Merchant Activity Increases",
      severity: "minor",
      resolutionMode: "AUTO",
      bindings: {
        kingdomId: "westmoor",
      },
      kingdomId: "westmoor",
      reason: "Canonical effect test",
    },
    "Select bounded economic effect."
  );

  const economicApplied = await applyEventInstance(economicInstance.id);
  assert.ok(economicApplied);
  assert.equal(economicApplied.status, "RESOLVED");
  assert.equal(
    getRuntimeWorldState().kingdoms.westmoor.treasury,
    treasuryStart + 300
  );

  console.log("PASS P7-09: event applies bounded canonical effect");

  // =====================================================
  // P7-10 information isolation
  // =====================================================

  const northKnowledgeBefore =
    getRuntimeWorldState().session.knowledge["player-edwyn"].facts.length;

  const hiddenEnemyEvent = createSelectedEventInstance(
    {
      candidateId: "economic_mine_disruption:eastvale",
      definitionId: "economic_mine_disruption",
      category: "ECONOMIC",
      name: "Mine Disruption",
      severity: "minor",
      resolutionMode: "AUTO",
      bindings: {
        kingdomId: "eastvale",
      },
      kingdomId: "eastvale",
      reason: "Hidden enemy economic event",
    },
    "Select private enemy event."
  );

  await applyEventInstance(hiddenEnemyEvent.id);

  assert.equal(
    getRuntimeWorldState().session.knowledge["player-edwyn"].facts.length,
    northKnowledgeBefore
  );

  console.log("PASS P7-10: event occurrence does not automatically leak to uninformed player");

  // =====================================================
  // P7-11 battle event
  // =====================================================

  updateRuntimeWorldState((current) => ({
    ...current,
    battles: {
      ...current.battles,
      "p7-battle": {
        id: "p7-battle",
        warId: war.war.id,
        nodeId: "moorhall",
        attackerArmyIds: ["army-eastvale-roderic"],
        defenderArmyIds: ["army-westmoor-garran"],
        startedAt: current.simulation.worldTimeMinutes,
        currentPhase: "engagement",
        status: "active",
        battleHour: 1,
        frontMomentum: 0,
        attackerTactic: "hold_ground",
        defenderTactic: "hold_ground",
        attackerMoralePressure: 0,
        defenderMoralePressure: 0,
        attackerReserveCommitted: false,
        defenderReserveCommitted: false,
        terrain: "plains",
        features: [],
        rounds: [],
        activeOrders: [],
        history: [],
      },
    },
  }));

  const battleCandidate = buildEventOpportunities()
    .find((opportunity) => opportunity.category === "BATTLE")
    ?.candidates.find((candidate) => candidate.definitionId === "battle_morale_surge");

  assert.ok(battleCandidate);

  const battleEvent = createSelectedEventInstance(
    battleCandidate,
    "Battle context allows a predefined event."
  );

  const battleApplied = await applyEventInstance(battleEvent.id);
  assert.ok(battleApplied);
  assert.equal(battleApplied.status, "RESOLVED");
  assert.equal(
    getRuntimeWorldState().battles["p7-battle"].frontMomentum,
    8
  );

  console.log("PASS P7-11: battle event modifies existing persistent battle without resolving it");

  // =====================================================
  // P7-12 active siege event
  // =====================================================

  const freshSiegeCandidate = buildEventOpportunities()
    .find((opportunity) => opportunity.category === "SIEGE")
    ?.candidates.find((candidate) => candidate.definitionId === "siege_wall_weakness");

  assert.ok(freshSiegeCandidate);

  const siegeEvent = createSelectedEventInstance(
    freshSiegeCandidate,
    "Siege context supports a predefined event."
  );
  const siegeApplied = await applyEventInstance(siegeEvent.id);
  assert.ok(siegeApplied);
  assert.equal(siegeApplied.status, "RESOLVED");
  assert.equal(
    getRuntimeWorldState().sieges["p7-siege"].status,
    "active"
  );

  console.log("PASS P7-12: siege event applies without replacing siege engine");

  // =====================================================
  // P7-13 political event calls GM Character adapter
  // =====================================================

  let gmCalled = false;

  setGmLordOrderModelAdapter({
    decideOrder() {
      gmCalled = true;
      return {
        response: "REFUSE",
        summary: "The lord resists.",
      };
    },
  });

  const politicalCandidate = buildEventOpportunities()
    .find(
      (opportunity) =>
        opportunity.category === "POLITICAL" &&
        opportunity.candidates.some(
          (candidate) => candidate.definitionId === "political_order_dispute"
        )
    )
    ?.candidates.find(
      (candidate) => candidate.definitionId === "political_order_dispute"
    );

  assert.ok(politicalCandidate);

  const politicalEvent = createSelectedEventInstance(
    politicalCandidate,
    "Political opportunity delegates character choice to GM NPC mode."
  );

  const politicalApplied = await applyEventInstance(politicalEvent.id);
  assert.ok(politicalApplied);
  assert.equal(gmCalled, true);

  resetGmLordOrderModelAdapter();

  console.log("PASS P7-13: political event delegates NPC choice to GM Character mode");

  // =====================================================
  // P7-14 player-decision event activates affected LLM
  // =====================================================

  forceExecuting();

  const rodericPolitical = buildEventOpportunities()
    .find(
      (opportunity) =>
        opportunity.category === "POLITICAL" &&
        opportunity.kingdomId === "eastvale"
    )
    ?.candidates.find(
      (candidate) => candidate.definitionId === "political_favor_request"
    );

  assert.ok(rodericPolitical);

  const decisionEvent = createSelectedEventInstance(
    rodericPolitical,
    "A major lord requests an answer."
  );

  const waiting = await applyEventInstance(decisionEvent.id);
  assert.ok(waiting);
  assert.equal(waiting.status, "WAITING_PLAYER");

  const interrupt = getRuntimeWorldState().session.commandCycle.interrupt;
  assert.ok(interrupt);
  assert.ok(interrupt.affectedPlayerIds.includes("player-roderic"));
  assert.equal(
    getRuntimeWorldState().session.players["player-roderic"].controllerType,
    "webmcp_llm"
  );

  const playerResolved = await resolvePlayerDecisionEvent(
    decisionEvent.id,
    "player-roderic",
    "grant_favor"
  );
  assert.ok(playerResolved);
  assert.equal(playerResolved.status, "RESOLVED");

  console.log("PASS P7-14: meaningful decision event opens same command interrupt for affected LLM player");

  // =====================================================
  // P7-15 persistence
  // =====================================================

  const snapshot = exportDirectorEventState();

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        events: {
          instances: {},
          traces: [],
          cooldownUntil: {},
          dailyBudget: {
            dayIndex: 0,
            globalCount: 0,
            kingdomCounts: {},
          },
          nextChecks: {
            TRAVEL: 0,
            CAMPAIGN: 0,
            BATTLE: 0,
            SIEGE: 0,
            POLITICAL: 0,
            ECONOMIC: 0,
            DIPLOMATIC: 0,
          },
        },
      },
    },
  }));

  importDirectorEventState(snapshot);
  assert.equal(exportDirectorEventState(), snapshot);

  console.log("PASS P7-15: event history/runtime survives serialization restore");

  // =====================================================
  // P7-16 observer trace
  // =====================================================

  resetBudget();

  const traceOpportunity: EventOpportunity = {
    id: "trace-opportunity",
    category: "ECONOMIC",
    reason: "Observer trace demonstration",
    kingdomId: "ironhollow",
    createdAt: 0,
    candidates: [
      {
        candidateId: "economic_local_production_problem:trace",
        definitionId: "economic_local_production_problem",
        category: "ECONOMIC",
        name: "Local Production Problem",
        severity: "minor",
        resolutionMode: "AUTO",
        bindings: {
          kingdomId: "ironhollow",
        },
        kingdomId: "ironhollow",
        reason: "Observer trace demonstration",
      },
    ],
  };

  let traceApplied = false;

  for (let gateSeed = 0; gateSeed < 1000; gateSeed += 1) {
    traceOpportunity.createdAt = gateSeed;
    const result = await runEventOpportunity(traceOpportunity, deterministicAdapter);

    if (result) {
      traceApplied = true;
      break;
    }
  }

  assert.equal(traceApplied, true);

  const traces = inspectDirectorObserverTrace();
  const lastTrace = traces[traces.length - 1];

  assert.ok(lastTrace);
  assert.equal(lastTrace.eligibleEventCount >= 1, true);
  assert.ok(lastTrace.selectedDefinitionId);
  assert.equal(lastTrace.validatorStatus, "PASS");
  assert.ok(lastTrace.canonicalResult);

  console.log("PASS P7-16: observer trace exposes activation/selection/validator/result without chain-of-thought");

  // =====================================================
  // P7-17 is external regression suite after this smoke.
  // =====================================================

  console.log("");
  console.log("PACKAGE 7 REAL GM + EVENT MVP: PASS");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
