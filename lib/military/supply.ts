import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmyDailyCosts,
  getArmyNodeId,
} from "@/lib/military/army-queries";

import {
  MAX_SUPPLY_DAYS,
  TARGET_SUPPLY_DAYS,
  CRITICAL_SUPPLY_DAYS,
} from "@/lib/military/balance";

import type {
  SupplyState,
} from "@/types/military";

export function getArmySupplyDays(
  armyId: string
): number {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return 0;
  }

  const dailyFood =
    getArmyDailyCosts(
      armyId
    ).food;

  if (
    dailyFood <= 0
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    army.supply
      .foodSupply /
    dailyFood
  );
}

export function getSupplyStateForDays(
  days: number
): SupplyState {
  if (days <= 0) {
    return "starving";
  }

  if (
    days <=
    CRITICAL_SUPPLY_DAYS
  ) {
    return "critical_supply";
  }

  if (
    days <
    TARGET_SUPPLY_DAYS
  ) {
    return "low_supply";
  }

  return "supplied";
}
export function refreshArmySupplyState(
  armyId: string
): void {
  const days =
    getArmySupplyDays(
      armyId
    );

  updateRuntimeWorldState(
    (current) => {
      const army =
        current.armies[
          armyId
        ];

      if (!army) {
        return current;
      }

      return {
        ...current,

        armies: {
          ...current.armies,

          [armyId]: {
            ...army,

            supply: {
              ...army.supply,

              state:
                getSupplyStateForDays(
                  days
                ),
            },
          },
        },
      };
    }
  );
}

export type ResupplyArmyError =
  | "ARMY_NOT_FOUND"
  | "ARMY_NOT_AT_NODE"
  | "SETTLEMENT_NOT_FOUND"
  | "NOT_FRIENDLY_SETTLEMENT"
  | "NO_FOOD_REQUIRED"
  | "NO_SETTLEMENT_FOOD";

export type ResupplyArmyResult =
  | {
      ok: false;
      error:
        ResupplyArmyError;
    }
  | {
      ok: true;
      foodTransferred:
        number;
    };

export function resupplyArmy(
  armyId: string
): ResupplyArmyResult {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  const nodeId =
    getArmyNodeId(
      armyId
    );

  if (!nodeId) {
    return {
      ok: false,
      error:
        "ARMY_NOT_AT_NODE",
    };
  }

  const settlement =
    world.settlements[
      nodeId
    ];

  if (!settlement) {
    return {
      ok: false,
      error:
        "SETTLEMENT_NOT_FOUND",
    };
  }

  if (
    settlement.kingdomId !==
    army.ownerId
  ) {
    return {
      ok: false,
      error:
        "NOT_FRIENDLY_SETTLEMENT",
    };
  }

  const dailyFood =
    getArmyDailyCosts(
      armyId
    ).food;

  const maxFood =
    dailyFood *
    MAX_SUPPLY_DAYS;

  const targetFood =
    dailyFood *
    TARGET_SUPPLY_DAYS;

  const requested =
    Math.max(
      0,
      Math.min(
        targetFood -
          army.supply
            .foodSupply,
        maxFood -
          army.supply
            .foodSupply
      )
    );

  if (
    requested <= 0
  ) {
    return {
      ok: false,
      error:
        "NO_FOOD_REQUIRED",
    };
  }

  const transferred =
    Math.min(
      requested,
      settlement
        .resources
        .food
    );

  if (
    transferred <= 0
  ) {
    return {
      ok: false,
      error:
        "NO_SETTLEMENT_FOOD",
    };
  }

  updateRuntimeWorldState(
    (current) => {
      const currentArmy =
        current.armies[
          armyId
        ];

      const currentSettlement =
        current.settlements[
          settlement.id
        ];

      return {
        ...current,

        armies: {
          ...current.armies,

          [armyId]: {
            ...currentArmy,

            supply: {
              ...currentArmy
                .supply,

              foodSupply:
                currentArmy
                  .supply
                  .foodSupply +
                transferred,
            },
          },
        },

        settlements: {
          ...current.settlements,

          [settlement.id]: {
            ...currentSettlement,

            resources: {
              ...currentSettlement
                .resources,

              food:
                currentSettlement
                  .resources
                  .food -
                transferred,
            },
          },
        },
      };
    }
  );

  refreshArmySupplyState(
    armyId
  );

  return {
    ok: true,

    foodTransferred:
      transferred,
  };
}