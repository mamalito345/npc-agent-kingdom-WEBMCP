import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import {
  processDailySettlementProduction,
} from "@/lib/economy/production";

import type {
  WorldMinute,
} from "@/types/simulation";

export function getNextDailyBoundary(
  currentTime: WorldMinute
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
  worldTime: WorldMinute
): void {
  if (
    worldTime %
      MINUTES_PER_DAY !==
    0
  ) {
    return;
  }

  processDailySettlementProduction();
}