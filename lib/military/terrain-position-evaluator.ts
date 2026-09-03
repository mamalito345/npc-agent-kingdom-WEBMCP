import {
  evaluateBattleTactic,
  getArmyComposition,
} from "@/lib/military/battle-tactics";

import {
  getArmySoldierCount,
} from "@/lib/military/army-queries";

import {
  resolveBattlefield,
} from "@/lib/military/terrain-resolver";

import type {
  BattlefieldResolution,
} from "@/lib/military/terrain-resolver";

import type {
  BattleFeature,
  BattleSide,
  BattleTactic,
  BattleTerrain,
} from "@/types/military";

export type PositionAdvantageBand =
  | "strong_advantage"
  | "advantage"
  | "neutral"
  | "disadvantage"
  | "strong_disadvantage";

export type DeploymentChoice =
  | "hold_current_ground"
  | "seize_high_ground"
  | "anchor_chokepoint"
  | "avoid_bridge_assault"
  | "seek_open_ground"
  | "withdraw_to_better_adjacent_position";

export interface DeploymentRecommendation {
  choice: DeploymentChoice;
  score: number;
  reason: string;
  destinationNodeId?: string;
}

export interface BattlefieldPositionProfile {
  nodeId: string;
  terrain: BattleTerrain;
  features: BattleFeature[];
  defenderBias: number;
  attackerBias: number;
  frontageMultiplier: number;
  bridgehead: boolean;
  riverCrossing: boolean;
  chokepoint: boolean;
  notes: string[];
  adjacentAlternatives:
    BattlefieldResolution[
      "adjacentAlternatives"
    ];
}

export interface ArmyTerrainFit {
  armyId: string;
  side: BattleSide;
  soldiers: number;
  infantryShare: number;
  cavalryShare: number;
  siegeShare: number;
  recommendedTactics: Array<{
    tactic: BattleTactic;
    score: number;
    powerMultiplier: number;
    casualtyReceivedMultiplier: number;
  }>;
  invalidTactics: Array<{
    tactic: BattleTactic;
    reason: string;
  }>;
}

export interface KnownEngagementEstimate {
  ownArmyId: string;
  targetArmyId: string;
  nodeId: string;
  approximateEnemySoldiers?: number;
  ownSoldiers: number;
  approximateStrengthRatio?: number;
  battlefield: BattlefieldPositionProfile;
  ownFit: ArmyTerrainFit;
  outlook: PositionAdvantageBand;
  deploymentRecommendations:
    DeploymentRecommendation[];
  reasons: string[];
}

const TACTICS:
  BattleTactic[] = [
  "hold_ground",
  "aggressive_push",
  "shield_wall",
  "cavalry_flank",
  "commit_reserve",
  "counterattack",
  "seize_high_ground",
  "orderly_retreat",
  "desperate_assault",
];

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function round2(
  value: number
): number {
  return Math.round(
    value * 100
  ) / 100;
}

function profileFromResolution(
  resolution:
    BattlefieldResolution
): BattlefieldPositionProfile {
  let defenderBias =
    1;

  let attackerBias =
    1;

  if (
    resolution.terrain ===
    "hills"
  ) {
    defenderBias *=
      1.12;
  }

  if (
    resolution.features.includes(
      "high_ground"
    )
  ) {
    defenderBias *=
      1.1;
  }

  if (
    resolution.features.includes(
      "bridge"
    )
  ) {
    attackerBias *=
      0.72;
  }

  if (
    resolution.features.includes(
      "narrow_pass"
    )
  ) {
    attackerBias *=
      0.82;

    defenderBias *=
      1.1;
  }

  if (
    resolution.terrain ===
    "mountain"
  ) {
    attackerBias *=
      0.88;

    defenderBias *=
      1.08;
  }

  if (
    resolution.terrain ===
    "dense_forest"
  ) {
    attackerBias *=
      0.92;
  }

  if (
    resolution.terrain ===
      "marsh" ||
    resolution.terrain ===
      "river_crossing"
  ) {
    attackerBias *=
      0.88;
  }

  /*
   * Restricted frontage does not directly rewrite combat power here.
   * It is an operational warning and recommendation input.
   * Canonical combat still uses terrain/features through battle tactics.
   */
  return {
    nodeId:
      resolution.anchorNodeId,
    terrain:
      resolution.terrain,
    features: [
      ...resolution.features,
    ],
    defenderBias:
      round2(
        defenderBias
      ),
    attackerBias:
      round2(
        attackerBias
      ),
    frontageMultiplier:
      resolution
        .frontageMultiplier,
    bridgehead:
      resolution.bridgehead,
    riverCrossing:
      resolution
        .riverCrossing,
    chokepoint:
      resolution.chokepoint,
    notes: [
      ...resolution.notes,
    ],
    adjacentAlternatives:
      resolution
        .adjacentAlternatives,
  };
}

export function getBattlefieldPositionProfile(
  nodeId: string
): BattlefieldPositionProfile {
  return profileFromResolution(
    resolveBattlefield(
      "__analysis-attacker__",
      "__analysis-defender__",
      {
        kind:
          "node",
        nodeId,
      }
    )
  );
}

export function evaluateArmyTerrainFit(
  armyId: string,
  nodeId: string,
  side: BattleSide
): ArmyTerrainFit {
  const composition =
    getArmyComposition([
      armyId,
    ]);

  const battlefield =
    getBattlefieldPositionProfile(
      nodeId
    );

  const total =
    Math.max(
      1,
      composition
        .totalSoldiers
    );

  const recommendedTactics:
    ArmyTerrainFit[
      "recommendedTactics"
    ] = [];

  const invalidTactics:
    ArmyTerrainFit[
      "invalidTactics"
    ] = [];

  for (
    const tactic
    of TACTICS
  ) {
    const evaluation =
      evaluateBattleTactic(
        tactic,
        composition,
        battlefield.terrain,
        battlefield.features,
        side,
        side ===
          "attacker"
          ? "hold_ground"
          : "aggressive_push"
      );

    if (
      !evaluation.valid
    ) {
      invalidTactics.push({
        tactic,
        reason:
          evaluation.reason ??
          "Tactic is invalid in this position.",
      });

      continue;
    }

    const score =
      evaluation
        .powerMultiplier *
      evaluation
        .momentumMultiplier /
      Math.max(
        0.25,
        evaluation
          .casualtyReceivedMultiplier
      );

    recommendedTactics.push({
      tactic,
      score:
        round2(
          score
        ),
      powerMultiplier:
        round2(
          evaluation
            .powerMultiplier
        ),
      casualtyReceivedMultiplier:
        round2(
          evaluation
            .casualtyReceivedMultiplier
        ),
    });
  }

  recommendedTactics.sort(
    (a, b) =>
      b.score -
        a.score ||
      a.tactic.localeCompare(
        b.tactic
      )
  );

  return {
    armyId,
    side,
    soldiers:
      getArmySoldierCount(
        armyId
      ),
    infantryShare:
      round2(
        composition.infantry /
          total
      ),
    cavalryShare:
      round2(
        composition.cavalry /
          total
      ),
    siegeShare:
      round2(
        composition.siege /
          total
      ),
    recommendedTactics,
    invalidTactics,
  };
}

function buildDeploymentRecommendations(
  battlefield:
    BattlefieldPositionProfile,
  ownFit:
    ArmyTerrainFit
): DeploymentRecommendation[] {
  const result:
    DeploymentRecommendation[] =
    [];

  result.push({
    choice:
      "hold_current_ground",
    score:
      battlefield
        .defenderBias,
    reason:
      battlefield
        .defenderBias >
      battlefield
        .attackerBias
        ? "The current terrain rewards a force that can establish the defensive position first."
        : "The current ground is usable but offers no overwhelming positional edge.",
  });

  if (
    battlefield.features
      .includes(
        "high_ground"
      )
  ) {
    result.push({
      choice:
        "seize_high_ground",
      score:
        1.3,
      reason:
        "High ground is present and materially improves defensive combat performance.",
    });
  }

  if (
    battlefield.chokepoint
  ) {
    result.push({
      choice:
        "anchor_chokepoint",
      score:
        ownFit
          .infantryShare >=
        0.45
          ? 1.35
          : 1.08,
      reason:
        ownFit
          .infantryShare >=
        0.45
          ? "Restricted frontage lets an infantry-heavy army deny the enemy full deployment."
          : "The chokepoint limits enemy frontage, though this army is not especially infantry-heavy.",
    });
  }

  if (
    battlefield.bridgehead
  ) {
    result.push({
      choice:
        "avoid_bridge_assault",
      score:
        1.4,
      reason:
        "Direct bridge assault receives a severe canonical attacking penalty; maneuver or force the enemy to cross instead.",
    });
  }

  if (
    ownFit
      .cavalryShare >=
      0.2 &&
    (
      battlefield
        .terrain !==
        "plains" ||
      battlefield
        .chokepoint
    )
  ) {
    const openAlternative =
      battlefield
        .adjacentAlternatives
        .filter(
          (candidate) =>
            candidate.terrain ===
              "plains" &&
            !candidate.features
              .includes(
                "bridge"
              ) &&
            !candidate.features
              .includes(
                "narrow_pass"
              )
        )
        .sort(
          (a, b) =>
            b.attackerScore -
              a.attackerScore ||
            a.nodeId.localeCompare(
              b.nodeId
            )
        )[0];

    if (
      openAlternative
    ) {
      result.push({
        choice:
          "seek_open_ground",
        score:
          1.28,
        destinationNodeId:
          openAlternative
            .nodeId,
        reason:
          "This army has enough cavalry to benefit from open maneuver; an adjacent plains position is available.",
      });
    }
  }

  const bestDefensiveAlternative =
    battlefield
      .adjacentAlternatives[
        0
      ];

  if (
    bestDefensiveAlternative &&
    bestDefensiveAlternative
      .defenderScore >
      battlefield
        .defenderBias +
        0.12
  ) {
    result.push({
      choice:
        "withdraw_to_better_adjacent_position",
      score:
        round2(
          bestDefensiveAlternative
            .defenderScore
        ),
      destinationNodeId:
        bestDefensiveAlternative
          .nodeId,
      reason:
        `Adjacent ${bestDefensiveAlternative.nodeId} offers a better defensive profile: ${bestDefensiveAlternative.reason}.`,
    });
  }

  return result.sort(
    (a, b) =>
      b.score -
        a.score ||
      a.choice.localeCompare(
        b.choice
      )
  );
}

function bandForScore(
  score: number
): PositionAdvantageBand {
  if (
    score >=
    1.35
  ) {
    return "strong_advantage";
  }

  if (
    score >=
    1.12
  ) {
    return "advantage";
  }

  if (
    score <=
    0.74
  ) {
    return "strong_disadvantage";
  }

  if (
    score <=
    0.9
  ) {
    return "disadvantage";
  }

  return "neutral";
}

export function evaluateKnownEngagement(
  ownArmyId: string,
  targetArmyId: string,
  nodeId: string,
  approximateEnemySoldiers?:
    number
): KnownEngagementEstimate {
  const battlefield =
    getBattlefieldPositionProfile(
      nodeId
    );

  const ownFit =
    evaluateArmyTerrainFit(
      ownArmyId,
      nodeId,
      "attacker"
    );

  const ownSoldiers =
    ownFit.soldiers;

  const approximateStrengthRatio =
    approximateEnemySoldiers &&
    approximateEnemySoldiers >
      0
      ? ownSoldiers /
        approximateEnemySoldiers
      : undefined;

  const bestTactic =
    ownFit
      .recommendedTactics[
        0
      ];

  let score =
    battlefield
      .attackerBias;

  const reasons =
    [
      ...battlefield
        .notes,
    ];

  if (
    battlefield
      .frontageMultiplier <
    0.8
  ) {
    reasons.push(
      `Restricted frontage: only about ${Math.round(
        battlefield
          .frontageMultiplier *
          100
      )}% of normal deployment width is available.`
    );
  }

  if (
    bestTactic
  ) {
    score *=
      clamp(
        bestTactic
          .powerMultiplier,
        0.7,
        1.35
      );

    reasons.push(
      `Best currently valid tactic: ${bestTactic.tactic}.`
    );
  }

  if (
    approximateStrengthRatio !==
    undefined
  ) {
    /*
     * Chokepoints reduce the practical value of raw numerical superiority.
     */
    const ratioWeight =
      battlefield
        .frontageMultiplier <
      0.8
        ? 0.55
        : 1;

    score *=
      clamp(
        1 +
          (
            approximateStrengthRatio -
            1
          ) *
            ratioWeight,
        0.55,
        1.6
      );

    reasons.push(
      `Approximate numerical ratio: ${round2(
        approximateStrengthRatio
      )}:1.`
    );
  } else {
    reasons.push(
      "Enemy strength is too uncertain for a numerical comparison."
    );
  }

  const deploymentRecommendations =
    buildDeploymentRecommendations(
      battlefield,
      ownFit
    );

  return {
    ownArmyId,
    targetArmyId,
    nodeId,
    approximateEnemySoldiers,
    ownSoldiers,
    approximateStrengthRatio:
      approximateStrengthRatio ===
      undefined
        ? undefined
        : round2(
            approximateStrengthRatio
          ),
    battlefield,
    ownFit,
    outlook:
      bandForScore(
        score
      ),
    deploymentRecommendations,
    reasons,
  };
}
