import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmySoldierCount,
} from "@/lib/military/army-queries";

import type {
  LordOrderType,
  LordProfile,
} from "@/types/lords";

import type {
  Army,
} from "@/types/military";

export type ObedienceBand =
  | "reliable"
  | "likely"
  | "uncertain"
  | "resistant"
  | "hostile";

export type CommanderSuitabilityBand =
  | "excellent"
  | "good"
  | "adequate"
  | "poor";

export interface LordMilitaryAssessment {
  characterId: string;
  title: string;
  loyalty: number;
  relationshipToRuler: number;
  politicalPower: number;
  controlledArmyIds: string[];
  controlledSoldiers: number;

  commanderSuitability: {
    score: number;
    band:
      CommanderSuitabilityBand;
    strengths:
      string[];
    weaknesses:
      string[];
  };

  obedience: {
    baseScore: number;
    band:
      ObedienceBand;
    lowRiskOrderScore: number;
    highRiskOrderScore: number;
    reasons:
      string[];
  };

  militaryReadiness: {
    activeArmyCount: number;
    marchingArmyCount: number;
    battleArmyCount: number;
    averageMorale: number;
    underSuppliedArmyCount: number;
    underFundedArmyCount: number;
  };

  politicalRisk: {
    score: number;
    level:
      | "low"
      | "medium"
      | "high"
      | "critical";
    reasons:
      string[];
  };
}

function clamp(
  value: number
): number {
  return Math.max(
    0,
    Math.min(
      100,
      value
    )
  );
}

function round1(
  value: number
): number {
  return Math.round(
    value *
      10
  ) /
    10;
}

function moraleReadinessScore(
  morale:
    Army["morale"]
): number {
  switch (
    morale
  ) {
    case "high":
      return 100;

    case "normal":
      return 70;

    case "low":
      return 35;

    case "broken":
      return 0;
  }
}

function relationshipScore(
  relationship:
    number
): number {
  return clamp(
    (
      relationship +
      100
    ) /
      2
  );
}

function obedienceScore(
  lord:
    LordProfile,
  risk:
    number
): number {
  const traits =
    lord.basicTraits;

  return clamp(
    lord.loyalty *
      0.45 +
    relationshipScore(
      lord.relationshipToRuler
    ) *
      0.22 +
    traits.honor *
      0.12 +
    traits.diplomacy *
      0.06 -
    traits.ambition *
      0.06 -
    clamp(
      risk
    ) *
      (
        traits.caution /
        100
      ) *
      0.22
  );
}

function obedienceBand(
  score: number
): ObedienceBand {
  if (
    score >=
    68
  ) {
    return "reliable";
  }

  if (
    score >=
    58
  ) {
    return "likely";
  }

  if (
    score >=
    48
  ) {
    return "uncertain";
  }

  if (
    score >=
    36
  ) {
    return "resistant";
  }

  return "hostile";
}

function commanderSuitability(
  lord:
    LordProfile
) {
  const traits =
    lord.basicTraits;

  const positiveRelationship =
    Math.max(
      0,
      lord.relationshipToRuler
    );

  const score =
    clamp(
      traits.aggression *
        0.24 +
      (
        100 -
        traits.caution
      ) *
        0.12 +
      traits.honor *
        0.18 +
      lord.loyalty *
        0.14 +
      positiveRelationship *
        0.08
    );

  /*
   * Political power matters for authority but should not magically make a
   * tactically weak commander brilliant.
   */
  const adjusted =
    clamp(
      score +
      lord.politicalPower *
        0.12 +
      traits.diplomacy *
        0.06
    );

  const strengths:
    string[] = [];

  const weaknesses:
    string[] = [];

  if (
    traits.aggression >=
    70
  ) {
    strengths.push(
      "decisive offensive temperament"
    );
  }

  if (
    traits.caution >=
    70
  ) {
    strengths.push(
      "careful defensive judgment"
    );
  }

  if (
    traits.honor >=
    70
  ) {
    strengths.push(
      "high cohesion and personal credibility"
    );
  }

  if (
    lord.loyalty >=
    70
  ) {
    strengths.push(
      "reliable alignment with crown objectives"
    );
  }

  if (
    traits.ambition >=
    75 &&
    lord.loyalty <
      55
  ) {
    weaknesses.push(
      "ambition may override crown priorities"
    );
  }

  if (
    traits.aggression >=
      80 &&
    traits.caution <=
      30
  ) {
    weaknesses.push(
      "high risk of overextension"
    );
  }

  if (
    traits.caution >=
      85
  ) {
    weaknesses.push(
      "may hesitate in time-sensitive operations"
    );
  }

  let band:
    CommanderSuitabilityBand;

  if (
    adjusted >=
    75
  ) {
    band =
      "excellent";
  } else if (
    adjusted >=
    62
  ) {
    band =
      "good";
  } else if (
    adjusted >=
    48
  ) {
    band =
      "adequate";
  } else {
    band =
      "poor";
  }

  return {
    score:
      round1(
        adjusted
      ),
    band,
    strengths,
    weaknesses,
  };
}

function orderRiskModifier(
  type:
    LordOrderType
): number {
  switch (
    type
  ) {
    case "HOLD_POSITION":
      return 25;

    case "DEFEND_SETTLEMENT":
      return 35;

    case "RAISE_TROOPS":
      return 50;

    case "REINFORCE":
      return 60;

    case "BRING_ARMY":
      return 65;
  }
}

export function estimateLordOrderObedience(
  lordCharacterId:
    string,
  orderType:
    LordOrderType,
  explicitRisk?:
    number
) {
  const profile =
    getRuntimeWorldState()
      .session
      .lords
      .profiles[
        lordCharacterId
      ];

  if (!profile) {
    return undefined;
  }

  const risk =
    explicitRisk ??
    orderRiskModifier(
      orderType
    );

  const score =
    obedienceScore(
      profile,
      risk
    );

  return {
    lordCharacterId,
    orderType,
    risk,
    score:
      round1(
        score
      ),
    band:
      obedienceBand(
        score
      ),
  };
}

export function getLordMilitaryAssessment(
  lordCharacterId:
    string
): LordMilitaryAssessment | undefined {
  const world =
    getRuntimeWorldState();

  const lord =
    world.session
      .lords
      .profiles[
        lordCharacterId
      ];

  if (!lord) {
    return undefined;
  }

  const armies =
    lord.controlledArmyIds
      .map(
        (armyId) =>
          world.armies[
            armyId
          ]
      )
      .filter(
        (
          army
        ): army is Army =>
          army !==
            undefined &&
          army.status !==
            "destroyed"
      );

  const controlledSoldiers =
    armies.reduce(
      (
        total,
        army
      ) =>
        total +
        getArmySoldierCount(
          army.id
        ),
      0
    );

  const marchingArmyCount =
    armies.filter(
      (army) =>
        Boolean(
          world.simulation
            .activeMovements[
              army.id
            ]
        )
    ).length;

  const battleArmyCount =
    armies.filter(
      (army) =>
        army.status ===
        "battle"
    ).length;

  const averageMorale =
    armies.length ===
    0
      ? 0
      : armies.reduce<number>(
          (
            total,
            army
          ) =>
            total +
            moraleReadinessScore(
              army.morale
            ),
          0
        ) /
        armies.length;

  const underSuppliedArmyCount =
    armies.filter(
      (army) =>
        army.supply
          .state !==
        "supplied"
    ).length;

  const underFundedArmyCount =
    armies.filter(
      (army) =>
        army.funding
          .state !==
        "funded"
    ).length;

  const base =
    obedienceScore(
      lord,
      40
    );

  const lowRisk =
    obedienceScore(
      lord,
      25
    );

  const highRisk =
    obedienceScore(
      lord,
      80
    );

  const obedienceReasons:
    string[] = [];

  if (
    lord.loyalty >=
    70
  ) {
    obedienceReasons.push(
      "high loyalty"
    );
  } else if (
    lord.loyalty <
    40
  ) {
    obedienceReasons.push(
      "low loyalty"
    );
  }

  if (
    lord.relationshipToRuler >=
    40
  ) {
    obedienceReasons.push(
      "strong ruler relationship"
    );
  } else if (
    lord.relationshipToRuler <
    -20
  ) {
    obedienceReasons.push(
      "poor ruler relationship"
    );
  }

  if (
    lord.basicTraits
      .caution >=
    70
  ) {
    obedienceReasons.push(
      "high-risk orders are strongly discounted by caution"
    );
  }

  if (
    lord.basicTraits
      .ambition >=
    70
  ) {
    obedienceReasons.push(
      "ambition reduces automatic compliance"
    );
  }

  let politicalRisk =
    (
      100 -
      lord.loyalty
    ) *
      0.35 +
    lord.politicalPower *
      0.3 +
    lord.basicTraits
      .ambition *
      0.25;

  if (
    lord.relationshipToRuler <
    0
  ) {
    politicalRisk +=
      Math.abs(
        lord.relationshipToRuler
      ) *
        0.15;
  }

  politicalRisk =
    clamp(
      politicalRisk
    );

  const politicalReasons:
    string[] = [];

  if (
    lord.politicalPower >=
    70
  ) {
    politicalReasons.push(
      "commands substantial political power"
    );
  }

  if (
    lord.loyalty <
    40
  ) {
    politicalReasons.push(
      "loyalty is dangerously low"
    );
  }

  if (
    lord.basicTraits
      .ambition >=
    75
  ) {
    politicalReasons.push(
      "high personal ambition"
    );
  }

  if (
    controlledSoldiers >=
    1500
  ) {
    politicalRisk =
      clamp(
        politicalRisk +
        8
      );

    politicalReasons.push(
      "controls a substantial independent military force"
    );
  }

  const riskLevel =
    politicalRisk >=
    75
      ? "critical"
      : politicalRisk >=
          58
        ? "high"
        : politicalRisk >=
            38
          ? "medium"
          : "low";

  return {
    characterId:
      lord.characterId,
    title:
      lord.title,
    loyalty:
      lord.loyalty,
    relationshipToRuler:
      lord.relationshipToRuler,
    politicalPower:
      lord.politicalPower,
    controlledArmyIds: [
      ...lord
        .controlledArmyIds,
    ],
    controlledSoldiers,

    commanderSuitability:
      commanderSuitability(
        lord
      ),

    obedience: {
      baseScore:
        round1(
          base
        ),
      band:
        obedienceBand(
          base
        ),
      lowRiskOrderScore:
        round1(
          lowRisk
        ),
      highRiskOrderScore:
        round1(
          highRisk
        ),
      reasons:
        obedienceReasons,
    },

    militaryReadiness: {
      activeArmyCount:
        armies.length,
      marchingArmyCount,
      battleArmyCount,
      averageMorale:
        round1(
          averageMorale
        ),
      underSuppliedArmyCount,
      underFundedArmyCount,
    },

    politicalRisk: {
      score:
        round1(
          politicalRisk
        ),
      level:
        riskLevel,
      reasons:
        politicalReasons,
    },
  };
}

export function inspectKingdomMilitaryPolitics(
  sessionId:
    string,
  playerId:
    string
) {
  const world =
    getRuntimeWorldState();

  if (
    world.session.id !==
    sessionId
  ) {
    return {
      ok:
        false as const,
      error:
        "SESSION_NOT_FOUND",
    };
  }

  const player =
    world.session.players[
      playerId
    ];

  if (!player) {
    return {
      ok:
        false as const,
      error:
        "PLAYER_NOT_FOUND",
    };
  }

  const lords =
    Object.values(
      world.session
        .lords
        .profiles
    )
      .filter(
        (lord) =>
          lord.kingdomId ===
          player.kingdomId
      )
      .map(
        (lord) =>
          getLordMilitaryAssessment(
            lord.characterId
          )
      )
      .filter(
        (
          assessment
        ): assessment is LordMilitaryAssessment =>
          Boolean(
            assessment
          )
      )
      .sort(
        (a, b) =>
          b.politicalRisk
            .score -
            a.politicalRisk
              .score ||
          b.controlledSoldiers -
            a.controlledSoldiers ||
          a.characterId.localeCompare(
            b.characterId
          )
      );

  return {
    ok:
      true as const,
    kingdomId:
      player.kingdomId,
    lords,
  };
}
