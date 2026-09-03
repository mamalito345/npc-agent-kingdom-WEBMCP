import {
  addResources,
} from "@/types/resources";

import {
  getOccupationMultiplierForDays,
  getSettlementControllerId,
} from "@/lib/military/occupation";

import {
  getEffectiveSettlementProduction,
} from "@/lib/economy/settlement-economy";

import {
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import type {
  Settlement,
} from "@/types/settlement";

import type {
  WorldMinute,
} from "@/types/simulation";

function getSettlementProductionDamageMultiplier(
  settlement:
    Settlement,
  worldTime:
    WorldMinute
): number {
  const damage =
    settlement
      .productionDamage;

  if (
    !damage ||
    worldTime >=
      damage.until
  ) {
    return 1;
  }

  return damage.multiplier;
}

function getSettlementOccupationProductionMultiplier(
  settlement:
    Settlement,
  worldTime:
    WorldMinute
): number {
  const controller =
    getSettlementControllerId(
      settlement
    );

  if (
    controller ===
      settlement.kingdomId ||
    settlement.occupiedAt ===
      undefined
  ) {
    return 1;
  }

  const elapsed =
    Math.max(
      0,
      worldTime -
        settlement
          .occupiedAt
    );

  const occupiedDays =
    Math.floor(
      elapsed /
        MINUTES_PER_DAY
    );

  return getOccupationMultiplierForDays(
    occupiedDays
  );
}

export function processDailySettlementProduction():
  void {
  updateRuntimeWorldState(
    (
      current
    ) => {
      const settlements = {
        ...current.settlements,
      };

      const worldTime =
        current.simulation
          .worldTimeMinutes;

      for (
        const settlement
        of Object.values(
          current.settlements
        )
      ) {
        const base =
          getEffectiveSettlementProduction(
            settlement
          );

        const productionMultiplier =
          getSettlementProductionDamageMultiplier(
            settlement,
            worldTime
          ) *
          getSettlementOccupationProductionMultiplier(
            settlement,
            worldTime
          );

        const effectiveProduction = {
          food:
            base.food *
            productionMultiplier,
          gold:
            base.gold *
            productionMultiplier,
          wood:
            base.wood *
            productionMultiplier,
          stone:
            base.stone *
            productionMultiplier,
          metal:
            base.metal *
            productionMultiplier,
        };

        settlements[
          settlement.id
        ] = {
          ...settlement,
          resources:
            addResources(
              settlement.resources,
              effectiveProduction
            ),
        };
      }

      return {
        ...current,
        settlements,
      };
    }
  );
}
