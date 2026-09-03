import {
  getAvailableSettlementResources,
  hasEnoughResources,
  multiplyResources,
} from "@/lib/economy/reservations";

import {
  getDevelopmentCost,
} from "@/lib/economy/development";

import {
  RECRUITMENT_DEFINITIONS,
} from "@/lib/military/balance";

import {
  canSettlementRecruitUnit,
  getCommittedRecruitmentManpower,
  getRecruitmentManpower,
  getSettlementMilitaryLevel,
  getSettlementMobilizationCapacity,
} from "@/lib/military/settlement-capacity";

import {
  getConcurrentRecruitmentSlots,
} from "@/lib/military/balance";

import {
  getFortificationDefinition,
  getMaximumFortificationLevel,
} from "@/lib/military/fortification-balance";

import {
  getRealmBudgetSnapshot,
} from "@/lib/economy/realm-budget";

import {
  getSettlementControllerId,
} from "@/lib/military/occupation";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  ResourceStockpile,
} from "@/types/resources";

import type {
  SettlementDevelopmentFocus,
} from "@/types/settlement";

import type {
  UnitType,
} from "@/types/military";

const FOCUSES:
  SettlementDevelopmentFocus[] = [
  "food",
  "gold",
  "wood",
  "stone",
  "metal",
];

const RECRUITABLE:
  UnitType[] = [
  "infantry",
  "cavalry",
  "siege",
];

function round2(
  value: number
): number {
  return Math.round(
    value * 100
  ) / 100;
}

function affordableBlocksByResources(
  available:
    ResourceStockpile,
  perBlock:
    ResourceStockpile
): number {
  const limits:
    number[] = [];

  for (
    const key
    of [
      "gold",
      "food",
      "wood",
      "stone",
      "metal",
    ] as const
  ) {
    const cost =
      perBlock[
        key
      ];

    if (
      cost <=
      0
    ) {
      continue;
    }

    limits.push(
      Math.floor(
        available[
          key
        ] /
          cost
      )
    );
  }

  return limits.length ===
    0
    ? 999
    : Math.max(
        0,
        Math.min(
          ...limits
        )
      );
}

export function getSettlementInvestmentPlan(
  settlementId: string,
  kingdomId: string
) {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    return {
      ok:
        false as const,
      error:
        "SETTLEMENT_NOT_FOUND" as const,
    };
  }

  if (
    getSettlementControllerId(
      settlement
    ) !==
    kingdomId
  ) {
    return {
      ok:
        false as const,
      error:
        "NOT_CONTROLLER" as const,
    };
  }

  const available =
    getAvailableSettlementResources(
      settlement.id
    );

  if (!available) {
    return {
      ok:
        false as const,
      error:
        "SETTLEMENT_RESOURCES_NOT_FOUND" as const,
    };
  }

  const currentDevelopment =
    settlement
      .developmentLevel ??
    0;

  const developmentCost =
    currentDevelopment <
    3
      ? getDevelopmentCost(
          currentDevelopment
        )
      : undefined;

  const developmentOptions =
    FOCUSES.map(
      (focus) => {
        const before =
          settlement
            .dailyProduction[
              focus
            ];

        const gain =
          Math.max(
            1,
            Math.round(
              before *
                0.2
            )
          );

        return {
          focus,
          currentDailyProduction:
            before,
          projectedDailyProduction:
            before +
            gain,
          projectedGain:
            gain,
          cost:
            developmentCost,
          canAfford:
            developmentCost !==
              undefined &&
            hasEnoughResources(
              available,
              developmentCost
            ),
          maxLevelReached:
            developmentCost ===
            undefined,
        };
      }
    );

  const militaryLevel =
    getSettlementMilitaryLevel(
      settlement.id
    );

  const mobilizationCapacity =
    getSettlementMobilizationCapacity(
      settlement.id
    ) ??
    0;

  const committedManpower =
    getCommittedRecruitmentManpower(
      world.recruitmentOrders,
      settlement.id,
      world.simulation
        .worldTimeMinutes
    );

  const remainingManpower =
    Math.max(
      0,
      mobilizationCapacity -
        committedManpower
    );

  const activeRecruitmentOrders =
    Object.values(
      world.recruitmentOrders
    ).filter(
      (order) =>
        order.settlementId ===
          settlement.id &&
        order.status ===
          "active"
    );

  const baseSlots =
    militaryLevel
      ? getConcurrentRecruitmentSlots(
          militaryLevel
        )
      : 0;

  const recruitmentOptions =
    RECRUITABLE.map(
      (unitType) => {
        const definition =
          RECRUITMENT_DEFINITIONS[
            unitType
          ];

        if (!definition) {
          return {
            unitType,
            recruitable:
              false,
            reason:
              "No recruitment definition.",
          };
        }

        const eligible =
          canSettlementRecruitUnit(
            settlement,
            unitType
          );

        const manpowerPerBlock =
          getRecruitmentManpower(
            unitType,
            1
          );

        const byManpower =
          manpowerPerBlock <=
          0
            ? 999
            : Math.floor(
                remainingManpower /
                  manpowerPerBlock
              );

        const byResources =
          affordableBlocksByResources(
            available,
            definition.cost
          );

        const extraSiegeSlot =
          unitType ===
            "siege" &&
          settlement.type ===
            "castle" &&
          activeRecruitmentOrders.filter(
            (order) =>
              order.unitType ===
              "siege"
          ).length ===
            0;

        const slotsAvailable =
          Math.max(
            0,
            baseSlots -
              activeRecruitmentOrders
                .length
          ) +
          (
            extraSiegeSlot
              ? 1
              : 0
          );

        const maxBlocksNow =
          eligible &&
          slotsAvailable >
            0
            ? Math.max(
                0,
                Math.min(
                  byManpower,
                  byResources
                )
              )
            : 0;

        return {
          unitType,
          recruitable:
            eligible,
          durationDays:
            definition
              .durationDays,
          costPerBlock:
            definition.cost,
          manpowerPerBlock,
          remainingManpower,
          slotsAvailable,
          maxBlocksNow,
          canRecruitOne:
            maxBlocksNow >=
            1,
          oneBlockCost:
            multiplyResources(
              definition.cost,
              1
            ),
        };
      }
    );

  const currentFortification =
    settlement
      .fortificationLevel ??
    0;

  const maxFortification =
    getMaximumFortificationLevel(
      settlement.type
    );

  const nextFortificationLevel =
    currentFortification <
    maxFortification
      ? (
          currentFortification +
          1
        )
      : undefined;

  const fortificationDefinition =
    nextFortificationLevel !==
      undefined
      ? getFortificationDefinition(
          settlement.type,
          nextFortificationLevel as
            1 |
            2 |
            3
        )
      : undefined;

  const activeFortification =
    Object.values(
      world.fortificationOrders
    ).find(
      (order) =>
        order.settlementId ===
          settlement.id &&
        order.status ===
          "active"
    );

  const budget =
    getRealmBudgetSnapshot(
      kingdomId
    );

  return {
    ok:
      true as const,

    settlement: {
      id:
        settlement.id,
      type:
        settlement.type,
      developmentLevel:
        currentDevelopment,
      developmentFocus:
        settlement
          .developmentFocus ??
        null,
      fortificationLevel:
        currentFortification,
      resources:
        settlement.resources,
      availableResources:
        available,
      dailyProduction:
        settlement.dailyProduction,
    },

    strategicBudget: {
      kingdomTreasury:
        budget.treasury,
      projectedDailyNetGold:
        budget
          .projectedDailyNetGold,
      recommendedReserveGold:
        budget
          .recommendedReserveGold,
      spendableGold:
        budget.spendableGold,
      reserveCoverageDays:
        budget
          .reserveCoverageDays,
    },

    development: {
      maxLevel:
        3,
      nextCost:
        developmentCost,
      options:
        developmentOptions,
    },

    recruitment: {
      militaryLevel:
        militaryLevel ??
        0,
      mobilizationCapacity,
      committedManpower,
      remainingManpower,
      baseSlots,
      activeOrders:
        activeRecruitmentOrders
          .length,
      options:
        recruitmentOptions,
    },

    fortification: {
      currentLevel:
        currentFortification,
      maximumLevel:
        maxFortification,
      nextLevel:
        nextFortificationLevel,
      activeOrderId:
        activeFortification
          ?.id,
      durationDays:
        fortificationDefinition
          ?.durationDays,
      nextCost:
        fortificationDefinition
          ?.cost,
      canAfford:
        Boolean(
          fortificationDefinition &&
          !activeFortification &&
          hasEnoughResources(
            available,
            fortificationDefinition
              .cost
          )
        ),
    },

    warnings: [
      budget
        .projectedDailyNetGold <
      0
        ? "Realm daily balance is negative; military expansion increases strategic risk."
        : undefined,

      budget
        .reserveCoverageDays <
      3
        ? "Treasury covers less than three days of current army upkeep."
        : undefined,

      activeRecruitmentOrders
        .length >=
      baseSlots &&
      baseSlots >
        0
        ? "Normal recruitment slots are currently saturated."
        : undefined,

      activeFortification
        ? "A fortification project is already active here."
        : undefined,
    ].filter(
      (
        value
      ): value is string =>
        Boolean(
          value
        )
    ),
  };
}
