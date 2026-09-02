import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  DirectorEventRuntimeState,
} from "@/types/events";

export function exportDirectorEventState(): string {
  return JSON.stringify(
    getRuntimeWorldState().session.director.events
  );
}

export function importDirectorEventState(
  serialized: string
): void {
  const parsed = JSON.parse(serialized) as DirectorEventRuntimeState;

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !parsed.instances ||
    !parsed.traces ||
    !parsed.cooldownUntil ||
    !parsed.dailyBudget ||
    !parsed.nextChecks
  ) {
    throw new Error("INVALID_DIRECTOR_EVENT_STATE");
  }

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        events: parsed,
      },
    },
  }));
}
