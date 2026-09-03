import {
  getConnectedEdges,
} from "@/lib/map/graph";

import {
  getRoadSecurity,
} from "@/lib/economy/road-security";

import {
  getSettlementEconomicProfile,
} from "@/lib/economy/settlement-economy";

import {
  getKingdomTerritoryEconomy,
} from "@/lib/economy/territory-economy";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  SettlementTradeState,
} from "@/types/economy";

function clamp01(
  value:
    number
): number {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

function round2(
  value:
    number
): number {
  return Math.round(
    value *
    100
  ) /
  100;
}

export function getOccupationTradeMultiplier(
  settlementId:
    string
): number {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    throw new Error(
      `Settlement not found: ${settlementId}`
    );
  }

  const controller =
    settlement
      .controllerKingdomId ??
    settlement.kingdomId;

  if (
    controller ===
    settlement.kingdomId
  ) {
    return 1;
  }

  if (
    settlement.occupiedAt ===
    undefined
  ) {
    return 0.25;
  }

  const occupationMinutes =
    Math.max(
      0,
      world.simulation
        .worldTimeMinutes -
        settlement
          .occupiedAt
    );

  const occupationDays =
    Math.floor(
      occupationMinutes /
        1440
    );

  if (
    occupationDays <=
    7
  ) {
    return 0.25;
  }

  if (
    occupationDays <=
    20
  ) {
    return 0.5;
  }

  if (
    occupationDays <=
    40
  ) {
    return 0.75;
  }

  return 1;
}

export function getSettlementTradeState(
  settlementId:
    string
): SettlementTradeState {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    throw new Error(
      `Settlement not found: ${settlementId}`
    );
  }

  const edges =
    getConnectedEdges(
      settlement.locationId
    );

  const roadMultipliers =
    edges.map(
      (
        edge
      ) =>
        getRoadSecurity(
          edge.id
        ).multiplier
    );

  const averageRoadMultiplier =
    roadMultipliers.length ===
    0
      ? 0.65
      : roadMultipliers.reduce(
          (
            total,
            value
          ) =>
            total +
            value,
          0
        ) /
        roadMultipliers.length;

  const occupationMultiplier =
    getOccupationTradeMultiplier(
      settlementId
    );

  const tradeMultiplier =
    clamp01(
      averageRoadMultiplier *
        occupationMultiplier
    );

  const economy =
    getSettlementEconomicProfile(
      settlementId
    );

  /*
   * Taxes are less sensitive to roads than commerce; occupation still
   * suppresses both. This keeps an isolated settlement useful while making
   * road control economically meaningful.
   */
  const dailyTaxGold =
    economy.taxBaseGold *
    (
      0.75 +
      averageRoadMultiplier *
        0.25
    ) *
    occupationMultiplier;

  const dailyMarketGold =
    economy.marketBaseGold *
    tradeMultiplier;

  const dailyTradeGold =
    Math.max(
      0,
      dailyTaxGold +
        dailyMarketGold
    );

  return {
    settlementId,
    connectedRoadCount:
      edges.length,
    averageRoadMultiplier:
      round2(
        averageRoadMultiplier
      ),
    occupationMultiplier:
      round2(
        occupationMultiplier
      ),
    tradeMultiplier:
      round2(
        tradeMultiplier
      ),
    dailyTaxGold:
      round2(
        dailyTaxGold
      ),
    dailyMarketGold:
      round2(
        dailyMarketGold
      ),
    grossEconomicGold:
      round2(
        economy.taxBaseGold +
        economy.marketBaseGold
      ),
    dailyTradeGold:
      round2(
        dailyTradeGold
      ),
  };
}

export function getKingdomDailySettlementTradeIncome(
  kingdomId:
    string
): number {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.settlements
  )
    .filter(
      (
        settlement
      ) =>
        (
          settlement
            .controllerKingdomId ??
          settlement.kingdomId
        ) ===
        kingdomId
    )
    .reduce(
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
}

export function getKingdomDailyTradeIncome(
  kingdomId:
    string
): number {
  return (
    getKingdomDailySettlementTradeIncome(
      kingdomId
    ) +
    getKingdomTerritoryEconomy(
      kingdomId
    ).dailyTerritoryGold
  );
}

export function processDailyTradeIncome():
  void {
  const world =
    getRuntimeWorldState();

  const kingdomIds =
    Object.keys(
      world.kingdoms
    ).sort();

  const incomeByKingdom:
    Record<
      string,
      number
    > = {};

  for (
    const kingdomId
    of kingdomIds
  ) {
    incomeByKingdom[
      kingdomId
    ] =
      getKingdomDailyTradeIncome(
        kingdomId
      );
  }

  updateRuntimeWorldState(
    (
      current
    ) => {
      const kingdoms = {
        ...current.kingdoms,
      };

      for (
        const kingdomId
        of kingdomIds
      ) {
        const kingdom =
          kingdoms[
            kingdomId
          ];

        if (!kingdom) {
          continue;
        }

        kingdoms[
          kingdomId
        ] = {
          ...kingdom,
          treasury:
            Math.max(
              0,
              kingdom.treasury +
                (
                  incomeByKingdom[
                    kingdomId
                  ] ??
                  0
                )
            ),
        };
      }

      return {
        ...current,
        kingdoms,
      };
    }
  );
}
