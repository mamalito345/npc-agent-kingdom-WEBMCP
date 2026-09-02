import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  calculateBattleSidePower,
} from "@/lib/military/battle-side-power";

import {
  getArmySoldierCount,
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  deterministicBattleVariance,
} from "@/lib/military/battle-random";

import {
  evaluateBattleTactic,
  getArmyComposition,
} from "@/lib/military/battle-tactics";

import type {
  BattleRoundResult,
  BattleSide,
  BattleTactic,
  PersistentBattle,
  UnitBlock,
} from "@/types/military";

import type {
  WorldMinute,
} from "@/types/simulation";

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );
}

function getSideArmyIds(
  battle:
    PersistentBattle,
  side:
    BattleSide
): string[] {
  return side ===
    "attacker"
    ? battle
        .attackerArmyIds
    : battle
        .defenderArmyIds;
}

function getSideSoldiers(
  battle:
    PersistentBattle,
  side:
    BattleSide
): number {
  return getSideArmyIds(
    battle,
    side
  ).reduce(
    (
      total,
      armyId
    ) =>
      total +
      getArmySoldierCount(
        armyId
      ),
    0
  );
}

function getMoralePowerMultiplier(
  pressure: number
): number {
  if (
    pressure >=
    100
  ) {
    return 0.45;
  }

  if (
    pressure >=
    80
  ) {
    return 0.65;
  }

  if (
    pressure >=
    60
  ) {
    return 0.78;
  }

  if (
    pressure >=
    30
  ) {
    return 0.9;
  }

  return 1;
}

function applySideCasualties(
  battle:
    PersistentBattle,
  side:
    BattleSide,
  casualtyPercent:
    number
): {
  units:
    Record<
      string,
      UnitBlock
    >;

  soldiersBefore:
    number;

  soldiersLost:
    number;

  soldiersAfter:
    number;
} {
  const world =
    getRuntimeWorldState();

  const updatedUnits:
    Record<
      string,
      UnitBlock
    > = {};

  let soldiersBefore =
    0;

  let soldiersLost =
    0;

  for (
    const armyId
    of getSideArmyIds(
      battle,
      side
    )
  ) {
    const army =
      world.armies[
        armyId
      ];

    if (
      !army ||
      army.status ===
        "destroyed"
    ) {
      continue;
    }

    const units =
      getArmyUnits(
        armyId
      );

    for (
      const unit
      of units
    ) {
      soldiersBefore +=
        unit.currentSoldiers;

      //
      // Siege equipment itself is
      // not treated as 250 fighting men.
      //
      const effectiveCasualtyPercent =
        unit.type ===
        "siege"
          ? casualtyPercent *
            0.35
          : casualtyPercent;

      const loss =
        Math.min(
          unit.currentSoldiers,
          Math.max(
            0,
            Math.round(
              unit.currentSoldiers *
                (
                  effectiveCasualtyPercent /
                  100
                )
            )
          )
        );

      soldiersLost +=
        loss;

      updatedUnits[
        unit.id
      ] = {
        ...unit,

        currentSoldiers:
          Math.max(
            0,
            unit.currentSoldiers -
              loss
          ),
      };
    }
  }

  return {
    units:
      updatedUnits,

    soldiersBefore,

    soldiersLost,

    soldiersAfter:
      Math.max(
        0,
        soldiersBefore -
          soldiersLost
      ),
  };
}

function calculateCasualtyPercent(
  enemyEffectivePower:
    number,
  ownEffectivePower:
    number,
  ownCasualtyMultiplier:
    number,
  variance:
    number
): number {
  const pressureRatio =
    enemyEffectivePower /
    Math.max(
      ownEffectivePower,
      0.1
    );

  const baseHourly =
    1.35;

  return clamp(
    baseHourly *
      clamp(
        pressureRatio,
        0.55,
        2.2
      ) *
      ownCasualtyMultiplier *
      variance,
    0.25,
    5.5
  );
}

function calculateMomentumDelta(
  attackerPower:
    number,
  defenderPower:
    number,
  attackerMomentumMultiplier:
    number,
  defenderMomentumMultiplier:
    number
): number {
  const attacker =
    attackerPower *
    attackerMomentumMultiplier;

  const defender =
    defenderPower *
    defenderMomentumMultiplier;

  const total =
    Math.max(
      attacker +
        defender,
      0.1
    );

  const relative =
    (
      attacker -
      defender
    ) /
    total;

  return clamp(
    Math.round(
      relative *
        24
    ),
    -15,
    15
  );
}

function calculateMoralePressure(
  ownLoss:
    number,
  ownBefore:
    number,
  enemyEffectivePower:
    number,
  ownEffectivePower:
    number,
  multiplier:
    number
): number {
  const casualtyPressure =
    ownBefore <=
    0
      ? 0
      : (
          ownLoss /
          ownBefore
        ) *
        140;

  const powerPressure =
    enemyEffectivePower >
    ownEffectivePower
      ? (
          enemyEffectivePower /
            Math.max(
              ownEffectivePower,
              0.1
            ) -
          1
        ) *
        4
      : -1;

  return clamp(
    (
      casualtyPressure +
      powerPressure
    ) *
      multiplier,
    -3,
    16
  );
}

function getEffectiveTactic(
  requested:
    BattleTactic,
  fallback:
    BattleTactic,
  evaluationValid:
    boolean
): BattleTactic {
  return evaluationValid
    ? requested
    : fallback;
}

export function processBattleRound(
  battleId:
    string,
  worldTime:
    WorldMinute
): BattleRoundResult | undefined {
  const world =
    getRuntimeWorldState();

  const battle =
    world.battles[
      battleId
    ];

  if (
    !battle ||
    battle.status !==
      "active"
  ) {
    return undefined;
  }

  const nextHour =
    battle.battleHour +
    1;

  let attackerTactic =
    battle.attackerTactic;

  let defenderTactic =
    battle.defenderTactic;

  const attackerComposition =
    getArmyComposition(
      battle
        .attackerArmyIds
    );

  const defenderComposition =
    getArmyComposition(
      battle
        .defenderArmyIds
    );

  let attackerEvaluation =
    evaluateBattleTactic(
      attackerTactic,
      attackerComposition,
      battle.terrain,
      battle.features,
      "attacker",
      defenderTactic
    );

  let defenderEvaluation =
    evaluateBattleTactic(
      defenderTactic,
      defenderComposition,
      battle.terrain,
      battle.features,
      "defender",
      attackerTactic
    );

  attackerTactic =
    getEffectiveTactic(
      attackerTactic,
      "hold_ground",
      attackerEvaluation.valid
    );

  defenderTactic =
    getEffectiveTactic(
      defenderTactic,
      "hold_ground",
      defenderEvaluation.valid
    );

  //
  // Re-evaluate when an invalid tactic
  // fell back to HOLD_GROUND.
  //
  attackerEvaluation =
    evaluateBattleTactic(
      attackerTactic,
      attackerComposition,
      battle.terrain,
      battle.features,
      "attacker",
      defenderTactic
    );

  defenderEvaluation =
    evaluateBattleTactic(
      defenderTactic,
      defenderComposition,
      battle.terrain,
      battle.features,
      "defender",
      attackerTactic
    );

  const attackerBasePower =
    calculateBattleSidePower(
      battle,
      "attacker"
    ).totalPower;

  const defenderBasePower =
    calculateBattleSidePower(
      battle,
      "defender"
    ).totalPower;

  const attackerEffectivePower =
    attackerBasePower *
    attackerEvaluation
      .powerMultiplier *
    getMoralePowerMultiplier(
      battle
        .attackerMoralePressure
    );

  const defenderEffectivePower =
    defenderBasePower *
    defenderEvaluation
      .powerMultiplier *
    getMoralePowerMultiplier(
      battle
        .defenderMoralePressure
    );

  const attackerVariance =
    deterministicBattleVariance(
      battle.id,
      nextHour,
      "attacker-casualties"
    );

  const defenderVariance =
    deterministicBattleVariance(
      battle.id,
      nextHour,
      "defender-casualties"
    );

  const attackerCasualtyPercent =
    calculateCasualtyPercent(
      defenderEffectivePower,
      attackerEffectivePower,
      attackerEvaluation
        .casualtyReceivedMultiplier,
      attackerVariance
    );

  const defenderCasualtyPercent =
    calculateCasualtyPercent(
      attackerEffectivePower,
      defenderEffectivePower,
      defenderEvaluation
        .casualtyReceivedMultiplier,
      defenderVariance
    );

  const attackerLosses =
    applySideCasualties(
      battle,
      "attacker",
      attackerCasualtyPercent
    );

  const defenderLosses =
    applySideCasualties(
      battle,
      "defender",
      defenderCasualtyPercent
    );

  const momentumDelta =
    calculateMomentumDelta(
      attackerEffectivePower,
      defenderEffectivePower,
      attackerEvaluation
        .momentumMultiplier,
      defenderEvaluation
        .momentumMultiplier
    );

  const momentumBefore =
    battle
      .frontMomentum;

  const momentumAfter =
    clamp(
      momentumBefore +
        momentumDelta,
      -100,
      100
    );

  const attackerPressureAdded =
    calculateMoralePressure(
      attackerLosses
        .soldiersLost,
      attackerLosses
        .soldiersBefore,
      defenderEffectivePower,
      attackerEffectivePower,
      defenderEvaluation
        .moralePressureMultiplier
    );

  const defenderPressureAdded =
    calculateMoralePressure(
      defenderLosses
        .soldiersLost,
      defenderLosses
        .soldiersBefore,
      attackerEffectivePower,
      defenderEffectivePower,
      attackerEvaluation
        .moralePressureMultiplier
    );

  const attackerPressure =
    clamp(
      battle
        .attackerMoralePressure +
        attackerPressureAdded -
        (
          momentumDelta >
          0
            ? 1.5
            : 0
        ),
      0,
      100
    );

  const defenderPressure =
    clamp(
      battle
        .defenderMoralePressure +
        defenderPressureAdded -
        (
          momentumDelta <
          0
            ? 1.5
            : 0
        ),
      0,
      100
    );

  const roundId =
    `${battle.id}-round-${nextHour
      .toString()
      .padStart(
        3,
        "0"
      )}`;

  const result:
    BattleRoundResult = {
    id:
      roundId,

    battleId:
      battle.id,

    hour:
      nextHour,

    resolvedAt:
      worldTime,

    attacker: {
      tactic:
        attackerTactic,

      soldiersBefore:
        attackerLosses
          .soldiersBefore,

      soldiersLost:
        attackerLosses
          .soldiersLost,

      soldiersAfter:
        attackerLosses
          .soldiersAfter,

      rawPower:
        attackerBasePower,

      effectivePower:
        attackerEffectivePower,

      casualtyMultiplier:
        attackerEvaluation
          .casualtyReceivedMultiplier,

      moralePressureAdded:
        attackerPressureAdded,
    },

    defender: {
      tactic:
        defenderTactic,

      soldiersBefore:
        defenderLosses
          .soldiersBefore,

      soldiersLost:
        defenderLosses
          .soldiersLost,

      soldiersAfter:
        defenderLosses
          .soldiersAfter,

      rawPower:
        defenderBasePower,

      effectivePower:
        defenderEffectivePower,

      casualtyMultiplier:
        defenderEvaluation
          .casualtyReceivedMultiplier,

      moralePressureAdded:
        defenderPressureAdded,
    },

    momentumBefore,

    momentumAfter,

    summary: [
      `Battle hour ${nextHour}.`,
      `Attacker tactic=${attackerTactic}, lost=${attackerLosses.soldiersLost}.`,
      `Defender tactic=${defenderTactic}, lost=${defenderLosses.soldiersLost}.`,
      `Momentum ${momentumBefore} -> ${momentumAfter}.`,
    ].join(
      " "
    ),
  };

  updateRuntimeWorldState(
    (current) => {
      const latest =
        current.battles[
          battle.id
        ];

      if (!latest) {
        return current;
      }

      const armies = {
        ...current.armies,
      };

      for (
        const armyId
        of [
          ...latest
            .attackerArmyIds,
          ...latest
            .defenderArmyIds,
        ]
      ) {
        const army =
          armies[
            armyId
          ];

        if (!army) {
          continue;
        }

        const soldierCount =
          army.unitIds.reduce(
            (
              total,
              unitId
            ) => {
              const updated =
                attackerLosses
                  .units[
                    unitId
                  ] ??
                defenderLosses
                  .units[
                    unitId
                  ] ??
                current
                  .unitBlocks[
                    unitId
                  ];

              return (
                total +
                (
                  updated
                    ?.currentSoldiers ??
                  0
                )
              );
            },
            0
          );

        if (
          soldierCount <=
          0
        ) {
          armies[
            armyId
          ] = {
            ...army,

            status:
              "destroyed",

            morale:
              "broken",
          };
        }
      }

      return {
        ...current,

        unitBlocks: {
          ...current
            .unitBlocks,

          ...attackerLosses
            .units,

          ...defenderLosses
            .units,
        },

        armies,

        battles: {
          ...current.battles,

          [battle.id]: {
            ...latest,

            battleHour:
              nextHour,

            frontMomentum:
              momentumAfter,

            attackerTactic,

            defenderTactic,

            attackerMoralePressure:
              attackerPressure,

            defenderMoralePressure:
              defenderPressure,

            attackerReserveCommitted:
              latest
                .attackerReserveCommitted ||
              attackerTactic ===
                "commit_reserve",

            defenderReserveCommitted:
              latest
                .defenderReserveCommitted ||
              defenderTactic ===
                "commit_reserve",

            rounds: [
              ...latest.rounds,
              result,
            ],

            lastRound:
              result,

            history: [
              ...latest.history,

              {
                id:
                  `${battle.id}-history-${(
                    latest
                      .history
                      .length +
                    1
                  )
                    .toString()
                    .padStart(
                      3,
                      "0"
                    )}`,

                timestamp:
                  worldTime,

                type:
                  "battle_round",

                summary:
                  result.summary,
              },
            ],
          },
        },
      };
    }
  );

  return result;
}

export function battleShouldEnd(
  battleId:
    string
):
  | "attacker"
  | "defender"
  | undefined {
  const world =
    getRuntimeWorldState();

  const battle =
    world.battles[
      battleId
    ];

  if (
    !battle ||
    battle.status !==
      "active"
  ) {
    return undefined;
  }

  const attackerSoldiers =
    getSideSoldiers(
      battle,
      "attacker"
    );

  const defenderSoldiers =
    getSideSoldiers(
      battle,
      "defender"
    );

  //
  // Returned side is the LOSING side.
  //
  if (
    attackerSoldiers <=
      0 ||
    battle
      .attackerMoralePressure >=
      100 ||
    battle
      .frontMomentum <=
      -100 ||
    battle.attackerTactic ===
      "orderly_retreat"
  ) {
    return "attacker";
  }

  if (
    defenderSoldiers <=
      0 ||
    battle
      .defenderMoralePressure >=
      100 ||
    battle
      .frontMomentum >=
      100 ||
    battle.defenderTactic ===
      "orderly_retreat"
  ) {
    return "defender";
  }

  return undefined;
}