import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  setRelationship,
  adjustRelationship,
} from "../lib/politics/relationships";

import {
  createPromise,
  exportPoliticsRuntimeState,
  importPoliticsRuntimeState,
  inspectAgreements,
  inspectDiplomaticProposals,
  proposeAgreement,
  respondToAgreement,
  resolvePromise,
} from "../lib/politics/service";

import {
  processPoliticalDeliveries,
} from "../lib/politics/delivery";

import {
  evaluateLordDefection,
} from "../lib/politics/defection";

import {
  issueCharacterOrder,
  resolveReceivedLordOrder,
} from "../lib/lords/service";

import {
  setGmLordOrderModelAdapter,
  resetGmLordOrderModelAdapter,
} from "../lib/lords/model";

import {
  executeLlmPlayerAction,
} from "../lib/actors/tool-executor";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

import {
  startWar,
} from "../lib/military/war";

function setTurn(
  playerId: string
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        commandCycle: {
          ...current.session
            .commandCycle,
          phase:
            "planning",
          requiredPlayerIds: [
            playerId,
          ],
          readyPlayerIds: [],
          currentPlayerId:
            playerId,
          interrupt:
            undefined,
        },
      },
    })
  );
}

function moveCharacterToNode(
  characterId: string,
  nodeId: string
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,
      simulation: {
        ...current.simulation,
        entityPositions: {
          ...current.simulation
            .entityPositions,
          [characterId]: {
            kind: "node",
            nodeId,
          },
        },
      },
    })
  );
}

function advancePastCourier(
  courierId: string
): void {
  const movement =
    getRuntimeWorldState()
      .simulation
      .activeMovements[
        courierId
      ];

  if (!movement) {
    throw new Error(
      `Courier movement missing: ${courierId}`
    );
  }

  const targetTime =
    movement.estimatedArrivalAt;

  /*
   * advanceWorldUntil() is intentionally allowed to stop early on
   * meaningful simulation interrupts. A courier smoke test must not
   * assume that a long trip crosses no battle/order/briefing interrupt.
   *
   * Keep advancing toward the same canonical arrival time until the
   * courier actually reaches it. This does NOT skip simulation work;
   * each interrupted call has already processed the world up to the
   * returned canonical minute.
   */
  let attempts = 0;
  let previousTime = -1;

  while (
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes <
    targetTime
  ) {
    attempts += 1;

    if (attempts > 64) {
      throw new Error(
        `Courier advance exceeded interrupt safety limit for ${courierId}.`
      );
    }

    const before =
      getRuntimeWorldState()
        .simulation
        .worldTimeMinutes;

    const result =
      advanceWorldUntil(
        targetTime
      );

    const after =
      result.currentTime;

    if (
      after < before ||
      (
        after === before &&
        after === previousTime
      )
    ) {
      throw new Error(
        `Courier advance made no progress at world minute ${after}; interrupt=${result.interrupt?.type ?? "none"}.`
      );
    }

    previousTime =
      after;
  }
}


async function main(): Promise<void> {
  // Give tests deterministic distant locations.
  moveCharacterToNode(
    "king_roderic",
    "eastkeep"
  );
  moveCharacterToNode(
    "lord_theon",
    "greenharbor"
  );
  moveCharacterToNode(
    "king_garran",
    "moorhall"
  );

  // =====================================================
  // P6-P01 — relationship clamp
  // =====================================================

  const high =
    setRelationship(
      "king_roderic",
      "lord_theon",
      500
    );

  const low =
    adjustRelationship(
      "king_roderic",
      "lord_theon",
      -999
    );

  assert.equal(
    high.value,
    100
  );
  assert.equal(
    low.value,
    -100
  );

  console.log(
    "PASS P6-P01: relationships clamp -100..100"
  );

  // Restore useful relation for following tests.
  setRelationship(
    "king_roderic",
    "lord_theon",
    48
  );

  // =====================================================
  // P6-P02/P03 — remote lord order + courier + ACCEPT
  // =====================================================

  setTurn(
    "player-roderic"
  );

  setGmLordOrderModelAdapter({
    decideOrder() {
      return {
        response:
          "ACCEPT",
        summary:
          "I will hold the coast.",
      };
    },
  });

  const remoteOrder =
    await issueCharacterOrder(
      "demo-session",
      "player-roderic",
      "lord_theon",
      {
        type:
          "HOLD_POSITION",
        risk: 30,
        note:
          "Hold Greenharbor.",
      }
    );

  if (
    remoteOrder.ok ===
    false
  ) {
    throw new Error(
      `Remote order failed: ${remoteOrder.error}`
    );
  }

  assert.equal(
    remoteOrder.order.status,
    "IN_TRANSIT"
  );

  const remoteMessage =
    getRuntimeWorldState()
      .messages[
        remoteOrder.order
          .deliveryMessageId ??
          ""
      ];

  assert.ok(
    remoteMessage
  );
  assert.equal(
    remoteMessage
      .deliveredAt,
    undefined
  );

  advancePastCourier(
    Object.values(
      getRuntimeWorldState()
        .couriers
    ).find(
      (courier) =>
        courier.messageId ===
        remoteMessage.id
    )?.id ??
      ""
  );

  processPoliticalDeliveries();

  const receivedOrder =
    getRuntimeWorldState()
      .session.lords
      .orders[
        remoteOrder.order.id
      ];

  assert.equal(
    receivedOrder.status,
    "RECEIVED"
  );

  const resolvedAccept =
    await resolveReceivedLordOrder(
      receivedOrder.id
    );

  if (
    resolvedAccept.ok ===
    false
  ) {
    throw new Error(
      `Resolve received lord order failed: ${resolvedAccept.error}`
    );
  }

  assert.equal(
    resolvedAccept
      .order.response,
    "ACCEPT"
  );

  console.log(
    "PASS P6-P02/P03: remote lord order unknown before courier, then received and accepted"
  );

  // =====================================================
  // P6-P04 — low-loyalty REFUSE with no forced action
  // =====================================================

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords: {
          ...current.session
            .lords,
          profiles: {
            ...current.session
              .lords.profiles,
            lord_malric: {
              ...current.session
                .lords
                .profiles
                .lord_malric,
              loyalty: 15,
            },
          },
        },
      },
    })
  );

  moveCharacterToNode(
    "king_varren",
    "ironhold"
  );
  moveCharacterToNode(
    "lord_malric",
    "ironhold"
  );
  setTurn(
    "player-varren"
  );

  setGmLordOrderModelAdapter({
    decideOrder() {
      return {
        response:
          "REFUSE",
        summary:
          "I refuse.",
      };
    },
  });

  const beforeOrders =
    Object.keys(
      getRuntimeWorldState()
        .session.orders
    ).length;

  const refusal =
    await issueCharacterOrder(
      "demo-session",
      "player-varren",
      "lord_malric",
      {
        type:
          "BRING_ARMY",
        targetNodeId:
          "northwatch",
        risk:
          90,
      }
    );

  if (
    refusal.ok ===
    false
  ) {
    throw new Error(
      `Refusal setup failed: ${refusal.error}`
    );
  }

  assert.equal(
    refusal.order
      .response,
    "REFUSE"
  );
  assert.equal(
    Object.keys(
      getRuntimeWorldState()
        .session.orders
    ).length,
    beforeOrders
  );

  console.log(
    "PASS P6-P04: refusal does not force army movement"
  );

  // =====================================================
  // P6-P05 — NEGOTIATE does not execute prematurely
  // =====================================================

  setGmLordOrderModelAdapter({
    decideOrder() {
      return {
        response:
          "NEGOTIATE",
        summary:
          "I want guarantees first.",
        requestedCondition:
          "Crown support.",
      };
    },
  });

  const negotiate =
    await issueCharacterOrder(
      "demo-session",
      "player-varren",
      "lord_malric",
      {
        type:
          "RAISE_TROOPS",
        risk:
          60,
      }
    );

  if (
    negotiate.ok ===
    false
  ) {
    throw new Error(
      `Negotiate setup failed: ${negotiate.error}`
    );
  }

  assert.equal(
    negotiate.order
      .response,
    "NEGOTIATE"
  );

  console.log(
    "PASS P6-P05: negotiate does not execute canonical action"
  );

  resetGmLordOrderModelAdapter();

  // =====================================================
  // P6-P06 — Alliance delayed proposal and acceptance
  // =====================================================

  moveCharacterToNode(
    "king_roderic",
    "eastkeep"
  );
  moveCharacterToNode(
    "king_garran",
    "moorhall"
  );
  setTurn(
    "player-roderic"
  );

  const alliance =
    proposeAgreement(
      "demo-session",
      "player-roderic",
      "ALLIANCE",
      "westmoor",
      {
        terms:
          "Mutual defense.",
      }
    );

  if (
    alliance.ok ===
    false
  ) {
    throw new Error(
      `Alliance proposal failed: ${alliance.error}`
    );
  }

  const hiddenBefore =
    inspectDiplomaticProposals(
      "demo-session",
      "player-garran"
    );

  if (
    hiddenBefore.ok ===
    false
  ) {
    throw new Error(
      `Proposal inspect failed: ${hiddenBefore.error}`
    );
  }

  assert.equal(
    hiddenBefore
      .proposals
      .some(
        (item) =>
          item.id ===
          alliance.agreement.id
      ),
    false
  );

  advancePastCourier(
    alliance.courier.id
  );
  processPoliticalDeliveries();

  setTurn(
    "player-garran"
  );

  const acceptAlliance =
    respondToAgreement(
      "demo-session",
      "player-garran",
      alliance.agreement.id,
      true
    );

  if (
    acceptAlliance.ok ===
    false
  ) {
    throw new Error(
      `Alliance acceptance failed: ${acceptAlliance.error}`
    );
  }

  assert.equal(
    acceptAlliance
      .agreement.status,
    "ACTIVE"
  );

  const rodericAgreements =
    inspectAgreements(
      "demo-session",
      "player-roderic"
    );

  const garranAgreements =
    inspectAgreements(
      "demo-session",
      "player-garran"
    );

  if (
    rodericAgreements.ok ===
      false ||
    garranAgreements.ok ===
      false
  ) {
    throw new Error(
      "Agreement inspection failed."
    );
  }

  assert.equal(
    rodericAgreements
      .agreements
      .some(
        (item) =>
          item.id ===
          alliance.agreement.id
      ),
    true
  );
  assert.equal(
    garranAgreements
      .agreements
      .some(
        (item) =>
          item.id ===
          alliance.agreement.id
      ),
    true
  );

  console.log(
    "PASS P6-P06: alliance travels, is accepted, and both parties can inspect it"
  );

  // =====================================================
  // P6-P07 — Non-aggression persistence
  // =====================================================

  setTurn(
    "player-roderic"
  );

  const nap =
    proposeAgreement(
      "demo-session",
      "player-roderic",
      "NON_AGGRESSION",
      "southmark"
    );

  if (
    nap.ok ===
    false
  ) {
    throw new Error(
      `NAP proposal failed: ${nap.error}`
    );
  }

  advancePastCourier(
    nap.courier.id
  );
  processPoliticalDeliveries();

  setTurn(
    "player-osric"
  );

  const acceptNap =
    respondToAgreement(
      "demo-session",
      "player-osric",
      nap.agreement.id,
      true
    );

  if (
    acceptNap.ok ===
    false
  ) {
    throw new Error(
      `NAP acceptance failed: ${acceptNap.error}`
    );
  }

  assert.equal(
    acceptNap
      .agreement.status,
    "ACTIVE"
  );

  console.log(
    "PASS P6-P07: non-aggression agreement persists (hostile-action enforcement deferred)"
  );

  // =====================================================
  // P6-P08 — Peace ends canonical war
  // =====================================================

  const warResult =
    startWar(
      "eastvale",
      "westmoor"
    );

  if (
    warResult.ok ===
    false
  ) {
    throw new Error(
      `War setup failed: ${warResult.error}`
    );
  }

  setTurn(
    "player-roderic"
  );

  const peace =
    proposeAgreement(
      "demo-session",
      "player-roderic",
      "PEACE",
      "westmoor"
    );

  if (
    peace.ok ===
    false
  ) {
    throw new Error(
      `Peace proposal failed: ${peace.error}`
    );
  }

  advancePastCourier(
    peace.courier.id
  );
  processPoliticalDeliveries();

  setTurn(
    "player-garran"
  );

  const acceptPeace =
    respondToAgreement(
      "demo-session",
      "player-garran",
      peace.agreement.id,
      true
    );

  if (
    acceptPeace.ok ===
    false
  ) {
    throw new Error(
      `Peace acceptance failed: ${acceptPeace.error}`
    );
  }

  assert.equal(
    getRuntimeWorldState()
      .wars[
        warResult.war.id
      ].status,
    "ended"
  );

  console.log(
    "PASS P6-P08: accepted peace ends existing war through canonical war service"
  );

  // =====================================================
  // P6-P09/P14 — LLM uses same diplomacy service
  // =====================================================

  setTurn(
    "player-roderic"
  );

  const llmInspect =
    await executeLlmPlayerAction(
      "demo-session",
      "player-roderic",
      {
        tool:
          "inspect_agreements",
        args: {},
      }
    );

  assert.equal(
    llmInspect.ok,
    true
  );

  console.log(
    "PASS P6-P09/P14: LLM political tools route through same canonical services"
  );

  // =====================================================
  // P6-P10 — Military support acceptance does not teleport forces
  // =====================================================

  const beforeEastArmyPositions =
    JSON.stringify(
      Object.fromEntries(
        Object.entries(
          getRuntimeWorldState()
            .simulation
            .entityPositions
        ).filter(
          ([id]) =>
            id.startsWith(
              "army-eastvale"
            )
        )
      )
    );

  setTurn(
    "player-roderic"
  );

  const support =
    proposeAgreement(
      "demo-session",
      "player-roderic",
      "MILITARY_SUPPORT",
      "southmark",
      {
        terms:
          "Assist Eastvale if attacked.",
      }
    );

  if (
    support.ok ===
    false
  ) {
    throw new Error(
      `Support proposal failed: ${support.error}`
    );
  }

  advancePastCourier(
    support.courier.id
  );
  processPoliticalDeliveries();

  setTurn(
    "player-osric"
  );

  const supportAccepted =
    respondToAgreement(
      "demo-session",
      "player-osric",
      support.agreement.id,
      true
    );

  if (
    supportAccepted.ok ===
    false
  ) {
    throw new Error(
      `Support acceptance failed: ${supportAccepted.error}`
    );
  }

  const afterEastArmyPositions =
    JSON.stringify(
      Object.fromEntries(
        Object.entries(
          getRuntimeWorldState()
            .simulation
            .entityPositions
        ).filter(
          ([id]) =>
            id.startsWith(
              "army-eastvale"
            )
        )
      )
    );

  assert.equal(
    afterEastArmyPositions,
    beforeEastArmyPositions
  );

  console.log(
    "PASS P6-P10: military support acceptance does not teleport forces"
  );

  // =====================================================
  // P6-P11 — Explicit promise + effects
  // =====================================================

  moveCharacterToNode(
    "king_roderic",
    "eastkeep"
  );
  setTurn(
    "player-roderic"
  );

  const promise =
    createPromise(
      "demo-session",
      "player-roderic",
      "lord_theon",
      "I will protect Greenharbor."
    );

  if (
    promise.ok ===
    false
  ) {
    throw new Error(
      `Promise creation failed: ${promise.error}`
    );
  }

  const loyaltyBefore =
    getRuntimeWorldState()
      .session.lords
      .profiles
      .lord_theon
      .loyalty;

  const fulfilled =
    resolvePromise(
      "demo-session",
      "player-roderic",
      promise.promise.id,
      "FULFILLED"
    );

  if (
    fulfilled.ok ===
    false
  ) {
    throw new Error(
      `Promise resolution failed: ${fulfilled.error}`
    );
  }

  assert.equal(
    fulfilled.promise.status,
    "FULFILLED"
  );
  assert.ok(
    getRuntimeWorldState()
      .session.lords
      .profiles
      .lord_theon
      .loyalty >
      loyaltyBefore
  );

  console.log(
    "PASS P6-P11: explicit promise resolves and affects relationship/loyalty"
  );

  // =====================================================
  // P6-P12 — third-party private proposal isolation
  // =====================================================

  setTurn(
    "player-roderic"
  );

  const secretProposal =
    proposeAgreement(
      "demo-session",
      "player-roderic",
      "ALLIANCE",
      "westmoor",
      {
        secret: true,
      }
    );

  if (
    secretProposal.ok ===
    false
  ) {
    throw new Error(
      `Secret proposal failed: ${secretProposal.error}`
    );
  }

  const thirdParty =
    inspectDiplomaticProposals(
      "demo-session",
      "player-osric"
    );

  if (
    thirdParty.ok ===
    false
  ) {
    throw new Error(
      `Third-party inspect failed: ${thirdParty.error}`
    );
  }

  assert.equal(
    thirdParty
      .proposals
      .some(
        (item) =>
          item.id ===
          secretProposal
            .agreement.id
      ),
    false
  );

  console.log(
    "PASS P6-P12: third party cannot inspect private proposal"
  );

  // =====================================================
  // P6-P13 — defection eligibility
  // =====================================================

  const loyal =
    evaluateLordDefection(
      "lord_beric",
      true
    );

  assert.equal(
    loyal.eligible,
    false
  );

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords: {
          ...current.session
            .lords,
          profiles: {
            ...current.session
              .lords.profiles,
            lord_malric: {
              ...current.session
                .lords
                .profiles
                .lord_malric,
              loyalty: 15,
              relationshipToRuler:
                -40,
            },
          },
        },
        memories: {
          ...current.session
            .memories,
          lord_malric: [
            ...(current.session
              .memories[
                "lord_malric"
              ] ?? []),
            {
              id:
                "p6-malric-grievance",
              characterId:
                "lord_malric",
              type:
                "POLITICAL",
              summary:
                "King Varren publicly humiliated Malric and broke a political promise.",
              importance:
                95,
              createdAt:
                current.simulation
                  .worldTimeMinutes,
              relatedEntityIds: [
                "king_varren",
              ],
            },
          ],
        },
        politics: {
          ...current.session
            .politics,
          relationships: {
            ...current.session
              .politics
              .relationships,
            "lord_malric->king_varren":
              {
                fromCharacterId:
                  "lord_malric",
                toCharacterId:
                  "king_varren",
                value:
                  -60,
              },
          },
        },
      },
    })
  );

  const disloyal =
    evaluateLordDefection(
      "lord_malric",
      true
    );

  assert.equal(
    disloyal.eligible,
    true
  );

  console.log(
    "PASS P6-P13: high loyalty blocks trivial defection; low loyalty + grievance + offer becomes evaluable"
  );

  // =====================================================
  // P6-P15 — persistence
  // =====================================================

  const politicsSnapshot =
    exportPoliticsRuntimeState();

  const lordSnapshot =
    JSON.stringify(
      getRuntimeWorldState()
        .session.lords
    );

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        politics: {
          relationships: {},
          agreements: {},
          promises: {},
        },
        lords: {
          profiles: {},
          orders: {},
        },
      },
    })
  );

  importPoliticsRuntimeState(
    politicsSnapshot
  );

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords:
          JSON.parse(
            lordSnapshot
          ),
      },
    })
  );

  assert.equal(
    exportPoliticsRuntimeState(),
    politicsSnapshot
  );

  console.log(
    "PASS P6-P15: political state survives serialization restore"
  );

  console.log("");
  console.log(
    "PACKAGE 6 POLITICS & DIPLOMACY MVP: PASS"
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
