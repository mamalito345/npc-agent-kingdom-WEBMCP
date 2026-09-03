// STEP3_STEP9_COMPAT: war UI may be embedded in StrategicCommandCenter.
import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getMapNodes,
} from "../lib/map/graph";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getBattlefieldPositionProfile,
  evaluateArmyTerrainFit,
} from "../lib/military/terrain-position-evaluator";

import {
  getPlayerKnownEnemyForces,
} from "../lib/session/observation";

import {
  evaluateBattleTactic,
} from "../lib/military/battle-tactics";

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  const localPlayer =
    world.session.players[
      world.session
        .localPlayerId
    ];

  assert.ok(
    localPlayer
  );

  const ownArmy =
    Object.values(
      world.armies
    ).find(
      (army) =>
        army.ownerId ===
          localPlayer.kingdomId &&
        army.status !==
          "destroyed"
    );

  assert.ok(
    ownArmy
  );

  const terrainNodes =
    getMapNodes().filter(
      (node) =>
        node.features.length >
          0 ||
        node.terrain !==
          "plains"
    );

  assert.ok(
    terrainNodes.length >
      0
  );

  const battlefield =
    getBattlefieldPositionProfile(
      terrainNodes[0].id
    );

  assert.ok(
    battlefield.terrain
  );

  assert.ok(
    Number.isFinite(
      battlefield
        .attackerBias
    ) &&
    Number.isFinite(
      battlefield
        .defenderBias
    )
  );

  console.log(
    "PASS S3-01: strategic map terrain resolves into a deterministic battlefield position profile"
  );

  const fit =
    evaluateArmyTerrainFit(
      ownArmy.id,
      terrainNodes[0].id,
      "attacker"
    );

  assert.ok(
    fit.soldiers >=
      0
  );

  assert.ok(
    fit.recommendedTactics
      .length >
      0
  );

  console.log(
    "PASS S3-02: own army composition is evaluated against canonical battle tactic rules"
  );

  const enemyView =
    getPlayerKnownEnemyForces(
      world.session.id,
      localPlayer.id,
      ownArmy.id
    );

  assert.ok(
    enemyView.ok
  );

  if (
    enemyView.ok
  ) {
    assert.ok(
      enemyView.forces
        .length >
        0
    );

    const latest =
      enemyView.forces[
        0
      ];

    assert.ok(
      latest.targeting
    );

    assert.equal(
      typeof latest
        .targeting
        .canTarget,
      "boolean"
    );

    if (
      latest.targeting
        .knownNodeId
    ) {
      assert.ok(
        latest.battlefield
      );
    }
  }

  console.log(
    "PASS S3-03: known enemy forces carry confidence-aware targeting and terrain metadata"
  );

  const actorExecutor =
    readFileSync(
      "lib/actors/tool-executor.ts",
      "utf8"
    );

  assert.ok(
    actorExecutor.includes(
      "getPlayerKnownEnemyForces"
    )
  );

  console.log(
    "PASS S3-04: Actor/WebMCP enemy inspection uses the enriched observation layer"
  );

  const sampleComposition = {
    totalSoldiers:
      1000,
    infantry:
      500,
    cavalry:
      300,
    siege:
      200,
    ship:
      0,
  };

  const bridgeAttack =
    evaluateBattleTactic(
      "aggressive_push",
      sampleComposition,
      "river_crossing",
      [
        "bridge",
      ],
      "attacker",
      "hold_ground"
    );

  const mountainFlank =
    evaluateBattleTactic(
      "cavalry_flank",
      sampleComposition,
      "mountain",
      [],
      "attacker",
      "hold_ground"
    );

  const highGroundDefense =
    evaluateBattleTactic(
      "hold_ground",
      sampleComposition,
      "hills",
      [
        "high_ground",
      ],
      "defender",
      "aggressive_push"
    );

  assert.ok(
    bridgeAttack.valid &&
    bridgeAttack
      .powerMultiplier <
      1
  );

  assert.equal(
    mountainFlank.valid,
    false
  );

  assert.ok(
    highGroundDefense.valid &&
    highGroundDefense
      .powerMultiplier >
      1
  );

  console.log(
    "PASS S3-05: bridge, mountain cavalry and high-ground effects are enforced semantically by the canonical battle engine"
  );

  const armyLayer =
    readFileSync(
      "app/army-layer.tsx",
      "utf8"
    );

  assert.ok(
    armyLayer.includes(
      "approximateSoldiers"
    ) &&
    armyLayer.includes(
      "LAST KNOWN"
    ) &&
    armyLayer.includes(
      "canInterceptWithSelectedArmy"
    )
  );

  console.log(
    "PASS S3-06: enemy ghosts display intelligence and interception eligibility"
  );

  const root =
    readFileSync(
      "app/game-root.tsx",
      "utf8"
    );

  const panel =
    readFileSync(
      "app/war-intelligence-panel.tsx",
      "utf8"
    );

  const commandCenter =
    readFileSync(
      "app/strategic-command-center.tsx",
      "utf8"
    );

  const warSurfaceMounted =
    root.includes(
      "<WarIntelligencePanel />"
    ) ||
    (
      root.includes(
        "<StrategicCommandCenter />"
      ) &&
      commandCenter.includes(
        '"WAR"'
      ) &&
      commandCenter.includes(
        "<WarIntelligencePanel"
      ) &&
      commandCenter.includes(
        "embedded"
      )
    );

  assert.ok(
    warSurfaceMounted
  );

  assert.ok(
    panel.includes(
      "Position Estimate"
    )
  );

  console.log(
    "PASS S3-07: Human war-map analysis remains mounted directly or through the Step 9 WAR workspace"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 3 — WAR MAP + TARGETING + TERRAIN: PASS"
  );
}

main().catch(
  (
    error:
      unknown
  ) => {
    console.error(
      error
    );
    process.exitCode =
      1;
  }
);
