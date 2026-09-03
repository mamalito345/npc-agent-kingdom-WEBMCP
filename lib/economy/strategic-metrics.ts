import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmyDailyCosts,
} from "@/lib/military/army-queries";

import {
  getKingdomDailyTradeIncome,
  getSettlementTradeState,
} from "@/lib/economy/trade";

import {
  getKingdomTerritoryEconomy,
} from "@/lib/economy/territory-economy";

import type {
  KingdomStrategicEconomy,
  MobilizationLevel,
} from "@/types/economy";

function finiteOrZero(
  value: number
): number {
  return Number.isFinite(
    value
  )
    ? value
    : 0;
}

function getMobilizationLevel(
  ratio: number
): MobilizationLevel {
  if (
    ratio <
    0.35
  ) {
    return "normal";
  }

  if (
    ratio <
    0.65
  ) {
    return "major";
  }

  if (
    ratio <
    0.9
  ) {
    return "full";
  }

  return "emergency";
}

function getKingdomArmyIds(
  kingdomId: string
): string[] {
  const world =
    getRuntimeWorldState();

  return Object.values(
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
    )
    .sort();
}

export function getKingdomStrategicEconomy(
  kingdomId: string
): KingdomStrategicEconomy {
  const world =
    getRuntimeWorldState();

  const kingdom =
    world.kingdoms[
      kingdomId
    ];

  if (!kingdom) {
    throw new Error(
      `Kingdom not found: ${kingdomId}`
    );
  }

  const armyIds =
    getKingdomArmyIds(
      kingdomId
    );

  const dailyMilitaryGoldCost =
    armyIds.reduce(
      (
        total,
        armyId
      ) =>
        total +
        getArmyDailyCosts(
          armyId
        ).gold,
      0
    );

  const totalArmyFood =
    armyIds.reduce(
      (
        total,
        armyId
      ) =>
        total +
        (
          world.armies[
            armyId
          ]?.supply
            .foodSupply ??
          0
        ),
      0
    );

  const totalDailyArmyFoodCost =
    armyIds.reduce(
      (
        total,
        armyId
      ) =>
        total +
        getArmyDailyCosts(
          armyId
        ).food,
      0
    );

  const dailyTradeIncome =
    getKingdomDailyTradeIncome(
      kingdomId
    );

  const controlledSettlements =
    Object.values(
      world.settlements
    ).filter(
      (settlement) =>
        (
          settlement
            .controllerKingdomId ??
          settlement.kingdomId
        ) ===
        kingdomId
    );

  const theoreticalSettlementTrade =
    controlledSettlements.reduce(
      (
        total,
        settlement
      ) =>
        total +
        Math.max(
          0,
          settlement
            .dailyProduction
            .gold
        ),
      0
    );

  const actualSettlementTrade =
    controlledSettlements.reduce(
      (
        total,
        settlement
      ) =>
        total +
        getSettlementTradeState(
          settlement.id
        ).dailyTradeGold,
      0
    );

  const territory =
    getKingdomTerritoryEconomy(
      kingdomId
    );

  const theoreticalTrade =
    theoreticalSettlementTrade +
    territory.homePotentialGold;

  const actualTrade =
    actualSettlementTrade +
    territory.dailyTerritoryGold;

  const tradeDisruptionRatio =
    theoreticalTrade <=
    0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            1 -
              actualTrade /
                theoreticalTrade
          )
        );

  const treasuryDaysRemaining =
    dailyMilitaryGoldCost <=
    0
      ? Number.POSITIVE_INFINITY
      : kingdom.treasury /
        dailyMilitaryGoldCost;

  const armySupplyDays =
    totalDailyArmyFoodCost <=
    0
      ? Number.POSITIVE_INFINITY
      : totalArmyFood /
        totalDailyArmyFoodCost;

  const settlementFood =
    controlledSettlements.reduce(
      (
        total,
        settlement
      ) =>
        total +
        settlement.resources
          .food,
      0
    );

  const foodDaysRemaining =
    totalDailyArmyFoodCost <=
    0
      ? Number.POSITIVE_INFINITY
      : (
          settlementFood +
          totalArmyFood
        ) /
        totalDailyArmyFoodCost;

  const militaryCostIncomeRatio =
    dailyTradeIncome <=
    0
      ? dailyMilitaryGoldCost >
        0
        ? 1
        : 0
      : dailyMilitaryGoldCost /
        dailyTradeIncome;

  const mobilizationRatio =
    Math.max(
      0,
      Math.min(
        1,
        militaryCostIncomeRatio *
          0.7 +
          tradeDisruptionRatio *
            0.3
      )
    );

  return {
    kingdomId,
    treasury:
      kingdom.treasury,
    dailyTradeIncome,
    dailyMilitaryGoldCost,
    treasuryDaysRemaining:
      finiteOrZero(
        treasuryDaysRemaining
      ),
    foodDaysRemaining:
      finiteOrZero(
        foodDaysRemaining
      ),
    armySupplyDays:
      finiteOrZero(
        armySupplyDays
      ),
    militaryCostIncomeRatio,
    tradeDisruptionRatio,
    mobilizationRatio,
    mobilizationLevel:
      getMobilizationLevel(
        mobilizationRatio
      ),
  };
}
