import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  setCharacterPresenceContext,
} from "../lib/conversation/presence";

import {
  inspectKingdomLords,
  issueCharacterOrder,
  exportLordRuntimeState,
  importLordRuntimeState,
} from "../lib/lords/service";

import {
  executeLlmPlayerAction,
} from "../lib/actors/tool-executor";

async function main(): Promise<void> {
  const world =
    getRuntimeWorldState();

  // =====================================================
  // P6-L01 — 2 major GM-controlled lords per kingdom
  // =====================================================

  const profiles =
    Object.values(
      world.session
        .lords
        .profiles
    );

  const playerCharacterIds =
    new Set(
      Object.values(
        world.session
          .players
      ).map(
        (player) =>
          player.characterId
      )
    );

  for (
    const kingdomId
    of Object.keys(
      world.kingdoms
    )
  ) {
    const count =
      profiles.filter(
        (profile) =>
          profile.kingdomId ===
          kingdomId
      ).length;

    assert.ok(
      count >= 2 &&
      count <= 3,
      `${kingdomId} must have 2–3 major NPC lords`
    );
  }

  assert.equal(
    profiles.some(
      (profile) =>
        playerCharacterIds.has(
          profile.characterId
        )
    ),
    false
  );

  console.log(
    "PASS P6-L01: every kingdom has 2–3 GM-controlled major lords"
  );

  // =====================================================
  // P6-L02 — persistent profile completeness
  // =====================================================

  for (
    const profile
    of profiles
  ) {
    assert.ok(
      world.characters[
        profile.characterId
      ]
    );
    assert.ok(
      world.kingdoms[
        profile.kingdomId
      ]
    );
    assert.ok(
      world.settlements[
        profile.homeSettlementId
      ]
    );
    assert.equal(
      typeof profile.loyalty,
      "number"
    );
    assert.equal(
      typeof profile.relationshipToRuler,
      "number"
    );
    assert.equal(
      typeof profile.basicTraits.ambition,
      "number"
    );
    assert.equal(
      typeof profile.basicTraits.caution,
      "number"
    );
  }

  console.log(
    "PASS P6-L02: lord profiles contain kingdom/home/loyalty/relationship/traits"
  );

  // =====================================================
  // P6-L03/L04 — ruler/player direct order + GM Character decision
  // =====================================================

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        commandCycle: {
          ...current.session.commandCycle,
          phase: "planning",
          requiredPlayerIds: [
            "player-roderic",
          ],
          readyPlayerIds: [],
          currentPlayerId:
            "player-roderic",
          interrupt:
            undefined,
        },
      },
    })
  );

  setCharacterPresenceContext({
    id:
      "p6-eastvale-council",
    kind:
      "council",
    characterIds: [
      "king_roderic",
      "lord_theon",
    ],
    active: true,
    referenceId:
      "eastvale-council",
  });

  const directOrder =
    await issueCharacterOrder(
      "demo-session",
      "player-roderic",
      "lord_theon",
      {
        type:
          "HOLD_POSITION",
        risk: 35,
        note:
          "Hold Greenharbor while the crown army maneuvers.",
      }
    );

  if (
    directOrder.ok ===
    false
  ) {
    throw new Error(
      `Direct lord order failed: ${directOrder.error}`
    );
  }

  assert.equal(
    directOrder.order.status,
    "resolved"
  );

  assert.ok(
    directOrder.order.response
  );

  console.log(
    "PASS P6-L03/L04: own-lord order persists and is decided through GM Character lord mode"
  );

  // =====================================================
  // P6-L05 — LLM player same canonical lord action layer
  // =====================================================

  const inspectResult =
    await executeLlmPlayerAction(
      "demo-session",
      "player-roderic",
      {
        tool:
          "inspect_kingdom_lords",
        args: {},
      }
    );

  assert.equal(
    inspectResult.ok,
    true
  );

  const llmOrderResult =
    await executeLlmPlayerAction(
      "demo-session",
      "player-roderic",
      {
        tool:
          "issue_character_order",
        args: {
          lord_character_id:
            "lord_theon",
          order_type:
            "HOLD_POSITION",
          risk: 20,
          note:
            "Remain ready near Greenharbor.",
        },
      }
    );

  assert.equal(
    llmOrderResult.ok,
    true
  );

  console.log(
    "PASS P6-L05: LLM player inspects/issues lord orders through shared services"
  );

  // =====================================================
  // P6-L06 — cannot command foreign lord
  // =====================================================

  const foreignOrder =
    await issueCharacterOrder(
      "demo-session",
      "player-roderic",
      "lord_malric",
      {
        type:
          "HOLD_POSITION",
        risk: 10,
      }
    );

  assert.equal(
    foreignOrder.ok,
    false
  );

  if (
    foreignOrder.ok ===
    false
  ) {
    assert.equal(
      foreignOrder.error,
      "NOT_AUTHORIZED"
    );
  }

  console.log(
    "PASS P6-L06: foreign lord command rejected"
  );

  // =====================================================
  // P6-L07 — low loyalty can refuse/negotiate
  // =====================================================

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        commandCycle: {
          ...current.session.commandCycle,
          phase: "planning",
          requiredPlayerIds: [
            "player-varren",
          ],
          readyPlayerIds: [],
          currentPlayerId:
            "player-varren",
          interrupt:
            undefined,
        },
      },
    })
  );

  setCharacterPresenceContext({
    id:
      "p6-ironhollow-council",
    kind:
      "council",
    characterIds: [
      "king_varren",
      "lord_malric",
    ],
    active: true,
    referenceId:
      "ironhollow-council",
  });

  const malricOrder =
    await issueCharacterOrder(
      "demo-session",
      "player-varren",
      "lord_malric",
      {
        type:
          "RAISE_TROOPS",
        risk: 90,
        note:
          "Raise troops immediately for a dangerous foreign campaign.",
      }
    );

  if (
    malricOrder.ok ===
    false
  ) {
    throw new Error(
      `Malric order failed: ${malricOrder.error}`
    );
  }

  assert.ok(
    malricOrder.order.response ===
      "REFUSE" ||
    malricOrder.order.response ===
      "NEGOTIATE"
  );

  console.log(
    "PASS P6-L07: low-loyalty lord can legally refuse/negotiate"
  );

  // =====================================================
  // P6-L08 — serializable save/load-ready lord runtime
  // =====================================================

  const before =
    exportLordRuntimeState();

  const parsedBefore =
    JSON.parse(
      before
    );

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords: {
          profiles: {},
          orders: {},
        },
      },
    })
  );

  importLordRuntimeState(
    before
  );

  const after =
    exportLordRuntimeState();

  const parsedAfter =
    JSON.parse(
      after
    );

  assert.deepEqual(
    parsedAfter,
    parsedBefore
  );

  console.log(
    "PASS P6-L08: lord profiles/orders survive serialization restore"
  );

  // =====================================================
  // PRIVATE FOREIGN LOYALTY NOT EXPOSED THROUGH OWN INSPECT
  // =====================================================

  const ownView =
    inspectKingdomLords(
      "demo-session",
      "player-roderic"
    );

  assert.equal(
    ownView.ok,
    true
  );

  if (
    ownView.ok
  ) {
    assert.equal(
      ownView.lords.every(
        (lord) =>
          getRuntimeWorldState()
            .session
            .lords
            .profiles[
              lord.characterId
            ].kingdomId ===
          "eastvale"
      ),
      true
    );
  }

  console.log(
    "PASS: inspect_kingdom_lords does not reveal foreign private loyalty"
  );

  console.log("");
  console.log(
    "PACKAGE 6 KINGDOM LORD STRUCTURE: PASS"
  );
}

main().catch(
  (
    error: unknown
  ) => {
    console.error(
      error
    );
    process.exitCode =
      1;
  }
);
