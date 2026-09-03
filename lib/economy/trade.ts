import {
  getConnectedEdges,
} from "@/lib/map/graph";

import {
  getRoadSecurity,
} from "@/lib/economy/road-security";

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
  value: number
): number {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

export function getOccupationTradeMultiplier(
  settlementId: string
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
    settlement.controllerKingdomId ??
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
        settlement.occupiedAt
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
  settlementId: string
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
      (edge) =>
        getRoadSecurity(
          edge.id
        ).multiplier
    );

  const averageRoadMultiplier =
    roadMultipliers.length ===
    0
      ? 0
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

  const dailyTradeGold =
    Math.max(
      0,
      settlement.dailyProduction.gold *
        tradeMultiplier
    );

  return {
    settlementId,
    connectedRoadCount:
      edges.length,
    averageRoadMultiplier,
    occupationMultiplier,
    tradeMultiplier,
    dailyTradeGold,
  };
}

export function getKingdomDailySettlementTradeIncome(
  kingdomId: string
): number {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.settlements
  )
    .filter(
      (settlement) =>
        (
          settlement.controllerKingdomId ??
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
  kingdomId: string
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
    (current) => {
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
