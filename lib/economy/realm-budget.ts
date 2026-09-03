import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getKingdomDailySettlementTradeIncome,
  getKingdomDailyTradeIncome,
} from "@/lib/economy/trade";

import {
  getKingdomTerritoryEconomy,
} from "@/lib/economy/territory-economy";

import {
  getArmyDailyCosts,
} from "@/lib/military/army-queries";

export interface RealmBudgetSnapshot {
  kingdomId: string;
  treasury: number;
  dailySettlementIncomeGold: number;
  dailyTerritoryIncomeGold: number;
  dailyIncomeGold: number;
  territoryPotentialGold: number;
  territoryDisruptedGold: number;
  territoryNodeCount: number;
  contestedTerritoryNodeCount: number;
  occupiedHomeTerritoryNodeCount: number;
  dailyArmyExpenseGold: number;
  projectedDailyNetGold: number;
  recommendedReserveGold: number;
  spendableGold: number;
  reserveCoverageDays: number;
  armyCosts: Array<{
    armyId: string;
    gold: number;
    food: number;
  }>;
}

function round2(
  value: number
): number {
  return Math.round(
    value * 100
  ) / 100;
}

export function getRecommendedRealmReserve(
  kingdomId: string
): number {
  const world =
    getRuntimeWorldState();

  const activeArmyIds =
    Object.values(
      world.armies
    )
      .filter(
        (army) =>
          army.ownerId ===
            kingdomId &&
          army.status !==
            "destroyed"
      )
      .map(
        (army) =>
          army.id
      );

  const threeDaysArmyCost =
    activeArmyIds.reduce(
      (
        total,
        armyId
      ) =>
        total +
        getArmyDailyCosts(
          armyId
        ).gold *
          3,
      0
    );

  return Math.max(
    150,
    Math.round(
      threeDaysArmyCost
    )
  );
}

export function getRealmBudgetSnapshot(
  kingdomId: string
):
  RealmBudgetSnapshot {
  const world =
    getRuntimeWorldState();

  const kingdom =
    world.kingdoms[
      kingdomId
    ];

  if (!kingdom) {
    throw new Error(
      `KINGDOM_NOT_FOUND: ${kingdomId}`
    );
  }

  const armyCosts =
    Object.values(
      world.armies
    )
      .filter(
        (army) =>
          army.ownerId ===
            kingdomId &&
          army.status !==
            "destroyed"
      )
      .map(
        (army) => {
          const cost =
            getArmyDailyCosts(
              army.id
            );

          return {
            armyId:
              army.id,
            gold:
              round2(
                cost.gold
              ),
            food:
              round2(
                cost.food
              ),
          };
        }
      );

  const dailyArmyExpenseGold =
    armyCosts.reduce(
      (
        total,
        item
      ) =>
        total +
        item.gold,
      0
    );

  const territory =
    getKingdomTerritoryEconomy(
      kingdomId
    );

  const dailySettlementIncomeGold =
    getKingdomDailySettlementTradeIncome(
      kingdomId
    );

  const dailyTerritoryIncomeGold =
    territory.dailyTerritoryGold;

  const dailyIncomeGold =
    getKingdomDailyTradeIncome(
      kingdomId
    );

  const projectedDailyNetGold =
    dailyIncomeGold -
    dailyArmyExpenseGold;

  const recommendedReserveGold =
    getRecommendedRealmReserve(
      kingdomId
    );

  const spendableGold =
    Math.max(
      0,
      kingdom.treasury -
        recommendedReserveGold
    );

  const reserveCoverageDays =
    dailyArmyExpenseGold <=
    0
      ? 999
      : kingdom.treasury /
        dailyArmyExpenseGold;

  return {
    kingdomId,
    treasury:
      round2(
        kingdom.treasury
      ),
    dailySettlementIncomeGold:
      round2(
        dailySettlementIncomeGold
      ),
    dailyTerritoryIncomeGold:
      round2(
        dailyTerritoryIncomeGold
      ),
    dailyIncomeGold:
      round2(
        dailyIncomeGold
      ),
    territoryPotentialGold:
      round2(
        territory.homePotentialGold
      ),
    territoryDisruptedGold:
      round2(
        territory.disruptedGold
      ),
    territoryNodeCount:
      territory.homeNodeCount,
    contestedTerritoryNodeCount:
      territory.contestedNodeCount,
    occupiedHomeTerritoryNodeCount:
      territory.occupiedHomeNodeCount,
    dailyArmyExpenseGold:
      round2(
        dailyArmyExpenseGold
      ),
    projectedDailyNetGold:
      round2(
        projectedDailyNetGold
      ),
    recommendedReserveGold:
      round2(
        recommendedReserveGold
      ),
    spendableGold:
      round2(
        spendableGold
      ),
    reserveCoverageDays:
      round2(
        reserveCoverageDays
      ),
    armyCosts,
  };
}
