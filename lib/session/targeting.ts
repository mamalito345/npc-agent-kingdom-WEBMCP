import {
  findRoute,
} from "@/lib/map/paths";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  KnownWorldFact,
} from "@/types/session";

export interface EnemyTargetingAssessment {
  targetArmyId: string;
  ageMinutes: number;
  confidence:
    KnownWorldFact[
      "confidence"
    ];
  knownNodeId?: string;
  hasLocation: boolean;
  stale: boolean;
  canTarget: boolean;
  canInterceptWithSelectedArmy: boolean;
  routeDistanceKm?: number;
  reason: string;
}

function getKnownNodeId(
  fact:
    KnownWorldFact
): string | undefined {
  if (
    typeof fact.data
      .nodeId ===
    "string"
  ) {
    return fact.data
      .nodeId;
  }

  if (
    typeof fact.data
      .roadFrom ===
      "string"
  ) {
    return fact.data
      .roadFrom;
  }

  return undefined;
}

export function assessEnemyTargeting(
  playerId: string,
  fact:
    KnownWorldFact,
  selectedArmyId?:
    string
): EnemyTargetingAssessment {
  const world =
    getRuntimeWorldState();

  const now =
    world.simulation
      .worldTimeMinutes;

  const ageMinutes =
    typeof fact.data
      .ageMinutes ===
    "number"
      ? fact.data
          .ageMinutes
      : Math.max(
          0,
          now -
            fact.observedAt
        );

  const knownNodeId =
    getKnownNodeId(
      fact
    );

  const stale =
    ageMinutes >
    24 *
      60;

  const informationTooWeak =
    fact.confidence ===
      "rumor" ||
    ageMinutes >
      3 *
        24 *
        60;

  const canTarget =
    Boolean(
      knownNodeId
    ) &&
    !informationTooWeak;

  if (
    !selectedArmyId
  ) {
    return {
      targetArmyId:
        fact.subjectId,
      ageMinutes,
      confidence:
        fact.confidence,
      knownNodeId,
      hasLocation:
        Boolean(
          knownNodeId
        ),
      stale,
      canTarget,
      canInterceptWithSelectedArmy:
        false,
      reason:
        !knownNodeId
          ? "No usable last-known location."
          : informationTooWeak
            ? "The report is too old or uncertain to support an interception."
            : "Target may be selected; choose an own army to test interception reachability.",
    };
  }

  const selectedArmy =
    world.armies[
      selectedArmyId
    ];

  if (
    !selectedArmy ||
    selectedArmy.ownerId !==
      world.session
        .players[
          playerId
        ]?.kingdomId
  ) {
    return {
      targetArmyId:
        fact.subjectId,
      ageMinutes,
      confidence:
        fact.confidence,
      knownNodeId,
      hasLocation:
        Boolean(
          knownNodeId
        ),
      stale,
      canTarget,
      canInterceptWithSelectedArmy:
        false,
      reason:
        "The selected army is not controlled by this player.",
    };
  }

  const position =
    world.simulation
      .entityPositions[
        selectedArmyId
      ];

  if (
    !canTarget ||
    !knownNodeId
  ) {
    return {
      targetArmyId:
        fact.subjectId,
      ageMinutes,
      confidence:
        fact.confidence,
      knownNodeId,
      hasLocation:
        Boolean(
          knownNodeId
        ),
      stale,
      canTarget,
      canInterceptWithSelectedArmy:
        false,
      reason:
        !knownNodeId
          ? "No usable last-known location."
          : "The report is too old or uncertain to support an interception.",
    };
  }

  if (
    !position ||
    position.kind !==
      "node"
  ) {
    return {
      targetArmyId:
        fact.subjectId,
      ageMinutes,
      confidence:
        fact.confidence,
      knownNodeId,
      hasLocation:
        true,
      stale,
      canTarget,
      canInterceptWithSelectedArmy:
        false,
      reason:
        "Selected army must be at a strategic node before a new interception can be plotted.",
    };
  }

  const route =
    findRoute(
      position.nodeId,
      knownNodeId
    );

  if (!route) {
    return {
      targetArmyId:
        fact.subjectId,
      ageMinutes,
      confidence:
        fact.confidence,
      knownNodeId,
      hasLocation:
        true,
      stale,
      canTarget,
      canInterceptWithSelectedArmy:
        false,
      reason:
        "No legal route reaches the reported enemy area.",
    };
  }

  return {
    targetArmyId:
      fact.subjectId,
    ageMinutes,
    confidence:
      fact.confidence,
    knownNodeId,
    hasLocation:
      true,
    stale,
    canTarget,
    canInterceptWithSelectedArmy:
      true,
    routeDistanceKm:
      Math.round(
        route
          .effectiveDistanceKm *
          10
      ) /
      10,
    reason:
      stale
        ? "Interception is possible, but the target report is stale and the enemy may have moved."
        : "Interception route can be plotted from the selected army to the last-known enemy area.",
  };
}
