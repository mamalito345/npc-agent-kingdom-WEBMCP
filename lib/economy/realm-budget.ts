import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getKingdomDailyTradeIncome,
} from "@/lib/economy/trade";

import {
  getArmyDailyCosts,
} from "@/lib/military/army-queries";

export interface RealmBudgetSnapshot {
  kingdomId: string;
  treasury: number;
  dailyIncomeGold: number;
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

  /*
   * Reserve is advisory, never a spending lock.
   * It prevents AI from treating every coin in treasury as disposable.
   */
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
    dailyArmyExpenseGold <= 0
      ? 999
      : kingdom.treasury /
        dailyArmyExpenseGold;

  return {
    kingdomId,
    treasury:
      round2(
        kingdom.treasury
      ),
    dailyIncomeGold:
      round2(
        dailyIncomeGold
      ),
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
