import {
  addResources,
} from "@/types/resources";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

export function processDailySettlementProduction(): void {
  updateRuntimeWorldState((current) => {
    const settlements = {
      ...current.settlements,
    };

    for (const settlement of Object.values(
      current.settlements
    )) {
      settlements[settlement.id] = {
        ...settlement,

        resources: addResources(
          settlement.resources,
          settlement.dailyProduction
        ),
      };
    }

    return {
      ...current,
      settlements,
    };
  });
}