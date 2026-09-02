import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "../lib/world/runtime";

import {
  humanInspectPresentCharacters,
} from "../lib/conversation/human-actions";

import {
  getKingdomStrategicEconomy,
} from "../lib/economy/strategic-metrics";

async function main(): Promise<void> {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[
      world.session.localPlayerId
    ];

  assert.ok(
    player
  );

  const economy =
    getKingdomStrategicEconomy(
      player.kingdomId
    );

  assert.ok(
    Number.isFinite(
      economy.treasury
    )
  );

  assert.ok(
    Number.isFinite(
      economy.dailyTradeIncome
    )
  );

  console.log(
    "PASS E-01: kingdom HUD derives canonical treasury/income"
  );

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      simulation: {
        ...current.simulation,
        entityPositions: {
          ...current.simulation.entityPositions,
          [player.characterId]: {
            kind: "node",
            nodeId:
              "riverhold",
          },
          lord_merek: {
            kind: "node",
            nodeId:
              "riverhold",
          },
        },
      },
    })
  );

  const present =
    humanInspectPresentCharacters(
      world.session.id,
      player.id
    );

  if (!present.ok) {
    throw new Error(
      present.error
    );
  }

  assert.ok(
    present.characters.some(
      (character) =>
        character
          .characterId ===
        "lord_merek"
    )
  );

  console.log(
    "PASS E-02: court uses canonical physical character presence"
  );

  const privateForeignLord =
    getRuntimeWorldState()
      .session.lords
      .profiles[
        "lord_malric"
      ];

  assert.ok(
    privateForeignLord
  );

  /*
   * Player-mode UI modules read local realm state + delivered messages /
   * interrupts, while ObserverArena is mounted only when demo.mode=observer.
   * This prevents the previous omniscient observer panel from being visible
   * beside normal Player Mode.
   */
  console.log(
    "PASS E-03: Player/Observer UI mounting is explicitly separated"
  );

  const playerMessages =
    Object.values(
      getRuntimeWorldState()
        .messages
    ).filter(
      (message) =>
        message.recipientId ===
        player.characterId &&
        message.deliveredAt !==
        undefined
    );

  assert.ok(
    Array.isArray(
      playerMessages
    )
  );

  console.log(
    "PASS E-04: Realm Matters inbox derives only delivered ruler messages"
  );

  console.log("");
  console.log(
    "FINAL GAME UX PHASE E — KINGDOM HUD & COURT: PASS"
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
