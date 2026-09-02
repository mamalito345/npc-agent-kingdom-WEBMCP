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

import type {
  AdvanceWorldResult,
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

function chooseEarlierMoment(
  currentTime:
    WorldMinute,
  currentCandidate:
    WorldMinute,
  candidate:
    WorldMinute | undefined
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
  currentTime:
    WorldMinute,
  targetTime:
    WorldMinute
): WorldMinute {
  let nextMoment =
    targetTime;

  //
  // =====================================================
  // SCHEDULED WORLD EVENT
  // =====================================================
  //

  const nextEvent =
    getNextScheduledEvent();

  if (
    nextEvent
  ) {
    nextMoment =
      chooseEarlierMoment(
        currentTime,
        nextMoment,
        nextEvent.executeAt
      );
  }

  //
  // =====================================================
  // EXACT ROAD ENCOUNTER
  // =====================================================
  //
  // This must be considered before ordinary
  // movement completion because two moving
  // armies can meet halfway along an edge.
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextRoadEncounterBoundary(
        currentTime
      )
    );

  //
  // =====================================================
  // GENERIC MOVEMENT
  // =====================================================
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextWorldMovementBoundaryTime(
        currentTime
      )
    );

  //
  // =====================================================
  // RECRUITMENT
  // =====================================================
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextRecruitmentCompletionBoundary()
    );

  //
  // =====================================================
  // SETTLEMENT OPERATIONS
  // =====================================================
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextSettlementOperationBoundary()
    );

  //
  // =====================================================
  // FORTIFICATION BUILD
  // =====================================================
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextFortificationCompletionBoundary()
    );

  //
  // =====================================================
  // FORTIFICATION REPAIR
  // =====================================================
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextFortificationRepairBoundary()
    );

  //
  // =====================================================
  // PERSISTENT BATTLE
  // =====================================================
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextBattleBoundary()
    );

  //
  // =====================================================
  // SIEGE
  // =====================================================
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextSiegeBoundary()
    );

  //
  // =====================================================
  // STRATEGIC INTELLIGENCE
  // =====================================================
  //

  nextMoment =
    chooseEarlierMoment(
      currentTime,
      nextMoment,
      getNextStrategicBriefingBoundary()
    );

  //
  // =====================================================
  // DAILY ECONOMY
  // =====================================================
  //

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
  worldTime:
    WorldMinute
): {
  interrupt?:
    SimulationInterrupt;
} {
  let interrupt:
    SimulationInterrupt |
    undefined;

  //
  // =====================================================
  // SCHEDULED EVENTS
  // =====================================================
  //

  const eventResult =
    processDueEvents(
      worldTime
    );

  if (
    eventResult.interrupt
  ) {
    interrupt =
      eventResult.interrupt;
  }

  //
  // =====================================================
  // ROAD ENCOUNTERS
  // =====================================================
  //
  // Positions were already advanced to this exact
  // world minute.
  //
  // We intentionally process road encounters BEFORE
  // completed movement removal.
  //

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

  //
  // An interception may have stopped movement and
  // created battle.
  //

  processStrategicOrderLifecycle(
    worldTime
  );

  //
  // =====================================================
  // NORMAL MOVEMENT ARRIVALS
  // =====================================================
  //

  resolveCompletedMovements(
    worldTime
  );

  //
  // =====================================================
  // COURIERS
  // =====================================================
  //

  processCourierArrivals();

  //
  // =====================================================
  // RECRUITMENT
  // =====================================================
  //

  processRecruitmentCompletions(
    worldTime
  );

  //
  // =====================================================
  // SETTLEMENT OPERATIONS
  // =====================================================
  //

  processSettlementOperations(
    worldTime
  );

  //
  // =====================================================
  // FORTIFICATIONS
  // =====================================================
  //

  processFortificationCompletions(
    worldTime
  );

  processFortificationRepairs(
    worldTime
  );

  //
  // =====================================================
  // SIEGES
  // =====================================================
  //

  processSieges(
    worldTime
  );

  //
  // =====================================================
  // STRATEGIC ORDER COMPLETION
  // =====================================================
  //
  // Normal movement has now resolved, therefore
  // arrival orders may become completed.
  //

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

  //
  // =====================================================
  // PERSISTENT BATTLES
  // =====================================================
  //

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

  //
  // =====================================================
  // NODE ARMY CONTACT
  // =====================================================
  //
  // Old node-based contact remains supported.
  // Road encounters are an additional system,
  // not a replacement.
  //

  const armyContactInterrupt =
    processArmyContactInterrupt();

  if (
    !interrupt &&
    armyContactInterrupt
  ) {
    interrupt =
      armyContactInterrupt;
  }

  //
  // =====================================================
  // DAILY WORLD PROCESSING
  // =====================================================
  //
  // This still runs even if another event occurred on
  // the same minute. Otherwise an interrupt could
  // swallow economy/upkeep boundaries.
  //

  processDailyBoundary(
    worldTime
  );

  //
  // =====================================================
  // STRATEGIC INTELLIGENCE
  // =====================================================
  //

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

  return {
    interrupt,
  };
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

  //
  // Orders issued during planning become physical
  // actions when execution begins.
  //

  executeQueuedStrategicOrders();

  while (
    currentTime <
    targetTime
  ) {
    //
    // ===================================================
    // BATTLE DECISION PAUSE
    // ===================================================
    //

    const pendingBattleDecision =
      getPendingBattleDecisionInterrupt();

    if (
      pendingBattleDecision
    ) {
      return {
        reachedTarget:
          false,

        currentTime,

        interrupt:
          pendingBattleDecision,
      };
    }

    //
    // New human orders may have been queued while
    // simulation was already executing.
    //

    executeQueuedStrategicOrders();

    //
    // ===================================================
    // EVENTS ALREADY DUE NOW
    // ===================================================
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
    // ===================================================
    // CHOOSE NEXT CANONICAL MOMENT
    // ===================================================
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
    // ===================================================
    // PHYSICAL MOVEMENT
    // ===================================================
    //

    advanceMovementPositionsTo(
      nextMoment
    );

    //
    // ===================================================
    // CANONICAL CLOCK
    // ===================================================
    //

    setWorldTime(
      nextMoment
    );

    currentTime =
      nextMoment;

    //
    // ===================================================
    // PROCESS WORLD STATE AT THIS MOMENT
    // ===================================================
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
          processed.interrupt,
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
    minutes <
    0
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