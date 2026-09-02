import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  DirectorObserverTrace,
} from "@/types/events";

export function appendDirectorTrace(
  input: Omit<DirectorObserverTrace, "id" | "timestamp">
): DirectorObserverTrace {
  const sequence = allocateSimulationSequence();
  const trace: DirectorObserverTrace = {
    id: `director-trace-${sequence.toString().padStart(6, "0")}`,
    timestamp: getRuntimeWorldState().simulation.worldTimeMinutes,
    ...input,
  };

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        events: {
          ...current.session.director.events,
          traces: [
            ...current.session.director.events.traces,
            trace,
          ].slice(-200),
        },
      },
    },
  }));

  return trace;
}

export function inspectDirectorObserverTrace(): DirectorObserverTrace[] {
  return [...getRuntimeWorldState().session.director.events.traces];
}
