import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  ResolvedEvent,
  ScheduledEvent,
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

type ScheduledEventDraft =
  | {
      type: "SIMULATION_MARKER";
      executeAt: WorldMinute;
      payload: {
        label: string;
      };
      causeEventIds?: string[];
      sourceActionId?: string;
    }
  | {
      type: "SIMULATION_INTERRUPT";
      executeAt: WorldMinute;
      payload: {
        interruptType: string;
        message: string;
      };
      causeEventIds?: string[];
      sourceActionId?: string;
    };

function compareEvents(
  a: ScheduledEvent,
  b: ScheduledEvent
): number {
  if (a.executeAt !== b.executeAt) {
    return a.executeAt - b.executeAt;
  }

  return a.sequence - b.sequence;
}

export function scheduleEvent(
  draft: ScheduledEventDraft
): ScheduledEvent {
  const sequence = allocateSimulationSequence();

  const id = `event-${sequence
    .toString()
    .padStart(6, "0")}`;

  let event: ScheduledEvent;

  if (draft.type === "SIMULATION_MARKER") {
    event = {
      id,
      type: "SIMULATION_MARKER",
      executeAt: draft.executeAt,
      sequence,

      payload: {
        label: draft.payload.label,
      },

      causeEventIds: draft.causeEventIds ?? [],
      sourceActionId: draft.sourceActionId,
    };
  } else {
    event = {
      id,
      type: "SIMULATION_INTERRUPT",
      executeAt: draft.executeAt,
      sequence,

      payload: {
        interruptType:
          draft.payload.interruptType,

        message:
          draft.payload.message,
      },

      causeEventIds: draft.causeEventIds ?? [],
      sourceActionId: draft.sourceActionId,
    };
  }

  updateRuntimeWorldState((current) => {
    const scheduledEvents = [
      ...current.simulation.scheduledEvents,
      event,
    ].sort(compareEvents);

    return {
      ...current,

      simulation: {
        ...current.simulation,
        scheduledEvents,
      },
    };
  });

  return event;
}

export function scheduleMarkerEvent(
  executeAt: WorldMinute,
  label: string
): ScheduledEvent {
  return scheduleEvent({
    type: "SIMULATION_MARKER",
    executeAt,

    payload: {
      label,
    },
  });
}

export function scheduleInterruptEvent(
  executeAt: WorldMinute,
  interruptType: string,
  message: string
): ScheduledEvent {
  return scheduleEvent({
    type: "SIMULATION_INTERRUPT",
    executeAt,

    payload: {
      interruptType,
      message,
    },
  });
}

export function getNextScheduledEvent():
  | ScheduledEvent
  | undefined {
  return getRuntimeWorldState()
    .simulation
    .scheduledEvents
    .slice()
    .sort(compareEvents)[0];
}

export function processDueEvents(
  currentTime: WorldMinute
): {
  interrupt?: SimulationInterrupt;
} {
  const state = getRuntimeWorldState();

  const dueEvents =
    state.simulation.scheduledEvents
      .filter(
        (event) =>
          event.executeAt <= currentTime
      )
      .sort(compareEvents);

  if (dueEvents.length === 0) {
    return {};
  }

  const dueEventIds = new Set(
    dueEvents.map((event) => event.id)
  );

  const remainingEvents =
    state.simulation.scheduledEvents.filter(
      (event) =>
        !dueEventIds.has(event.id)
    );

  const resolvedEvents: ResolvedEvent[] = [];

  let firstInterrupt:
    | SimulationInterrupt
    | undefined;

  for (const event of dueEvents) {
    if (event.type === "SIMULATION_MARKER") {
      resolvedEvents.push({
        id: event.id,
        type: event.type,

        timestamp: currentTime,

        causeEventIds:
          event.causeEventIds,

        sourceActionId:
          event.sourceActionId,

        result: {
          summary:
            event.payload.label,
        },
      });

      continue;
    }

    resolvedEvents.push({
      id: event.id,
      type: event.type,

      timestamp: currentTime,

      causeEventIds:
        event.causeEventIds,

      sourceActionId:
        event.sourceActionId,

      result: {
        summary:
          event.payload.message,
      },
    });

    if (!firstInterrupt) {
      firstInterrupt = {
        eventId: event.id,

        type:
          event.payload.interruptType,

        message:
          event.payload.message,
      };
    }
  }

  updateRuntimeWorldState((current) => ({
    ...current,

    simulation: {
      ...current.simulation,

      scheduledEvents:
        remainingEvents,

      resolvedEvents: [
        ...current.simulation.resolvedEvents,
        ...resolvedEvents,
      ],
    },
  }));

  return {
    interrupt: firstInterrupt,
  };
}