import {
  getRuntimeWorldState,
  getWorldTime,
  setWorldPaused,
} from "@/lib/world/runtime";

import type { WorldMinute } from "@/types/simulation";

export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY =
  MINUTES_PER_HOUR * HOURS_PER_DAY;

export function pauseWorld(): void {
  setWorldPaused(true);
}

export function resumeWorld(): void {
  setWorldPaused(false);
}

export function isWorldPaused(): boolean {
  return getRuntimeWorldState().simulation.paused;
}

export function getCurrentWorldTime(): WorldMinute {
  return getWorldTime();
}

export function formatWorldTime(
  worldMinute: WorldMinute
): string {
  const normalizedMinute = Math.max(
    0,
    Math.floor(worldMinute)
  );

  const day =
    Math.floor(
      normalizedMinute / MINUTES_PER_DAY
    ) + 1;

  const minuteWithinDay =
    normalizedMinute % MINUTES_PER_DAY;

  const hour = Math.floor(
    minuteWithinDay / MINUTES_PER_HOUR
  );

  const minute =
    minuteWithinDay % MINUTES_PER_HOUR;

  return `Day ${day} — ${hour
    .toString()
    .padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}