import {
  MAX_SUPPLY_DAYS,
} from "@/lib/military/balance";

import {
  getArmyDailyCosts,
} from "@/lib/military/army-queries";

export function getArmyFoodLootCapacity(
  armyId: string,
  currentFood:
    number
): number {
  const upkeep =
    getArmyDailyCosts(
      armyId
    );

  if (
    upkeep.food <= 0
  ) {
    return 0;
  }

  const maximum =
    upkeep.food *
    MAX_SUPPLY_DAYS;

  return Math.max(
    0,
    maximum -
      currentFood
  );
}