import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getActivePlayerSlots,
} from "@/lib/session/players";

import {
  addPlayerKnowledge,
  markStrategicBriefingDelivered,
  playerNeedsStrategicBriefing,
} from "@/lib/session/knowledge";

import {
  buildPlayerStrategicBriefing,
  encodeStrategicBriefing,
} from "@/lib/session/strategic-briefing";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import type {
  PlayerStrategicBriefing,
} from "@/lib/session/strategic-briefing";

import type {
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

function briefingSummary(
  briefing:
    PlayerStrategicBriefing
): string {
  if (
    briefing.items.length ===
    0
  ) {
    return "Strategic briefing: no material new developments.";
  }

  const top =
    briefing.items
      .slice(
        0,
        3
      )
      .map(
        (item) =>
          item.summary
      )
      .join(
        " "
      );

  return `Strategic briefing (${briefing.severity}): ${top}`;
}

function createPlayerBriefing(
  playerId:
    string,
  worldTime:
    WorldMinute
): PlayerStrategicBriefing | undefined {
  const briefing =
    buildPlayerStrategicBriefing(
      playerId,
      worldTime
    );

  if (!briefing) {
    return undefined;
  }

  addPlayerKnowledge({
    playerId,

    subjectId:
      `strategic-briefing-${playerId}-${worldTime}`,

    kind:
      "event",

    observedAt:
      worldTime,

    deliveredAt:
      worldTime,

    source:
      "strategic_briefing",

    confidence:
      "confirmed",

    summary:
      briefingSummary(
        briefing
      ),

    data: {
      strategicBriefing:
        true,
      briefingAt:
        worldTime,
      since:
        briefing.since,
      severity:
        briefing.severity,
      meaningful:
        briefing.meaningful,
      newFactCount:
        briefing.newFactCount,
      itemCount:
        briefing.items.length,
      briefingJson:
        encodeStrategicBriefing(
          briefing
        ),
    },
  });

  markStrategicBriefingDelivered(
    playerId,
    worldTime
  );

  return briefing;
}

export function getNextStrategicBriefingBoundary():
  WorldMinute | undefined {
  const values =
    Object.values(
      getRuntimeWorldState()
        .session
        .knowledge
    )
      .map(
        (knowledge) =>
          knowledge
            .nextStrategicBriefingAt
      )
      .filter(
        (
          value
        ): value is WorldMinute =>
          Number.isFinite(
            value
          )
      )
      .sort(
        (a, b) =>
          a -
          b
      );

  return values[0];
}

export function processStrategicBriefings(
  worldTime:
    WorldMinute
): SimulationInterrupt | undefined {
  const duePlayers =
    getActivePlayerSlots()
      .filter(
        (player) =>
          playerNeedsStrategicBriefing(
            player.id,
            worldTime
          )
      );

  if (
    duePlayers.length ===
    0
  ) {
    return undefined;
  }

  const meaningfulPlayerIds:
    string[] = [];

  const meaningfulSummaries:
    string[] = [];

  for (
    const player
    of duePlayers
  ) {
    const briefing =
      createPlayerBriefing(
        player.id,
        worldTime
      );

    if (
      briefing
        ?.meaningful
    ) {
      meaningfulPlayerIds.push(
        player.id
      );

      const top =
        briefing.items[
          0
        ];

      if (top) {
        meaningfulSummaries.push(
          `${player.id}: ${top.summary}`
        );
      }
    }
  }

  /*
   * Quiet scheduled briefings are recorded but do not stop simulation and do
   * not wake an Actor/GM realm. This is the main LLM-call reduction rule.
   */
  if (
    meaningfulPlayerIds.length ===
    0
  ) {
    return undefined;
  }

  /*
   * Never replace a more urgent battle/contact/message interrupt already open.
   * The briefing remains delivered and visible through player knowledge.
   */
  if (
    getRuntimeWorldState()
      .session
      .commandCycle
      .phase ===
    "interrupted"
  ) {
    return undefined;
  }

  const message =
    meaningfulSummaries.length >
    0
      ? `Strategic briefing requires attention. ${meaningfulSummaries
          .slice(
            0,
            3
          )
          .join(
            " "
          )}`
      : "Strategic briefing contains material developments requiring command attention.";

  const interrupt =
    openCommandInterrupt({
      type:
        "STRATEGIC_BRIEFING",

      affectedPlayerIds:
        meaningfulPlayerIds,

      message,
    });

  return {
    eventId:
      interrupt.id,

    type:
      "STRATEGIC_BRIEFING",

    message,

    affectedPlayerIds:
      meaningfulPlayerIds,
  };
}
