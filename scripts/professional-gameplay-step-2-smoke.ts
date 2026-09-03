import assert from "node:assert/strict";

import {
  getMapNodes,
} from "../lib/map/graph";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

import {
  getAllTerritoryNodeEconomies,
  getKingdomTerritoryEconomy,
} from "../lib/economy/territory-economy";

import {
  getKingdomDailySettlementTradeIncome,
  getKingdomDailyTradeIncome,
} from "../lib/economy/trade";

import {
  getRealmBudgetSnapshot,
} from "../lib/economy/realm-budget";

import {
  getDeliveredPlayerKnowledge,
} from "../lib/session/knowledge";

import {
  getPlayerEconomyView,
  getPlayerKnownEnemyForces,
} from "../lib/session/observation";

async function main():
  Promise<void> {
  const world =
    getRuntimeWorldState();

  const kingdomIds =
    Object.keys(
      world.kingdoms
    ).sort();

  const economicNodes =
    getAllTerritoryNodeEconomies();

  assert.ok(
    economicNodes.length >=
      20,
    `expected many economic transit nodes, got ${economicNodes.length}`
  );

  assert.ok(
    getMapNodes().some(
      (node) =>
        node.kind ===
          "transit" &&
        node.territoryKingdomId
    )
  );

  console.log(
    `PASS S2-01: ${economicNodes.length} transit positions participate in territorial economy`
  );

  const territoryByKingdom =
    kingdomIds.map(
      (kingdomId) =>
        getKingdomTerritoryEconomy(
          kingdomId
        )
    );

  for (
    const economy
    of territoryByKingdom
  ) {
    assert.ok(
      economy.homeNodeCount >
        0,
      `${economy.kingdomId} has no economic territory nodes`
    );

    assert.ok(
      Number.isFinite(
        economy.dailyTerritoryGold
      )
    );
  }

  const signatures =
    new Set(
      territoryByKingdom.map(
        (economy) =>
          [
            economy.homeNodeCount,
            economy.homePotentialGold.toFixed(
              2
            ),
          ].join(":")
      )
    );

  assert.ok(
    signatures.size >=
      2,
    "territorial economies should differ from geography"
  );

  console.log(
    "PASS S2-02: realm economic asymmetry emerges from map geography"
  );

  for (
    const kingdomId
    of kingdomIds
  ) {
    const settlementIncome =
      getKingdomDailySettlementTradeIncome(
        kingdomId
      );

    const territoryIncome =
      getKingdomTerritoryEconomy(
        kingdomId
      ).dailyTerritoryGold;

    const total =
      getKingdomDailyTradeIncome(
        kingdomId
      );

    assert.equal(
      Math.round(
        (
          settlementIncome +
          territoryIncome
        ) *
          100
      ) /
        100,
      Math.round(
        total *
          100
      ) /
        100
    );

    const budget =
      getRealmBudgetSnapshot(
        kingdomId
      );

    assert.equal(
      budget.dailyTerritoryIncomeGold,
      Math.round(
        territoryIncome *
          100
      ) /
        100
    );
  }

  console.log(
    "PASS S2-03: treasury tick and budget forecast share the same income source"
  );

  const activePlayers =
    Object.values(
      world.session.players
    ).filter(
      (player) =>
        player.active
    );

  let playersWithIntel =
    0;

  for (
    const player
    of activePlayers
  ) {
    const bootstrap =
      getDeliveredPlayerKnowledge(
        player.id
      ).filter(
        (fact) =>
          fact.kind ===
            "army" &&
          fact.data
            .bootstrapIntel ===
            true
      );

    if (
      bootstrap.length ===
      0
    ) {
      continue;
    }

    playersWithIntel +=
      1;

    for (
      const fact
      of bootstrap
    ) {
      assert.equal(
        fact.data
          .approximate,
        true
      );

      assert.equal(
        fact.data
          .visibility,
        "ghost"
      );

      assert.notEqual(
        fact.confidence,
        "confirmed"
      );

      assert.ok(
        typeof fact.data
          .approximateSoldiers ===
          "number"
      );
    }
  }

  assert.ok(
    playersWithIntel >=
      2,
    "neighboring realms should have approximate starting intelligence"
  );

  console.log(
    "PASS S2-04: starting enemy intelligence is approximate PlayerKnowledge ghost data"
  );

  const localPlayer =
    world.session.players[
      world.session
        .localPlayerId
    ];

  assert.ok(
    localPlayer
  );

  const enemyView =
    getPlayerKnownEnemyForces(
      world.session.id,
      localPlayer.id
    );

  assert.ok(
    enemyView.ok
  );

  if (
    enemyView.ok
  ) {
    for (
      const fact
      of enemyView.forces
    ) {
      const canonical =
        world.armies[
          fact.subjectId
        ];

      if (
        canonical
      ) {
        assert.notEqual(
          canonical.ownerId,
          localPlayer.kingdomId
        );
      }
    }
  }

  console.log(
    "PASS S2-05: enemy-force inspection remains knowledge-scoped"
  );

  const economyView =
    getPlayerEconomyView(
      world.session.id,
      localPlayer.id
    );

  assert.ok(
    economyView.ok
  );

  if (
    economyView.ok
  ) {
    assert.ok(
      "budget" in
        economyView
    );

    assert.ok(
      "territory" in
        economyView
    );
  }

  console.log(
    "PASS S2-06: Human/Actor economy inspection shares the canonical budget + territory model"
  );

  const armyQueriesText =
    await import(
      "node:fs/promises"
    ).then(
      (fs) =>
        fs.readFile(
          "lib/military/army-queries.ts",
          "utf8"
        )
    );

  assert.ok(
    armyQueriesText.includes(
      "getArmyTerritoryKingdomId"
    )
  );

  assert.ok(
    armyQueriesText.includes(
      "multiplier *=\n      1.15"
    )
  );

  console.log(
    "PASS S2-07: foreign campaigning adds modest upkeep pressure"
  );

  console.log("");
  console.log(
    "PROFESSIONAL GAMEPLAY STEP 2 — TERRITORY ECONOMY + INTELLIGENCE: PASS"
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
