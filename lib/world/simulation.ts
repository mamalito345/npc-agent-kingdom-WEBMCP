import {
  getNextScheduledEvent,
  processDueEvents,
} from "@/lib/world/events";

import {
  getNextSiegeBoundary,
  processSieges,
} from "@/lib/military/siege";

import {
  getNextBattleBoundary,
  processBattlePhases,
} from "@/lib/military/battle-processing";

import {
  getPendingBattleDecisionInterrupt,
} from "@/lib/military/battle-decisions";

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

import {
  getNextRoadEncounterBoundary,
  processRoadEncountersAt,
} from "@/lib/military/road-encounters";

import {
  executeQueuedStrategicOrders,
} from "@/lib/session/executor";

import {
  processStrategicOrderLifecycle,
} from "@/lib/session/order-lifecycle";

import {
  getNextStrategicBriefingBoundary,
  processStrategicBriefings,
} from "@/lib/session/intelligence";

import {
  processBorderIncidentsAt,
} from "@/lib/world/border-incidents";

import {
  checkAndApplyCampaignEnd,
} from "@/lib/campaign/objectives";

import type {
  AdvanceWorldResult,
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

function chooseEarlierMoment(
  currentTime: WorldMinute,
  currentCandidate: WorldMinute,
  candidate: WorldMinute | undefined
): WorldMinute {
  if (
    candidate === undefined ||
    candidate <= currentTime ||
    candidate >= currentCandidate
  ) {
    return currentCandidate;
  }

  return candidate;
}

function getEarliestRelevantMoment(
  currentTime: WorldMinute,
  targetTime: WorldMinute
): WorldMinute {
  let nextMoment =
    targetTime;

  const nextEvent =
    getNextScheduledEvent();

  if (nextEvent) {
    nextMoment =
      chooseEarlierMoment(
        currentTime,
        nextMoment,
        nextEvent.executeAt
      );
  }

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextRoadEncounterBoundary(
        currentTime
      )
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextWorldMovementBoundaryTime(
        currentTime
      )
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextRecruitmentCompletionBoundary()
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextSettlementOperationBoundary()
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextFortificationCompletionBoundary()
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextFortificationRepairBoundary()
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextBattleBoundary()
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextSiegeBoundary()
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextStrategicBriefingBoundary()
    );

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextDailyBoundary(
        currentTime
      )
    );

  return nextMoment;
}

function processSimulationMoment(
  worldTime: WorldMinute
): {
  interrupt?: SimulationInterrupt;
} {
  let interrupt:
    SimulationInterrupt |
    undefined;

  const eventResult =
    processDueEvents(
      worldTime
    );

  if (eventResult.interrupt) {
    interrupt =
      eventResult.interrupt;
  }

  /*
   * Border incidents resolve at the actual movement boundary where an army
   * begins traversing a cross-realm edge. This occurs before road contact /
   * movement completion, so the political consequence is tied to physical
   * movement rather than order issuance.
   */
  const borderInterrupt =
    processBorderIncidentsAt(
      worldTime
    );

  if (
    !interrupt &&
    borderInterrupt
  ) {
    interrupt =
      borderInterrupt;
  }

  const roadInterrupt =
    processRoadEncountersAt(
      worldTime
    );

  if (
    !interrupt &&
    roadInterrupt
  ) {
    interrupt =
      roadInterrupt;
  }

  processStrategicOrderLifecycle(
    worldTime
  );

  resolveCompletedMovements(
    worldTime
  );

  processCourierArrivals();

  processRecruitmentCompletions(
    worldTime
  );

  processSettlementOperations(
    worldTime
  );

  processFortificationCompletions(
    worldTime
  );

  processFortificationRepairs(
    worldTime
  );

  processSieges(
    worldTime
  );

  const lifecycleInterrupt =
    processStrategicOrderLifecycle(
      worldTime
    );

  if (
    !interrupt &&
    lifecycleInterrupt
  ) {
    interrupt =
      lifecycleInterrupt;
  }

  const battleInterrupt =
    processBattlePhases(
      worldTime
    );

  if (
    !interrupt &&
    battleInterrupt
  ) {
    interrupt =
      battleInterrupt;
  }

  const armyContactInterrupt =
    processArmyContactInterrupt();

  if (
    !interrupt &&
    armyContactInterrupt
  ) {
    interrupt =
      armyContactInterrupt;
  }

  const dailyBoundaryInterrupt =
    processDailyBoundary(
      worldTime
    );

  if (
    !interrupt &&
    dailyBoundaryInterrupt
  ) {
    interrupt =
      dailyBoundaryInterrupt;
  }

  const briefingInterrupt =
    processStrategicBriefings(
      worldTime
    );

  if (
    !interrupt &&
    briefingInterrupt
  ) {
    interrupt =
      briefingInterrupt;
  }

  checkAndApplyCampaignEnd();

  return {
    interrupt,
  };
}

export function advanceWorldUntil(
  targetTime: WorldMinute
): AdvanceWorldResult {
  let currentTime =
    getWorldTime();

  if (
    targetTime <=
    currentTime
  ) {
    return {
      reachedTarget: true,
      currentTime,
    };
  }

  executeQueuedStrategicOrders();

  while (
    currentTime <
    targetTime
  ) {
    const pendingBattleDecision =
      getPendingBattleDecisionInterrupt();

    if (
      pendingBattleDecision
    ) {
      return {
        reachedTarget: false,
        currentTime,
        interrupt:
          pendingBattleDecision,
      };
    }

    executeQueuedStrategicOrders();

    const dueAtCurrentTime =
      processDueEvents(
        currentTime
      );

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

    if (
      nextMoment <=
      currentTime
    ) {
      throw new Error(
        "Simulation failed to advance time."
      );
    }

    advanceMovementPositionsTo(
      nextMoment
    );

    setWorldTime(
      nextMoment
    );

    currentTime =
      nextMoment;

    const processed =
      processSimulationMoment(
        currentTime
      );

    if (
      processed.interrupt
    ) {
      return {
        reachedTarget: false,
        currentTime,
        interrupt:
          processed.interrupt,
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
    getWorldTime() +
      minutes
  );
}
