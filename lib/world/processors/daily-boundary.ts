import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import {
  processDailySettlementProduction,
} from "@/lib/economy/production";

import {
  processDailyTradeIncome,
} from "@/lib/economy/trade";

import {
  processDailyMilitaryEconomy,
} from "@/lib/military/daily";

import {
  refreshDailyAudienceRequests,
} from "@/lib/politics/audience";

import {
  getActivePlayerSlots,
} from "@/lib/session/players";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

export function getNextDailyBoundary(
  currentTime:
    WorldMinute
): WorldMinute {
  const completedDays =
    Math.floor(
      currentTime /
        MINUTES_PER_DAY
    );

  return (
    (completedDays + 1) *
    MINUTES_PER_DAY
  );
}

export function processDailyBoundary(
  worldTime:
    WorldMinute
): SimulationInterrupt | undefined {
  if (
    worldTime %
      MINUTES_PER_DAY !==
    0
  ) {
    return undefined;
  }

  //
  // 1. Physical settlement production.
  //
  processDailySettlementProduction();

  //
  // 2. Road/trade income enters
  //    central kingdom treasury.
  //
  processDailyTradeIncome();

  //
  // 3. Army campaign/garrison costs
  //    are paid from central treasury.
  //
  processDailyMilitaryEconomy();

  //
  // 4. Lords whose loyalty has genuinely soured (or whose ambition is
  //    running hot) may bring a fresh petition to court. Throttled so a
  //    troubled court petitions periodically rather than constantly, and
  //    a well-governed one may go long stretches with none at all.
  //
  refreshDailyAudienceRequests();

  //
  // 5. Guaranteed daily planning window.
  //
  // Without this, control only ever returns to a player (human, actor
  // LLM, or a GM-controlled realm) when something the simulation judges
  // "meaningful" happens (a battle, a briefing worth surfacing, etc --
  // see processStrategicBriefings' "quiet briefings do not stop
  // simulation" rule). During a quiet stretch with no such event, the
  // command cycle can sit in "executing" indefinitely and nobody -- not
  // even the human player -- ever gets a command window back to issue
  // routine orders (recruit, develop, move armies, respond to lords).
  // That is the root cause behind "I pass my turn and it never comes
  // back to me." A fresh planning round every in-game day guarantees
  // everyone gets a real turn on a predictable cadence regardless of
  // whether anything dramatic occurred.
  //
  return openDailyPlanningWindow();
}

function openDailyPlanningWindow():
  SimulationInterrupt | undefined {
  const cycle =
    getRuntimeWorldState()
      .session
      .commandCycle;

  if (
    cycle.phase !==
    "executing"
  ) {
    // A planning or interrupted window is already open; never clobber it.
    return undefined;
  }

  const activePlayerIds =
    getActivePlayerSlots().map(
      (player) =>
        player.id
    );

  if (
    activePlayerIds.length ===
    0
  ) {
    return undefined;
  }

  const message =
    "A new day has begun. Review the realm and issue fresh orders.";

  const interrupt =
    openCommandInterrupt({
      type:
        "MAJOR_WORLD_EVENT",

      affectedPlayerIds:
        activePlayerIds,

      message,
    });

  return {
    eventId:
      interrupt.id,

    type:
      interrupt.type,

    message:
      interrupt.message,

    affectedPlayerIds:
      interrupt.affectedPlayerIds,
  };
}