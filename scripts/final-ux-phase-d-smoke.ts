import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  buildArmyRoutePreview,
} from "../lib/map/route-preview";

import {
  issuePlayerArmyMove,
} from "../lib/session/player-actions";

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
  updateRuntimeWorldState(
    (current) => ({
      ...current,
      simulation: {
        ...current.simulation,
        entityPositions: {
          ...current.simulation.entityPositions,
          "army-northreach-edwyn": {
            kind: "node",
            nodeId: "stoneford",
          },
        },
      },
    })
  );

  const preview =
    buildArmyRoutePreview(
      "army-northreach-edwyn",
      "riverhold"
    );

  if (!preview.ok) {
    throw new Error(
      preview.error
    );
  }

  assert.ok(
    preview.preview.nodeIds.length >
      2,
    "Dense route preview must traverse hidden transit nodes."
  );

  assert.ok(
    preview.preview.points.length >
      2
  );

  assert.ok(
    preview.preview
      .estimatedDurationMinutes >
      0
  );

  console.log(
    "PASS D-01: army -> settlement click route preview uses dense canonical graph"
  );

  setTurn(
    "player-edwyn"
  );

  const move =
    issuePlayerArmyMove(
      "demo-session",
      "player-edwyn",
      "army-northreach-edwyn",
      "riverhold"
    );

  if (!move.ok) {
    throw new Error(
      move.error
    );
  }

  assert.equal(
    move.order.type,
    "move_army"
  );

  assert.equal(
    "destinationNodeId" in
      move.order.payload
      ? move.order.payload
          .destinationNodeId
      : undefined,
    "riverhold"
  );

  console.log(
    "PASS D-02: Human map confirmation queues canonical PlayerAction order"
  );

  const international =
    buildArmyRoutePreview(
      "army-eastvale-roderic",
      "highcrest"
    );

  if (!international.ok) {
    throw new Error(
      international.error
    );
  }

  assert.ok(
    international.preview
      .unauthorizedBorder,
    "Foreign route should expose border warning in preview."
  );

  console.log(
    "PASS D-03: route preview exposes physical foreign-border warning"
  );

  const world =
    getRuntimeWorldState();

  const lordArmy =
    world.armies[
      "army-house-theon"
    ];

  assert.ok(
    lordArmy
  );

  console.log(
    "PASS D-04: lord army tokens are available as physical selectable map objects"
  );

  console.log("");
  console.log(
    "FINAL GAME UX PHASE D — MAP-FIRST GAMEPLAY: PASS"
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
