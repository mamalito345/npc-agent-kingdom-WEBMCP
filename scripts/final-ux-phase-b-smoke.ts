import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  issueStrategicOrder,
} from "../lib/session/orders";

import {
  forcePlayerArmyBorderMove,
} from "../lib/session/border-player-actions";

import {
  playerControlsArmy,
} from "../lib/session/players";

import {
  setGmLordOrderModelAdapter,
  resetGmLordOrderModelAdapter,
} from "../lib/lords/model";

import {
  issueCharacterOrder,
} from "../lib/lords/service";

import {
  advanceWorldUntil,
} from "../lib/world/simulation";

function setTurn(
  playerId: string
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        commandCycle: {
          ...current.session.commandCycle,
          phase: "planning",
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

async function main(): Promise<void> {
  const world =
    getRuntimeWorldState();

  // B-01 — all 10 major lords have physical armies.
  const profiles =
    Object.values(
      world.session.lords.profiles
    );

  assert.equal(
    profiles.length,
    10
  );

  assert.ok(
    profiles.every(
      (profile) =>
        profile.controlledArmyIds.length >= 1 &&
        profile.controlledArmyIds.every(
          (armyId) =>
            Boolean(
              getRuntimeWorldState()
                .armies[
                  armyId
                ]
            ) &&
            Boolean(
              getRuntimeWorldState()
                .simulation
                .entityPositions[
                  armyId
                ]
            )
        )
    )
  );

  console.log(
    "PASS B-01: 10 major lords have physical household armies"
  );

  // B-02 — ruler cannot directly puppeteer a major lord army.
  assert.equal(
    playerControlsArmy(
      "player-roderic",
      "army-house-theon"
    ),
    false
  );

  setTurn(
    "player-roderic"
  );

  const directLordMove =
    issueStrategicOrder({
      playerId:
        "player-roderic",
      type:
        "move_army",
      payload: {
        armyId:
          "army-house-theon",
        destinationNodeId:
          "eastkeep",
      },
    });

  assert.equal(
    directLordMove.ok,
    false
  );

  console.log(
    "PASS B-02: lord armies require lord-order path, not ruler puppet control"
  );

  // B-03 — GM lord acceptance physically moves the lord army.
  setGmLordOrderModelAdapter({
    decideOrder() {
      return {
        response:
          "ACCEPT",
        summary:
          "Theon accepts the royal reinforcement order.",
      };
    },
  });

  // Put king and lord together for immediate order resolution.
  updateRuntimeWorldState(
    (current) => ({
      ...current,
      simulation: {
        ...current.simulation,
        entityPositions: {
          ...current.simulation.entityPositions,
          king_roderic: {
            kind: "node",
            nodeId:
              "greenharbor",
          },
          lord_theon: {
            kind: "node",
            nodeId:
              "greenharbor",
          },
        },
      },
    })
  );

  setTurn(
    "player-roderic"
  );

  const lordOrder =
    await issueCharacterOrder(
      "demo-session",
      "player-roderic",
      "lord_theon",
      {
        type:
          "BRING_ARMY",
        targetNodeId:
          "eastkeep",
        risk:
          25,
      }
    );

  if (
    lordOrder.ok === false
  ) {
    throw new Error(
      `Lord order failed: ${lordOrder.error}`
    );
  }

  assert.equal(
    getRuntimeWorldState()
      .simulation
      .activeMovements[
        "army-house-theon"
      ]?.destinationNodeId,
    "eastkeep"
  );

  console.log(
    "PASS B-03: GM lord decision drives canonical physical army movement"
  );

  resetGmLordOrderModelAdapter();

  // B-04 — unauthorized foreign movement is blocked before queue.
  // Reset Eastvale royal army to its capital and make sure no access exists.
  updateRuntimeWorldState(
    (current) => ({
      ...current,
      wars: {},
      session: {
        ...current.session,
        politics: {
          ...current.session.politics,
          agreements: {},
        },
      },
      simulation: {
        ...current.simulation,
        activeMovements: {
          ...current.simulation.activeMovements,
          "army-eastvale-roderic":
            undefined as never,
        },
        entityPositions: {
          ...current.simulation.entityPositions,
          "army-eastvale-roderic": {
            kind: "node",
            nodeId:
              "eastkeep",
          },
        },
      },
    })
  );

  // Remove accidental undefined key.
  updateRuntimeWorldState(
    (current) => {
      const activeMovements = {
        ...current.simulation.activeMovements,
      };
      delete activeMovements[
        "army-eastvale-roderic"
      ];

      return {
        ...current,
        simulation: {
          ...current.simulation,
          activeMovements,
        },
      };
    }
  );

  setTurn(
    "player-roderic"
  );

  const blocked =
    issueStrategicOrder({
      playerId:
        "player-roderic",
      type:
        "move_army",
      payload: {
        armyId:
          "army-eastvale-roderic",
        destinationNodeId:
          "highcrest",
      },
    });

  assert.equal(
    blocked.ok,
    false
  );

  if (
    blocked.ok === false
  ) {
    assert.equal(
      blocked.error,
      "BORDER_ACCESS_REQUIRED"
    );
    assert.equal(
      blocked.border
        ?.toKingdomId,
      "northreach"
    );
  }

  console.log(
    "PASS B-04: unauthorized foreign route requires explicit border decision"
  );

  // B-05 — explicit force crossing is queued, but incident does not exist yet.
  const forced =
    forcePlayerArmyBorderMove(
      "demo-session",
      "player-roderic",
      "army-eastvale-roderic",
      "highcrest"
    );

  if (
    forced.ok === false
  ) {
    throw new Error(
      `Forced border order failed: ${forced.error}`
    );
  }

  assert.equal(
    Object.keys(
      getRuntimeWorldState()
        .session.borders.incidents
    ).length,
    0
  );

  console.log(
    "PASS B-05: player may explicitly accept border-violation risk; no incident at order time"
  );

  // Start execution directly for smoke.
  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        commandCycle: {
          ...current.session.commandCycle,
          phase:
            "executing",
          requiredPlayerIds: [],
          readyPlayerIds: [],
          currentPlayerId:
            undefined,
          interrupt:
            undefined,
          executionStartedAt:
            current.simulation.worldTimeMinutes,
        },
      },
    })
  );

  const movementTarget =
    getRuntimeWorldState()
      .simulation.worldTimeMinutes +
    7 * 24 * 60;

  for (
    let guard = 0;
    guard < 30;
    guard += 1
  ) {
    const result =
      advanceWorldUntil(
        movementTarget
      );

    if (
      Object.keys(
        getRuntimeWorldState()
          .session.borders.incidents
      ).length >
      0
    ) {
      break;
    }

    if (
      result.reachedTarget
    ) {
      break;
    }

    // Clear the defender command window so smoke can continue.
    updateRuntimeWorldState(
      (current) => ({
        ...current,
        session: {
          ...current.session,
          commandCycle: {
            ...current.session.commandCycle,
            phase:
              "executing",
            requiredPlayerIds: [],
            readyPlayerIds: [],
            currentPlayerId:
              undefined,
            interrupt:
              undefined,
          },
        },
      })
    );
  }

  const incidents =
    Object.values(
      getRuntimeWorldState()
        .session.borders.incidents
    );

  assert.ok(
    incidents.length >= 1
  );

  const incident =
    incidents[0];

  assert.equal(
    incident.fromKingdomId,
    "eastvale"
  );

  assert.equal(
    incident.toKingdomId,
    "northreach"
  );

  const defenderKnowledge =
    getRuntimeWorldState()
      .session.knowledge[
        "player-edwyn"
      ].facts;

  assert.ok(
    defenderKnowledge.some(
      (fact) =>
        fact.data
          .borderIncidentId ===
        incident.id
    )
  );

  console.log(
    "PASS B-06: violation is created only when army physically crosses the border"
  );
  console.log(
    "PASS B-07: defending realm receives canonical border knowledge"
  );

  console.log("");
  console.log(
    "FINAL GAME UX PHASE B — BORDERS & LORD ARMIES: PASS"
  );
}

main().catch(
  (error: unknown) => {
    console.error(
      error
    );
    process.exitCode =
      1;
  }
);
