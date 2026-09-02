import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  EVENT_DEFINITION_BY_ID,
} from "@/data/events/catalog";

import type {
  EventCandidate,
} from "@/types/events";

function key(candidate: EventCandidate): string {
  return `${candidate.definitionId}:${candidate.kingdomId ?? "global"}`;
}

export function isEventOnCooldown(candidate: EventCandidate): boolean {
  const until =
    getRuntimeWorldState().session.director.events.cooldownUntil[key(candidate)] ?? 0;

  return getRuntimeWorldState().simulation.worldTimeMinutes < until;
}

export function setEventCooldown(candidate: EventCandidate): void {
  const definition = EVENT_DEFINITION_BY_ID[candidate.definitionId];

  if (!definition?.cooldownHours) {
    return;
  }

  const until =
    getRuntimeWorldState().simulation.worldTimeMinutes +
    definition.cooldownHours * 60;

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        events: {
          ...current.session.director.events,
          cooldownUntil: {
            ...current.session.director.events.cooldownUntil,
            [key(candidate)]: until,
          },
        },
      },
    },
  }));
}
