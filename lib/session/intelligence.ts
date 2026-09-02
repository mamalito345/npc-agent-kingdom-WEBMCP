import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getMapEdge,
} from "@/lib/map/graph";

import {
  getActivePlayerSlots,
} from "@/lib/session/players";

import {
  addPlayerKnowledge,
  markStrategicBriefingDelivered,
  playerNeedsStrategicBriefing,
} from "@/lib/session/knowledge";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import type {
  Position,
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

function describeCoarsePosition(
  position:
    Position | undefined
): {
  summary:
    string;

  data:
    Record<
      string,
      string | number | boolean | null
    >;
} {
  if (!position) {
    return {
      summary:
        "location unknown",

      data: {
        locationKnown:
          false,
      },
    };
  }

  if (
    position.kind ===
    "node"
  ) {
    return {
      summary:
        `near ${position.nodeId}`,

      data: {
        locationKnown:
          true,

        nodeId:
          position.nodeId,
      },
    };
  }

  const edge =
    getMapEdge(
      position.edgeId
    );

  if (!edge) {
    return {
      summary:
        "moving somewhere along an unknown road",

      data: {
        locationKnown:
          false,
      },
    };
  }

  /*
   * Strategic intelligence deliberately
   * does NOT expose exact edge progress.
   */
  return {
    summary:
      `reported somewhere between ${edge.fromNodeId} and ${edge.toNodeId}`,

    data: {
      locationKnown:
        true,

      roadFrom:
        edge.fromNodeId,

      roadTo:
        edge.toNodeId,
    },
  };
}

function createPlayerBriefing(
  playerId:
    string,
  worldTime:
    WorldMinute
): void {
  const world =
    getRuntimeWorldState();

  const player =
    world.session
      .players[
        playerId
      ];

  if (!player) {
    return;
  }

  addPlayerKnowledge({
    playerId,

    subjectId:
      `strategic-briefing-${worldTime}`,

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
      `Strategic intelligence briefing delivered at world minute ${worldTime}.`,

    data: {
      briefingAt:
        worldTime,
    },
  });

  const enemyArmies =
    Object.values(
      world.armies
    )
      .filter(
        (army) =>
          army.ownerId !==
            player.kingdomId &&
          army.status !==
            "destroyed"
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id
          )
      );

  for (
    const enemyArmy
    of enemyArmies
  ) {
    const position =
      world.simulation
        .entityPositions[
          enemyArmy.id
        ];

    const coarse =
      describeCoarsePosition(
        position
      );

    addPlayerKnowledge({
      playerId,

      subjectId:
        enemyArmy.id,

      kind:
        "army",

      observedAt:
        worldTime,

      deliveredAt:
        worldTime,

      source:
        "strategic_briefing",

      confidence:
        "medium",

      summary:
        `Realm intelligence reports ${enemyArmy.id} ${coarse.summary}.`,

      data: {
        ...coarse.data,

        /*
         * Status is a strategic-level
         * estimate, not tactical detail.
         */
        reportedStatus:
          enemyArmy.status,
      },
    });
  }

  markStrategicBriefingDelivered(
    playerId,
    worldTime
  );
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

  for (
    const player
    of duePlayers
  ) {
    createPlayerBriefing(
      player.id,
      worldTime
    );
  }

  const affectedPlayerIds =
    duePlayers.map(
      (player) =>
        player.id
    );

  const message =
    `Strategic intelligence briefing available for ${affectedPlayerIds.join(", ")}.`;

  /*
   * Don't overwrite an already more
   * urgent battle/contact interrupt.
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

  const interrupt =
    openCommandInterrupt({
      type:
        "STRATEGIC_BRIEFING",

      affectedPlayerIds,

      message,
    });

  return {
    eventId:
      interrupt.id,

    type:
      "STRATEGIC_BRIEFING",

    message,

    affectedPlayerIds,
  };
}