import {
  addResources,
} from "@/types/resources";

import {
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  Settlement,
} from "@/types/settlement";

import type {
  WorldMinute,
} from "@/types/simulation";

function getSettlementProductionMultiplier(
  settlement: Settlement,
  worldTime: WorldMinute
): number {
  const damage =
    settlement.productionDamage;

  if (
    !damage ||
    worldTime >= damage.until
  ) {
    return 1;
  }

  return damage.multiplier;
}

export function processDailySettlementProduction(): void {
  updateRuntimeWorldState(
    (current) => {
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
        const productionMultiplier =
          getSettlementProductionMultiplier(
            settlement,
            worldTime
          );

        const effectiveProduction = {
          food:
            settlement
              .dailyProduction
              .food *
            productionMultiplier,

          gold:
            settlement
              .dailyProduction
              .gold *
            productionMultiplier,

          wood:
            settlement
              .dailyProduction
              .wood *
            productionMultiplier,

          stone:
            settlement
              .dailyProduction
              .stone *
            productionMultiplier,

          metal:
            settlement
              .dailyProduction
              .metal *
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