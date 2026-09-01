import {
  getNextScheduledEvent,
  processDueEvents,
} from "@/lib/world/events";

import {
  advanceMovementPositionsTo,
  getNextWorldMovementBoundaryTime,
  resolveCompletedMovements,
} from "@/lib/world/movement";

import {
  getWorldTime,
  setWorldTime,
} from "@/lib/world/runtime";

import type {
  AdvanceWorldResult,
  WorldMinute,
} from "@/types/simulation";

function getEarliestRelevantMoment(
  currentTime: WorldMinute,
  targetTime: WorldMinute
): WorldMinute {
  let nextMoment = targetTime;

  const nextEvent =
    getNextScheduledEvent();

  if (
    nextEvent &&
    nextEvent.executeAt >= currentTime &&
    nextEvent.executeAt < nextMoment
  ) {
    nextMoment =
      nextEvent.executeAt;
  }

  const movementBoundary =
    getNextWorldMovementBoundaryTime(
      currentTime
    );

  if (
    movementBoundary !== undefined &&
    movementBoundary < nextMoment
  ) {
    nextMoment =
      movementBoundary;
  }

  return nextMoment;
}

export function advanceWorldUntil(
  targetTime: WorldMinute
): AdvanceWorldResult {
  let currentTime = getWorldTime();

  if (targetTime <= currentTime) {
    return {
      reachedTarget: true,
      currentTime,
    };
  }

  while (currentTime < targetTime) {
    const dueAtCurrentTime =
      processDueEvents(currentTime);

    if (
      dueAtCurrentTime.interrupt
    ) {
      return {
        reachedTarget: false,
        currentTime,

        interrupt:
          dueAtCurrentTime.interrupt,
      };
    }

    const nextMoment =
      getEarliestRelevantMoment(
        currentTime,
        targetTime
      );

    if (nextMoment <= currentTime) {
      throw new Error(
        "Simulation failed to advance time."
      );
    }

    advanceMovementPositionsTo(
      nextMoment
    );

    setWorldTime(nextMoment);

    currentTime = nextMoment;

    const eventResult =
      processDueEvents(currentTime);

    resolveCompletedMovements(
      currentTime
    );

    if (eventResult.interrupt) {
      return {
        reachedTarget: false,

        currentTime,

        interrupt:
          eventResult.interrupt,
      };
    }
  }

  return {
    reachedTarget: true,
    currentTime,
  };
}

export function advanceWorldBy(
  minutes: number
): AdvanceWorldResult {
  if (minutes < 0) {
    throw new Error(
      "Cannot advance world by a negative duration."
    );
  }

  return advanceWorldUntil(
    getWorldTime() + minutes
  );
}