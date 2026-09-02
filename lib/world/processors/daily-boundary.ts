import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import {
  processDailySettlementProduction,
} from "@/lib/economy/production";

import {
  processDailyTradeIncome,
} from "@/lib/economy/trade";

import {
  processDailyMilitaryEconomy,
} from "@/lib/military/daily";

import type {
  WorldMinute,
} from "@/types/simulation";

export function getNextDailyBoundary(
  currentTime:
    WorldMinute
): WorldMinute {
  const completedDays =
    Math.floor(
      currentTime /
        MINUTES_PER_DAY
    );

  return (
    (completedDays + 1) *
    MINUTES_PER_DAY
  );
}

export function processDailyBoundary(
  worldTime:
    WorldMinute
): void {
  if (
    worldTime %
      MINUTES_PER_DAY !==
    0
  ) {
    return;
  }

  //
  // 1. Physical settlement production.
  //
  processDailySettlementProduction();

  //
  // 2. Road/trade income enters
  //    central kingdom treasury.
  //
  processDailyTradeIncome();

  //
  // 3. Army campaign/garrison costs
  //    are paid from central treasury.
  //
  processDailyMilitaryEconomy();
}