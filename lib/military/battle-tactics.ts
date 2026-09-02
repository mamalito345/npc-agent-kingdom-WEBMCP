import {
  getArmyUnits,
} from "@/lib/military/army-queries";

import type {
  BattleFeature,
  BattleSide,
  BattleTactic,
  BattleTerrain,
  PersistentBattle,
  UnitType,
} from "@/types/military";

export interface ArmyComposition {
  totalSoldiers: number;

  infantry:
    number;

  cavalry:
    number;

  siege:
    number;

  ship:
    number;
}

export interface TacticEvaluation {
  valid: boolean;

  powerMultiplier:
    number;

  casualtyReceivedMultiplier:
    number;

  momentumMultiplier:
    number;

  moralePressureMultiplier:
    number;

  reason?: string;
}

export function getArmyComposition(
  armyIds: string[]
): ArmyComposition {
  const result:
    ArmyComposition = {
    totalSoldiers:
      0,

    infantry:
      0,

    cavalry:
      0,

    siege:
      0,

    ship:
      0,
  };

  for (
    const armyId
    of armyIds
  ) {
    const units =
      getArmyUnits(
        armyId
      );

    for (
      const unit
      of units
    ) {
      result.totalSoldiers +=
        unit.currentSoldiers;

      result[
        unit.type
      ] +=
        unit.currentSoldiers;
    }
  }

  return result;
}

function getShare(
  composition:
    ArmyComposition,
  type:
    UnitType
): number {
  if (
    composition
      .totalSoldiers <=
    0
  ) {
    return 0;
  }

  return (
    composition[
      type
    ] /
    composition
      .totalSoldiers
  );
}

function terrainAllowsCavalryFlank(
  terrain:
    BattleTerrain,
  features:
    BattleFeature[]
): boolean {
  if (
    terrain ===
      "mountain" ||
    terrain ===
      "dense_forest" ||
    terrain ===
      "marsh" ||
    features.includes(
      "bridge"
    ) ||
    features.includes(
      "narrow_pass"
    )
  ) {
    return false;
  }

  return true;
}

export function evaluateBattleTactic(
  tactic:
    BattleTactic,
  composition:
    ArmyComposition,
  terrain:
    BattleTerrain,
  features:
    BattleFeature[],
  side:
    BattleSide,
  enemyTactic:
    BattleTactic
): TacticEvaluation {
  let powerMultiplier =
    1;

  let casualtyReceivedMultiplier =
    1;

  let momentumMultiplier =
    1;

  let moralePressureMultiplier =
    1;

  switch (tactic) {
    case "hold_ground": {
      powerMultiplier *=
        side ===
        "defender"
          ? 1.08
          : 1;

      casualtyReceivedMultiplier *=
        0.78;

      momentumMultiplier *=
        0.6;

      break;
    }

    case "aggressive_push": {
      powerMultiplier *=
        1.16;

      casualtyReceivedMultiplier *=
        1.18;

      momentumMultiplier *=
        1.4;

      moralePressureMultiplier *=
        1.1;

      break;
    }

    case "shield_wall": {
      if (
        getShare(
          composition,
          "infantry"
        ) <
        0.4
      ) {
        return {
          valid:
            false,

          powerMultiplier:
            1,

          casualtyReceivedMultiplier:
            1,

          momentumMultiplier:
            1,

          moralePressureMultiplier:
            1,

          reason:
            "Shield wall requires at least 40% infantry.",
        };
      }

      casualtyReceivedMultiplier *=
        0.72;

      momentumMultiplier *=
        0.55;

      if (
        enemyTactic ===
        "cavalry_flank"
      ) {
        powerMultiplier *=
          1.22;
      }

      break;
    }

    case "cavalry_flank": {
      if (
        getShare(
          composition,
          "cavalry"
        ) <
        0.2
      ) {
        return {
          valid:
            false,

          powerMultiplier:
            1,

          casualtyReceivedMultiplier:
            1,

          momentumMultiplier:
            1,

          moralePressureMultiplier:
            1,

          reason:
            "Cavalry flank requires at least 20% cavalry.",
        };
      }

      if (
        !terrainAllowsCavalryFlank(
          terrain,
          features
        )
      ) {
        return {
          valid:
            false,

          powerMultiplier:
            1,

          casualtyReceivedMultiplier:
            1,

          momentumMultiplier:
            1,

          moralePressureMultiplier:
            1,

          reason:
            "Terrain prevents cavalry flanking.",
        };
      }

      powerMultiplier *=
        terrain ===
        "plains"
          ? 1.3
          : 1.15;

      momentumMultiplier *=
        1.35;

      moralePressureMultiplier *=
        1.25;

      if (
        enemyTactic ===
        "shield_wall"
      ) {
        powerMultiplier *=
          0.7;
      }

      break;
    }

    case "commit_reserve": {
      powerMultiplier *=
        1.2;

      momentumMultiplier *=
        1.2;

      break;
    }

    case "counterattack": {
      powerMultiplier *=
        enemyTactic ===
        "aggressive_push"
          ? 1.3
          : 1.02;

      casualtyReceivedMultiplier *=
        enemyTactic ===
        "aggressive_push"
          ? 0.9
          : 1.05;

      momentumMultiplier *=
        1.15;

      break;
    }

    case "seize_high_ground": {
      if (
        !features.includes(
          "high_ground"
        )
      ) {
        return {
          valid:
            false,

          powerMultiplier:
            1,

          casualtyReceivedMultiplier:
            1,

          momentumMultiplier:
            1,

          moralePressureMultiplier:
            1,

          reason:
            "There is no high ground to seize.",
        };
      }

      powerMultiplier *=
        1.12;

      momentumMultiplier *=
        1.3;

      casualtyReceivedMultiplier *=
        1.05;

      break;
    }

    case "orderly_retreat": {
      powerMultiplier *=
        0.65;

      casualtyReceivedMultiplier *=
        0.65;

      momentumMultiplier *=
        0.3;

      break;
    }

    case "desperate_assault": {
      powerMultiplier *=
        1.35;

      casualtyReceivedMultiplier *=
        1.5;

      momentumMultiplier *=
        1.65;

      moralePressureMultiplier *=
        1.35;

      break;
    }
  }

  if (
    side ===
      "defender" &&
    terrain ===
      "hills"
  ) {
    powerMultiplier *=
      1.12;

    casualtyReceivedMultiplier *=
      0.85;
  }

  if (
    side ===
      "defender" &&
    features.includes(
      "high_ground"
    )
  ) {
    powerMultiplier *=
      1.1;

    casualtyReceivedMultiplier *=
      0.88;
  }

  if (
    terrain ===
    "dense_forest"
  ) {
    casualtyReceivedMultiplier *=
      0.92;
  }

  if (
    side ===
      "attacker" &&
    features.includes(
      "bridge"
    )
  ) {
    powerMultiplier *=
      0.72;

    casualtyReceivedMultiplier *=
      1.22;
  }

  return {
    valid:
      true,

    powerMultiplier,

    casualtyReceivedMultiplier,

    momentumMultiplier,

    moralePressureMultiplier,
  };
}

export function getDefaultBattleTactic(
  battle:
    PersistentBattle,
  side:
    BattleSide
): BattleTactic {
  const order =
    [...battle.activeOrders]
      .reverse()
      .find(
        (candidate) =>
          (
            side ===
              "attacker"
              ? battle
                  .attackerArmyIds
              : battle
                  .defenderArmyIds
          ).includes(
            candidate.armyId
          )
      );

  switch (
    order?.type
  ) {
    case "press_attack":
      return "aggressive_push";

    case "commit_reserve":
      return "commit_reserve";

    case "order_retreat":
      return "orderly_retreat";

    case "hold_position":
      return "hold_ground";

    default:
      return side ===
        "attacker"
        ? "aggressive_push"
        : "hold_ground";
  }
}