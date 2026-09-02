import {
  getNextScheduledEvent,
  processDueEvents,
} from "@/lib/world/events";

import {
  getNextFortificationRepairBoundary,
  processFortificationRepairs,
} from "@/lib/military/fortification-repair-completion";

import {
  getNextFortificationCompletionBoundary,
  processFortificationCompletions,
} from "@/lib/military/fortification-completion";

import {
  advanceMovementPositionsTo,
  getNextWorldMovementBoundaryTime,
  resolveCompletedMovements,
} from "@/lib/world/movement";

import {
  processCourierArrivals,
} from "@/lib/world/couriers";

import {
  getWorldTime,
  setWorldTime,
} from "@/lib/world/runtime";

import {
  getNextDailyBoundary,
  processDailyBoundary,
} from "@/lib/world/processors/daily-boundary";

import {
  processArmyContactInterrupt,
} from "@/lib/military/contact-interrupt";

import {
  getNextSettlementOperationBoundary,
  processSettlementOperations,
} from "@/lib/military/settlement-operations";

import {
  getNextRecruitmentCompletionBoundary,
  processRecruitmentCompletions,
} from "@/lib/military/recruitment-completion";

import type {
  AdvanceWorldResult,
  WorldMinute,
} from "@/types/simulation";

function getEarliestRelevantMoment(
  currentTime:
    WorldMinute,
  targetTime:
    WorldMinute
): WorldMinute {
  let nextMoment =
    targetTime;

  //
  // 1. Scheduled events
  //
  const nextEvent =
    getNextScheduledEvent();

  if (
    nextEvent &&
    nextEvent.executeAt >
      currentTime &&
    nextEvent.executeAt <
      nextMoment
  ) {
    nextMoment =
      nextEvent.executeAt;
  }

  //
  // 2. Generic movement
  //
  const movementBoundary =
    getNextWorldMovementBoundaryTime(
      currentTime
    );

  if (
    movementBoundary !==
      undefined &&
    movementBoundary >
      currentTime &&
    movementBoundary <
      nextMoment
  ) {
    nextMoment =
      movementBoundary;
  }

  //
  // 3. Recruitment completion
  //
  const recruitmentBoundary =
    getNextRecruitmentCompletionBoundary();

  if (
    recruitmentBoundary !==
      undefined &&
    recruitmentBoundary >
      currentTime &&
    recruitmentBoundary <
      nextMoment
  ) {
    nextMoment =
      recruitmentBoundary;
  }

  //
  // 4. Raid / settlement operations
  //
  const settlementOperationBoundary =
    getNextSettlementOperationBoundary();

  if (
    settlementOperationBoundary !==
      undefined &&
    settlementOperationBoundary >
      currentTime &&
    settlementOperationBoundary <
      nextMoment
  ) {
    nextMoment =
      settlementOperationBoundary;
  }
  const fortificationBoundary =
    getNextFortificationCompletionBoundary();

  if (
    fortificationBoundary !==
      undefined &&
    fortificationBoundary >
      currentTime &&
    fortificationBoundary <
      nextMoment
  ) {
    nextMoment =
      fortificationBoundary;
  }
  const fortificationRepairBoundary =
    getNextFortificationRepairBoundary();

  if (
    fortificationRepairBoundary !==
      undefined &&
    fortificationRepairBoundary >
      currentTime &&
    fortificationRepairBoundary <
      nextMoment
  ) {
    nextMoment =
      fortificationRepairBoundary;
  }
  //
  // 5. Daily economy
  //
  const dailyBoundary =
    getNextDailyBoundary(
      currentTime
    );

  if (
    dailyBoundary >
      currentTime &&
    dailyBoundary <
      nextMoment
  ) {
    nextMoment =
      dailyBoundary;
  }

  return nextMoment;
}

function processSimulationMoment(
  worldTime:
    WorldMinute
): {
  interrupt?:
    AdvanceWorldResult[
      "interrupt"
    ];
} {
  //
  // Scheduled world events
  //
  const eventResult =
    processDueEvents(
      worldTime
    );

  if (
    eventResult.interrupt
  ) {
    return {
      interrupt:
        eventResult
          .interrupt,
    };
  }

  //
  // Resolve generic movement
  //
  resolveCompletedMovements(
    worldTime
  );

  //
  // Courier delivery
  //
  processCourierArrivals();

  //
  // Recruitment completion
  //
  processRecruitmentCompletions(
    worldTime
  );

  //
  // Raid / settlement operation completion
  //
  processSettlementOperations(
    worldTime
  );

  processFortificationCompletions(
    worldTime
  );

  processFortificationRepairs(
    worldTime
  );
   //
  // Army contact occurs after
  // movement has resolved.
  //
  const armyContact =
    processArmyContactInterrupt();

  if (
    armyContact
  ) {
    return {
      interrupt:
        armyContact,
    };
  }

  //
  // Daily economy + military upkeep
  //
  processDailyBoundary(
    worldTime
  );

  return {};
}

export function advanceWorldUntil(
  targetTime:
    WorldMinute
): AdvanceWorldResult {
  let currentTime =
    getWorldTime();

  if (
    targetTime <=
    currentTime
  ) {
    return {
      reachedTarget:
        true,

      currentTime,
    };
  }

  while (
    currentTime <
    targetTime
  ) {
    //
    // Resolve events that are
    // already due now.
    //
    const dueAtCurrentTime =
      processDueEvents(
        currentTime
      );

    if (
      dueAtCurrentTime
        .interrupt
    ) {
      return {
        reachedTarget:
          false,

        currentTime,

        interrupt:
          dueAtCurrentTime
            .interrupt,
      };
    }

    //
    // Choose nearest important
    // simulation moment.
    //
    const nextMoment =
      getEarliestRelevantMoment(
        currentTime,
        targetTime
      );

    if (
      nextMoment <=
      currentTime
    ) {
      throw new Error(
        "Simulation failed to advance time."
      );
    }

    //
    // Move all moving entities
    // forward to that exact time.
    //
    advanceMovementPositionsTo(
      nextMoment
    );

    //
    // Advance canonical clock.
    //
    setWorldTime(
      nextMoment
    );

    currentTime =
      nextMoment;

    //
    // Resolve everything that
    // happens now.
    //
    const processed =
      processSimulationMoment(
        currentTime
      );

    if (
      processed.interrupt
    ) {
      return {
        reachedTarget:
          false,

        currentTime,

        interrupt:
          processed
            .interrupt,
      };
    }
  }

  return {
    reachedTarget:
      true,

    currentTime,
  };
}

export function advanceWorldBy(
  minutes:
    number
): AdvanceWorldResult {
  if (
    minutes < 0
  ) {
    throw new Error(
      "Cannot advance world by a negative duration."
    );
  }

  return advanceWorldUntil(
    getWorldTime() +
      minutes
  );
}