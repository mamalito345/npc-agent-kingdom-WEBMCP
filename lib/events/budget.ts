import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  DirectorEventCategory,
  EventCandidate,
} from "@/types/events";

export const MAX_GLOBAL_EVENTS_PER_DAY = 4;
export const MAX_MAJOR_EVENTS_PER_KINGDOM_PER_DAY = 1;

const CADENCE_MINUTES: Record<DirectorEventCategory, number> = {
  TRAVEL: 12 * 60,
  CAMPAIGN: 24 * 60,
  BATTLE: 60,
  SIEGE: 24 * 60,
  POLITICAL: 24 * 60,
  ECONOMIC: 24 * 60,
  DIPLOMATIC: 12 * 60,
};

function currentDayIndex(): number {
  return Math.floor(
    getRuntimeWorldState().simulation.worldTimeMinutes / (24 * 60)
  );
}

export function ensureCurrentEventBudget(): void {
  const dayIndex = currentDayIndex();
  const budget = getRuntimeWorldState().session.director.events.dailyBudget;

  if (budget.dayIndex === dayIndex) {
    return;
  }

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        events: {
          ...current.session.director.events,
          dailyBudget: {
            dayIndex,
            globalCount: 0,
            kingdomCounts: {},
          },
        },
      },
    },
  }));
}

export function canSpendEventBudget(candidate: EventCandidate): boolean {
  ensureCurrentEventBudget();

  const budget = getRuntimeWorldState().session.director.events.dailyBudget;

  if (budget.globalCount >= MAX_GLOBAL_EVENTS_PER_DAY) {
    return false;
  }

  if (!candidate.kingdomId) {
    return true;
  }

  return (
    (budget.kingdomCounts[candidate.kingdomId] ?? 0) <
    MAX_MAJOR_EVENTS_PER_KINGDOM_PER_DAY
  );
}

export function spendEventBudget(candidate: EventCandidate): void {
  ensureCurrentEventBudget();

  updateRuntimeWorldState((current) => {
    const budget = current.session.director.events.dailyBudget;
    const kingdomId = candidate.kingdomId;

    return {
      ...current,
      session: {
        ...current.session,
        director: {
          ...current.session.director,
          events: {
            ...current.session.director.events,
            dailyBudget: {
              ...budget,
              globalCount: budget.globalCount + 1,
              kingdomCounts: kingdomId
                ? {
                    ...budget.kingdomCounts,
                    [kingdomId]: (budget.kingdomCounts[kingdomId] ?? 0) + 1,
                  }
                : budget.kingdomCounts,
            },
          },
        },
      },
    };
  });
}

export function categoryDue(category: DirectorEventCategory): boolean {
  return (
    getRuntimeWorldState().simulation.worldTimeMinutes >=
    getRuntimeWorldState().session.director.events.nextChecks[category]
  );
}

export function markCategoryChecked(category: DirectorEventCategory): void {
  const now = getRuntimeWorldState().simulation.worldTimeMinutes;

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        events: {
          ...current.session.director.events,
          nextChecks: {
            ...current.session.director.events.nextChecks,
            [category]: now + CADENCE_MINUTES[category],
          },
        },
      },
    },
  }));
}
