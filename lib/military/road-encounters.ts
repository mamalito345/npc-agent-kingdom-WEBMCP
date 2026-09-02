import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getMovementEdgeTraversalWindows,
  type MovementEdgeTraversalWindow,
} from "@/lib/world/movement";

import {
  getMapEdge,
} from "@/lib/map/graph";

import {
  startBattle,
} from "@/lib/military/battle-state";

import {
  getPlayerIdForKingdom,
} from "@/lib/session/players";

import {
  addPlayerKnowledge,
} from "@/lib/session/knowledge";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import type {
  ActiveMovement,
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

interface RoadEncounterCandidate {
  armyAId:
    string;

  armyBId:
    string;

  movementAId:
    string;

  movementBId:
    string;

  edgeId:
    string;

  encounterAt:
    WorldMinute;

  continuousEncounterAt:
    number;

  progress:
    number;

  directionA:
    | "forward"
    | "backward";

  directionB:
    | "forward"
    | "backward";
}

interface LinearProgress {
  velocity:
    number;

  intercept:
    number;
}

function armiesAreHostile(
  armyAId:
    string,
  armyBId:
    string
): boolean {
  const world =
    getRuntimeWorldState();

  const armyA =
    world.armies[
      armyAId
    ];

  const armyB =
    world.armies[
      armyBId
    ];

  if (
    !armyA ||
    !armyB
  ) {
    return false;
  }

  if (
    armyA.status ===
      "destroyed" ||
    armyB.status ===
      "destroyed" ||
    armyA.status ===
      "battle" ||
    armyB.status ===
      "battle"
  ) {
    return false;
  }

  /*
   * Current canonical hostility baseline.
   *
   * War/diplomacy rules can replace this
   * later without changing encounter math.
   */
  return (
    armyA.ownerId !==
    armyB.ownerId
  );
}

function movementBelongsToArmy(
  movement:
    ActiveMovement
): boolean {
  return (
    getRuntimeWorldState()
      .armies[
        movement.entityId
      ] !==
    undefined
  );
}

function buildLinearProgress(
  window:
    MovementEdgeTraversalWindow
): LinearProgress {
  const duration =
    window.endsAt -
    window.startsAt;

  if (
    Math.abs(
      duration
    ) <
    0.000001
  ) {
    return {
      velocity:
        0,

      intercept:
        window
          .endProgress,
    };
  }

  const velocity =
    (
      window.endProgress -
      window.startProgress
    ) /
    duration;

  return {
    velocity,

    intercept:
      window.startProgress -
      velocity *
        window.startsAt,
  };
}

function progressAt(
  line:
    LinearProgress,
  time:
    number
): number {
  return (
    line.velocity *
      time +
    line.intercept
  );
}

function solveWindows(
  armyAId:
    string,
  armyBId:
    string,
  movementA:
    ActiveMovement,
  movementB:
    ActiveMovement,
  windowA:
    MovementEdgeTraversalWindow,
  windowB:
    MovementEdgeTraversalWindow,
  searchAfter:
    number,
  includeCurrentMinute:
    boolean
): RoadEncounterCandidate | undefined {
  if (
    windowA.edgeId !==
    windowB.edgeId
  ) {
    return undefined;
  }

  const overlapStart =
    Math.max(
      windowA.startsAt,
      windowB.startsAt,
      searchAfter
    );

  const overlapEnd =
    Math.min(
      windowA.endsAt,
      windowB.endsAt
    );

  if (
    overlapEnd <
    overlapStart
  ) {
    return undefined;
  }

  const lineA =
    buildLinearProgress(
      windowA
    );

  const lineB =
    buildLinearProgress(
      windowB
    );

  const relativeVelocity =
    lineA.velocity -
    lineB.velocity;

  let encounterTime:
    number;

  if (
    Math.abs(
      relativeVelocity
    ) <
    0.0000001
  ) {
    const difference =
      Math.abs(
        progressAt(
          lineA,
          overlapStart
        ) -
        progressAt(
          lineB,
          overlapStart
        )
      );

    if (
      difference >
      0.0001
    ) {
      return undefined;
    }

    encounterTime =
      overlapStart;
  } else {
    encounterTime =
      (
        lineB.intercept -
        lineA.intercept
      ) /
      relativeVelocity;
  }

  if (
    encounterTime <
      overlapStart -
        0.0001 ||
    encounterTime >
      overlapEnd +
        0.0001
  ) {
    return undefined;
  }

  const encounterAt =
    Math.ceil(
      encounterTime -
      0.000001
    );

  if (
    includeCurrentMinute
  ) {
    if (
      encounterAt <
      Math.floor(
        searchAfter
      )
    ) {
      return undefined;
    }
  } else if (
    encounterAt <=
    searchAfter
  ) {
    return undefined;
  }

  const progress =
    Math.max(
      0,
      Math.min(
        1,
        progressAt(
          lineA,
          encounterTime
        )
      )
    );

  return {
    armyAId,

    armyBId,

    movementAId:
      movementA.id,

    movementBId:
      movementB.id,

    edgeId:
      windowA.edgeId,

    encounterAt,

    continuousEncounterAt:
      encounterTime,

    progress,

    directionA:
      windowA.direction,

    directionB:
      windowB.direction,
  };
}

function findCandidates(
  searchAfter:
    number,
  includeCurrentMinute:
    boolean
): RoadEncounterCandidate[] {
  const world =
    getRuntimeWorldState();

  const movements =
    Object.values(
      world.simulation
        .activeMovements
    )
      .filter(
        movementBelongsToArmy
      )
      .sort(
        (a, b) =>
          a.entityId.localeCompare(
            b.entityId
          )
      );

  const candidates:
    RoadEncounterCandidate[] =
    [];

  for (
    let leftIndex =
      0;
    leftIndex <
      movements.length;
    leftIndex +=
      1
  ) {
    for (
      let rightIndex =
        leftIndex +
        1;
      rightIndex <
        movements.length;
      rightIndex +=
        1
    ) {
      const movementA =
        movements[
          leftIndex
        ];

      const movementB =
        movements[
          rightIndex
        ];

      if (
        !movementA ||
        !movementB
      ) {
        continue;
      }

      const armyAId =
        movementA.entityId;

      const armyBId =
        movementB.entityId;

      if (
        !armiesAreHostile(
          armyAId,
          armyBId
        )
      ) {
        continue;
      }

      const windowsA =
        getMovementEdgeTraversalWindows(
          movementA
        );

      const windowsB =
        getMovementEdgeTraversalWindows(
          movementB
        );

      for (
        const windowA
        of windowsA
      ) {
        for (
          const windowB
          of windowsB
        ) {
          const candidate =
            solveWindows(
              armyAId,
              armyBId,
              movementA,
              movementB,
              windowA,
              windowB,
              searchAfter,
              includeCurrentMinute
            );

          if (
            candidate
          ) {
            candidates.push(
              candidate
            );
          }
        }
      }
    }
  }

  return candidates.sort(
    (a, b) =>
      a.encounterAt -
        b.encounterAt ||
      a.edgeId.localeCompare(
        b.edgeId
      ) ||
      a.armyAId.localeCompare(
        b.armyAId
      ) ||
      a.armyBId.localeCompare(
        b.armyBId
      )
  );
}

export function getNextRoadEncounterBoundary(
  currentTime:
    WorldMinute
): WorldMinute | undefined {
  return findCandidates(
    currentTime,
    false
  )[0]?.encounterAt;
}

function getAffectedPlayerIds(
  armyAId:
    string,
  armyBId:
    string
): string[] {
  const world =
    getRuntimeWorldState();

  const armyA =
    world.armies[
      armyAId
    ];

  const armyB =
    world.armies[
      armyBId
    ];

  const ids =
    [
      armyA
        ? getPlayerIdForKingdom(
            armyA.ownerId
          )
        : undefined,

      armyB
        ? getPlayerIdForKingdom(
            armyB.ownerId
          )
        : undefined,
    ].filter(
      (
        value
      ): value is string =>
        value !==
        undefined
    );

  return [
    ...new Set(
      ids
    ),
  ];
}

function recordDirectEncounterKnowledge(
  playerIds:
    string[],
  candidate:
    RoadEncounterCandidate,
  battleId:
    string,
  worldTime:
    WorldMinute
): void {
  const world =
    getRuntimeWorldState();

  for (
    const playerId
    of playerIds
  ) {
    const player =
      world.session
        .players[
          playerId
        ];

    if (!player) {
      continue;
    }

    const ownArmyId =
      world.armies[
        candidate.armyAId
      ]?.ownerId ===
      player.kingdomId
        ? candidate
            .armyAId
        : candidate
            .armyBId;

    const enemyArmyId =
      ownArmyId ===
      candidate.armyAId
        ? candidate
            .armyBId
        : candidate
            .armyAId;

    addPlayerKnowledge({
      playerId,

      subjectId:
        enemyArmyId,

      kind:
        "army",

      observedAt:
        worldTime,

      deliveredAt:
        worldTime,

      source:
        "direct_observation",

      confidence:
        "confirmed",

      summary:
        `Enemy army ${enemyArmyId} encountered directly on road ${candidate.edgeId}.`,

      data: {
        edgeId:
          candidate.edgeId,

        edgeProgress:
          Number(
            candidate.progress.toFixed(
              4
            )
          ),

        battleId,

        ownArmyId,
      },
    });
  }
}

export function processRoadEncountersAt(
  worldTime:
    WorldMinute
): SimulationInterrupt | undefined {
  /*
   * Search one canonical minute back.
   *
   * Encounter math uses continuous
   * time but WorldMinute itself is
   * integer precision.
   */
  const candidates =
    findCandidates(
      Math.max(
        0,
        worldTime -
          1
      ),
      true
    )
      .filter(
        (candidate) =>
          candidate.encounterAt ===
          worldTime
      );

  const candidate =
    candidates[0];

  if (!candidate) {
    return undefined;
  }

  const world =
    getRuntimeWorldState();

  const movementA =
    world.simulation
      .activeMovements[
        candidate.armyAId
      ];

  const movementB =
    world.simulation
      .activeMovements[
        candidate.armyBId
      ];

  if (
    !movementA ||
    !movementB ||
    movementA.id !==
      candidate
        .movementAId ||
    movementB.id !==
      candidate
        .movementBId
  ) {
    return undefined;
  }

  const edge =
    getMapEdge(
      candidate.edgeId
    );

  if (!edge) {
    return undefined;
  }

  const anchorNodeId =
    candidate.progress <
    0.5
      ? edge.fromNodeId
      : edge.toNodeId;

  const sequence =
    allocateSimulationSequence();

  const contactId =
    `road-contact-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  /*
   * Stop both armies at the exact
   * mathematical encounter point.
   *
   * No node snapping.
   * No teleport.
   */
  updateRuntimeWorldState(
    (current) => {
      const activeMovements = {
        ...current
          .simulation
          .activeMovements,
      };

      delete activeMovements[
        candidate.armyAId
      ];

      delete activeMovements[
        candidate.armyBId
      ];

      return {
        ...current,

        armyContacts: {
          ...current
            .armyContacts,

          [contactId]: {
            id:
              contactId,

            armyAId:
              candidate
                .armyAId,

            armyBId:
              candidate
                .armyBId,

            /*
             * Existing battle/contact
             * model uses nodeId as its
             * operational anchor.
             */
            nodeId:
              anchorNodeId,

            detectedAt:
              worldTime,

            status:
              "pending",
          },
        },

        simulation: {
          ...current
            .simulation,

          activeMovements,

          entityPositions: {
            ...current
              .simulation
              .entityPositions,

            [candidate.armyAId]: {
              kind:
                "edge",

              edgeId:
                candidate.edgeId,

              progress:
                candidate.progress,

              direction:
                candidate
                  .directionA,
            },

            [candidate.armyBId]: {
              kind:
                "edge",

              edgeId:
                candidate.edgeId,

              progress:
                candidate.progress,

              direction:
                candidate
                  .directionB,
            },
          },
        },
      };
    }
  );

  const battleResult =
    startBattle({
      attackerArmyId:
        candidate.armyAId,

      defenderArmyId:
        candidate.armyBId,

      contactId,

      roadPosition: {
        edgeId:
          candidate.edgeId,

        progress:
          candidate.progress,
      },
    });

  if (
    battleResult.ok ===
    false
  ) {
    throw new Error(
      `Road encounter created contact but battle could not start: ${battleResult.error}`
    );
  }

  const affectedPlayerIds =
    getAffectedPlayerIds(
      candidate.armyAId,
      candidate.armyBId
    );

  recordDirectEncounterKnowledge(
    affectedPlayerIds,
    candidate,
    battleResult
      .battle
      .id,
    worldTime
  );

  const message =
    [
      `${candidate.armyAId} and ${candidate.armyBId} encountered on ${candidate.edgeId}.`,
      `Road progress ${(candidate.progress * 100).toFixed(1)}%.`,
      `Battle ${battleResult.battle.id} has begun.`,
    ].join(
      " "
    );

  if (
    affectedPlayerIds.length >
    0
  ) {
    openCommandInterrupt({
      type:
        "INTERCEPTION",

      affectedPlayerIds,

      message,
    });

    return {
      eventId:
        battleResult
          .battle
          .id,

      type:
        "ROAD_ENCOUNTER",

      message,

      affectedPlayerIds,
    };
  }

  /*
   * NPC-vs-NPC battle does not freeze
   * unrelated player simulation.
   */
  return undefined;
}