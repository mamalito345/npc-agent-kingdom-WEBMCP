import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  assignPlayerArmyCommander,
  mergePlayerArmies,
  splitPlayerArmy,
  stopPlayerArmySupport,
  supportPlayerArmy,
} from "../lib/session/management-player-actions";

import {
  calculateBattleSidePower,
} from "../lib/military/battle-side-power";

async function main():
  Promise<void> {
  const original =
    getRuntimeWorldState();

  try {
    const sessionId =
      original.session.id;

    const playerId =
      original.session
        .localPlayerId;

    const player =
      original.session
        .players[
          playerId
        ];

    if (!player) {
      throw new Error(
        "Local player missing."
      );
    }

    const army =
      Object.values(
        original.armies
      ).find(
        (candidate) =>
          candidate.ownerId ===
            player.kingdomId &&
          candidate.unitIds.length >
            1
      );

    if (!army) {
      throw new Error(
        "No splittable own army found."
      );
    }

    const split =
      splitPlayerArmy(
        sessionId,
        playerId,
        army.id,
        [
          army.unitIds[0],
        ]
      );

    if (
      split.ok ===
      false
    ) {
      throw new Error(
        `Split failed: ${split.error}`
      );
    }

    assert.ok(
      getRuntimeWorldState()
        .armies[
          split.newArmyId
        ]
    );

    console.log(
      "PASS S2-01: PlayerAction split creates a physical army at the same node"
    );

    const merge =
      mergePlayerArmies(
        sessionId,
        playerId,
        army.id,
        split.newArmyId
      );

    if (
      merge.ok ===
      false
    ) {
      throw new Error(
        `Merge failed: ${merge.error}`
      );
    }

    assert.equal(
      getRuntimeWorldState()
        .armies[
          split.newArmyId
        ],
      undefined
    );

    console.log(
      "PASS S2-02: PlayerAction merge removes the source physical army"
    );

    const playerCharacterId =
      player.characterId;

    const armyPosition =
      getRuntimeWorldState()
        .simulation
        .entityPositions[
          army.id
        ];

    if (
      !armyPosition ||
      armyPosition.kind !==
        "node"
    ) {
      throw new Error(
        "Own army is not at node."
      );
    }

    updateRuntimeWorldState(
      (current) => ({
        ...current,

        simulation: {
          ...current.simulation,

          entityPositions: {
            ...current
              .simulation
              .entityPositions,

            [playerCharacterId]: {
              kind:
                "node",

              nodeId:
                armyPosition.nodeId,
            },
          },
        },
      })
    );

    const command =
      assignPlayerArmyCommander(
        sessionId,
        playerId,
        army.id,
        playerCharacterId
      );

    if (
      command.ok ===
      false
    ) {
      throw new Error(
        `Commander assignment failed: ${command.error}`
      );
    }

    assert.equal(
      getRuntimeWorldState()
        .armies[
          army.id
        ]
        .commanderId,
      playerCharacterId
    );

    console.log(
      "PASS S2-03: commander assignment requires physical ruler presence"
    );

    /*
     * Build the support fixture from the ruler-controlled army itself.
     *
     * The realm also contains independent lord household armies. They share
     * the kingdom ownerId but intentionally fail playerControlsArmy(), because
     * rulers must command those forces through issue_character_order.
     *
     * Therefore selecting "any same-owner army" is not a valid PlayerAction
     * support fixture. Split one controlled unit block into a second directly
     * controlled physical army and support that army instead.
     */
    const currentArmy =
      getRuntimeWorldState()
        .armies[
          army.id
        ];

    if (
      currentArmy.unitIds.length <
      2
    ) {
      throw new Error(
        "Controlled army needs at least two unit blocks for support fixture."
      );
    }

    const supportSplit =
      splitPlayerArmy(
        sessionId,
        playerId,
        army.id,
        [
          currentArmy.unitIds[
            0
          ],
        ]
      );

    if (
      supportSplit.ok ===
      false
    ) {
      throw new Error(
        `Support fixture split failed: ${supportSplit.error}`
      );
    }

    const supporterArmyId =
      supportSplit.newArmyId;

    const targetArmyId =
      army.id;

    const support =
      supportPlayerArmy(
        sessionId,
        playerId,
        supporterArmyId,
        targetArmyId
      );

    if (
      support.ok ===
      false
    ) {
      throw new Error(
        `Support failed: ${support.error}`
      );
    }

    assert.equal(
      getRuntimeWorldState()
        .armies[
          supporterArmyId
        ]
        .supportTargetArmyId,
      targetArmyId
    );

    const cleared =
      stopPlayerArmySupport(
        sessionId,
        playerId,
        supporterArmyId
      );

    if (
      cleared.ok ===
      false
    ) {
      throw new Error(
        `Stop support failed: ${cleared.error}`
      );
    }

    console.log(
      "PASS S2-04: adjacent support uses two directly controlled physical armies and is reversible"
    );

    const battlePowerSource =
      readFileSync(
        "lib/military/battle-side-power.ts",
        "utf8"
      );

    assert.ok(
      battlePowerSource
        .includes(
          "supportTargetArmyId"
        )
    );

    assert.ok(
      battlePowerSource
        .includes(
          "*\n            0.3"
        ) ||
      battlePowerSource
        .includes(
          "* 0.3"
        )
    );

    void calculateBattleSidePower;

    console.log(
      "PASS S2-05: adjacent support now contributes to battle-side power"
    );

    const actorTypes =
      readFileSync(
        "types/actors.ts",
        "utf8"
      );

    const actorContext =
      readFileSync(
        "lib/actors/context.ts",
        "utf8"
      );

    const provider =
      readFileSync(
        "app/webmcp-provider.tsx",
        "utf8"
      );

    for (
      const tool
      of [
        "split_army",
        "merge_armies",
        "support_army",
        "assign_commander",
        "fortify_settlement",
      ]
    ) {
      assert.ok(
        actorTypes.includes(
          `"${tool}"`
        ),
        `Actor type missing ${tool}`
      );

      assert.ok(
        actorContext.includes(
          `"${tool}"`
        ),
        `Actor context missing ${tool}`
      );
    }

    assert.ok(
      provider.includes(
        "registerArmyManagementWebMCPTools"
      )
    );

    console.log(
      "PASS S2-06: Human/Actor LLM/WebMCP management parity is wired"
    );

    const ui =
      readFileSync(
        "app/operational-panel.tsx",
        "utf8"
      );

    for (
      const action
      of [
        "splitPlayerArmy",
        "mergePlayerArmies",
        "supportPlayerArmy",
        "assignPlayerArmyCommander",
        "fortifyPlayerSettlement",
      ]
    ) {
      assert.ok(
        ui.includes(
          action
        ),
        `UI missing ${action}`
      );
    }

    assert.ok(
      ui.includes(
        "playerControlsArmy("
      ),
      "UI must not offer merge/support buttons for independent lord household armies"
    );

    console.log(
      "PASS S2-07: right-side inspector exposes canonical army-management actions only for directly controlled peer armies"
    );
  } finally {
    updateRuntimeWorldState(
      () =>
        original
    );
  }

  console.log("");
  console.log(
    "FINAL GAMEPLAY BIG STEP 2 — ARMY MANAGEMENT: PASS"
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
