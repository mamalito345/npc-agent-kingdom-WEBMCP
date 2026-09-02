import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  evaluateBattleTactic,
  getArmyComposition,
} from "@/lib/military/battle-tactics";

import type {
  BattleSide,
  BattleTactic,
} from "@/types/military";

export interface SetBattleTacticInput {
  battleId: string;
  armyId: string;
  tactic: BattleTactic;
}

export type SetBattleTacticResult =
  | {
      ok: false;
      error:
        | "BATTLE_NOT_FOUND"
        | "BATTLE_NOT_ACTIVE"
        | "ARMY_NOT_IN_BATTLE"
        | "TACTIC_NOT_AVAILABLE";
      reason?: string;
    }
  | {
      ok: true;
      tactic: BattleTactic;
      side: BattleSide;
    };

export function setBattleTactic(
  input: SetBattleTacticInput
): SetBattleTacticResult {
  const world =
    getRuntimeWorldState();

  const battle =
    world.battles[
      input.battleId
    ];

  if (!battle) {
    return {
      ok: false,
      error:
        "BATTLE_NOT_FOUND",
    };
  }

  if (
    battle.status !==
    "active"
  ) {
    return {
      ok: false,
      error:
        "BATTLE_NOT_ACTIVE",
    };
  }

  if (
    input.tactic ===
    "commit_reserve"
  ) {
    return {
      ok: false,

      error:
        "TACTIC_NOT_AVAILABLE",

      reason:
        "Commit Reserve is a crisis battle order, not a normal hourly tactic.",
    };
  }

  let side:
    BattleSide;

  if (
    battle.attackerArmyIds.includes(
      input.armyId
    )
  ) {
    side =
      "attacker";
  } else if (
    battle.defenderArmyIds.includes(
      input.armyId
    )
  ) {
    side =
      "defender";
  } else {
    return {
      ok: false,
      error:
        "ARMY_NOT_IN_BATTLE",
    };
  }

  const armyIds =
    side ===
    "attacker"
      ? battle
          .attackerArmyIds
      : battle
          .defenderArmyIds;

  const enemyTactic =
    side ===
    "attacker"
      ? battle
          .defenderTactic
      : battle
          .attackerTactic;

  const composition =
    getArmyComposition(
      armyIds
    );

  const evaluation =
    evaluateBattleTactic(
      input.tactic,
      composition,
      battle.terrain,
      battle.features,
      side,
      enemyTactic
    );

  if (
    !evaluation.valid
  ) {
    return {
      ok: false,

      error:
        "TACTIC_NOT_AVAILABLE",

      reason:
        evaluation.reason,
    };
  }

  updateRuntimeWorldState(
    (current) => {
      const latest =
        current.battles[
          input.battleId
        ];

      if (
        !latest ||
        latest.status !==
          "active"
      ) {
        return current;
      }

      const now =
        current.simulation
          .worldTimeMinutes;

      const updated =
        side ===
        "attacker"
          ? {
              ...latest,

              attackerTactic:
                input.tactic,
            }
          : {
              ...latest,

              defenderTactic:
                input.tactic,
            };

      return {
        ...current,

        battles: {
          ...current.battles,

          [input.battleId]: {
            ...updated,

            history: [
              ...updated.history,

              {
                id:
                  `${input.battleId}-history-${(
                    updated
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
                  now,

                type:
                  "order_issued" as const,

                summary:
                  `${input.armyId} changed ${side} tactic to ${input.tactic}.`,
              },
            ],
          },
        },
      };
    }
  );

  return {
    ok: true,
    tactic:
      input.tactic,
    side,
  };
}