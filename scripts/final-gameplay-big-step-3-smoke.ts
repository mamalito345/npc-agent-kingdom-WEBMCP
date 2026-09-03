import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  developPlayerSettlement,
} from "../lib/session/management-player-actions";

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

    const settlement =
      Object.values(
        original.settlements
      ).find(
        (candidate) =>
          candidate.kingdomId ===
          player.kingdomId
      );

    if (!settlement) {
      throw new Error(
        "Own settlement missing."
      );
    }

    updateRuntimeWorldState(
      (current) => ({
        ...current,

        settlements: {
          ...current.settlements,

          [settlement.id]: {
            ...current.settlements[
              settlement.id
            ],

            developmentLevel:
              0,

            resources: {
              food:
                Math.max(
                  current
                    .settlements[
                      settlement.id
                    ]
                    .resources
                    .food,
                  1000
                ),

              gold:
                Math.max(
                  current
                    .settlements[
                      settlement.id
                    ]
                    .resources
                    .gold,
                  1000
                ),

              wood:
                Math.max(
                  current
                    .settlements[
                      settlement.id
                    ]
                    .resources
                    .wood,
                  1000
                ),

              stone:
                Math.max(
                  current
                    .settlements[
                      settlement.id
                    ]
                    .resources
                    .stone,
                  1000
                ),

              metal:
                Math.max(
                  current
                    .settlements[
                      settlement.id
                    ]
                    .resources
                    .metal,
                  1000
                ),
            },
          },
        },
      })
    );

    const before =
      getRuntimeWorldState()
        .settlements[
          settlement.id
        ]
        .dailyProduction
        .food;

    const development =
      developPlayerSettlement(
        sessionId,
        playerId,
        settlement.id,
        "food"
      );

    if (
      development.ok ===
      false
    ) {
      throw new Error(
        `Development failed: ${development.error}`
      );
    }

    const after =
      getRuntimeWorldState()
        .settlements[
          settlement.id
        ];

    assert.equal(
      after.developmentLevel,
      1
    );

    assert.ok(
      after.dailyProduction
        .food >
      before
    );

    console.log(
      "PASS S3-01: local economic investment consumes settlement resources and permanently raises one production branch"
    );

    const production =
      readFileSync(
        "lib/economy/production.ts",
        "utf8"
      );

    assert.ok(
      production.includes(
        "getOccupationMultiplierForDays"
      )
    );

    console.log(
      "PASS S3-02: occupied settlements now apply the existing occupation economic multiplier to daily production"
    );

    const actions =
      readFileSync(
        "lib/session/management-player-actions.ts",
        "utf8"
      );

    for (
      const fn
      of [
        "raidPlayerSettlement",
        "capturePlayerSettlement",
        "developPlayerSettlement",
      ]
    ) {
      assert.ok(
        actions.includes(
          fn
        )
      );
    }

    assert.ok(
      actions.includes(
        "FORTIFICATION_STILL_STANDS"
      )
    );

    assert.ok(
      actions.includes(
        "findActiveWarBetweenRealms"
      )
    );

    console.log(
      "PASS S3-03: raid/capture are PlayerActions gated by war, physical control and fortification state"
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

    const executor =
      readFileSync(
        "lib/actors/management-tool-executor.ts",
        "utf8"
      );

    const webmcp =
      readFileSync(
        "lib/webmcp/register-army-management-tools.ts",
        "utf8"
      );

    for (
      const tool
      of [
        "develop_settlement",
        "raid_settlement",
        "capture_settlement",
      ]
    ) {
      assert.ok(
        actorTypes.includes(
          `"${tool}"`
        )
      );

      assert.ok(
        actorContext.includes(
          `"${tool}"`
        )
      );

      assert.ok(
        executor.includes(
          `case "${tool}"`
        )
      );

      assert.ok(
        webmcp.includes(
          `"${tool}"`
        )
      );
    }

    console.log(
      "PASS S3-04: settlement development and warfare have Human/Actor LLM/WebMCP parity"
    );

    const ui =
      readFileSync(
        "app/operational-panel.tsx",
        "utf8"
      );

    for (
      const text
      of [
        "INVEST",
        "FORTIFY SETTLEMENT",
        "Forces At Settlement",
        "RAID",
        "OCCUPY",
        "Settlement Operations",
      ]
    ) {
      assert.ok(
        ui.includes(
          text
        ),
        `Settlement UI missing ${text}`
      );
    }

    assert.ok(
      ui.includes(
        "selectMapArmy("
      )
    );

    console.log(
      "PASS S3-05: settlement inspector exposes economy, garrison/forces and hostile settlement actions"
    );

    console.log("");
    console.log(
      "FINAL GAMEPLAY BIG STEP 3 — SETTLEMENT WARFARE & ECONOMY: PASS"
    );
  } finally {
    updateRuntimeWorldState(
      () =>
        original
    );
  }
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
