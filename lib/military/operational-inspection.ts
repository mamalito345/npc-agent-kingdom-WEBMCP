import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  calculateBattleSidePower,
} from "@/lib/military/battle-side-power";

import {
  getKingdomStrategicEconomy,
} from "@/lib/economy/strategic-metrics";

import {
  getRoadSecurity,
} from "@/lib/economy/road-security";

export function inspectBattle(
  battleId: string
) {
  const world =
    getRuntimeWorldState();

  const battle =
    world.battles[
      battleId
    ];

  if (!battle) {
    return {
      ok: false as const,
      error:
        "BATTLE_NOT_FOUND" as const,
    };
  }

  return {
    ok: true as const,

    battle: {
      ...battle,

      attackerPower:
        calculateBattleSidePower(
          battle,
          "attacker"
        ),

      defenderPower:
        calculateBattleSidePower(
          battle,
          "defender"
        ),

      armies: {
        attacker:
          battle.attackerArmyIds.map(
            (armyId) => ({
              armyId,

              army:
                world.armies[
                  armyId
                ],

              position:
                world.simulation
                  .entityPositions[
                    armyId
                  ],
            })
          ),

        defender:
          battle.defenderArmyIds.map(
            (armyId) => ({
              armyId,

              army:
                world.armies[
                  armyId
                ],

              position:
                world.simulation
                  .entityPositions[
                    armyId
                  ],
            })
          ),
      },

      finalResult:
        battle.finalBattleResultId
          ? world.battleResults[
              battle
                .finalBattleResultId
            ] ?? null
          : null,
    },
  };
}

export function inspectActiveBattles() {
  const world =
    getRuntimeWorldState();

  return {
    ok: true as const,

    battles:
      Object.values(
        world.battles
      )
        .filter(
          (battle) =>
            battle.status ===
            "active"
        )
        .sort(
          (a, b) =>
            a.startedAt -
              b.startedAt ||
            a.id.localeCompare(
              b.id
            )
        )
        .map(
          (battle) => ({
            id:
              battle.id,

            warId:
              battle.warId,

            nodeId:
              battle.nodeId,

            phase:
              battle.currentPhase,

            nextPhaseAt:
              battle.nextPhaseAt,

            attackerArmyIds:
              battle
                .attackerArmyIds,

            defenderArmyIds:
              battle
                .defenderArmyIds,

            pendingDecision:
              battle
                .pendingDecision,

            orders:
              battle
                .activeOrders,
          })
        ),
  };
}

export function inspectSiege(
  siegeId: string
) {
  const world =
    getRuntimeWorldState();

  const siege =
    world.sieges[
      siegeId
    ];

  if (!siege) {
    return {
      ok: false as const,
      error:
        "SIEGE_NOT_FOUND" as const,
    };
  }

  const settlement =
    world.settlements[
      siege.settlementId
    ];

  return {
    ok: true as const,

    siege: {
      ...siege,

      settlement:
        settlement
          ? {
              id:
                settlement.id,

              name:
                settlement.name,

              politicalOwnerKingdomId:
                settlement
                  .kingdomId,

              controllerKingdomId:
                settlement
                  .controllerKingdomId ??
                settlement
                  .kingdomId,

              fortificationLevel:
                settlement
                  .fortificationLevel ??
                0,

              fortificationIntegrity:
                settlement
                  .fortificationIntegrity ??
                0,
            }
          : null,
    },
  };
}

export function inspectActiveSieges() {
  const world =
    getRuntimeWorldState();

  return {
    ok: true as const,

    sieges:
      Object.values(
        world.sieges
      )
        .filter(
          (siege) =>
            siege.status ===
            "active"
        )
        .sort(
          (a, b) =>
            a.startedAt -
              b.startedAt ||
            a.id.localeCompare(
              b.id
            )
        ),
  };
}

export function inspectWars() {
  const world =
    getRuntimeWorldState();

  return {
    ok: true as const,

    wars:
      Object.values(
        world.wars
      ).sort(
        (a, b) =>
          a.startedAt -
            b.startedAt ||
          a.id.localeCompare(
            b.id
          )
      ),
  };
}

export function inspectKingdomEconomy(
  kingdomId: string
) {
  const world =
    getRuntimeWorldState();

  if (
    !world.kingdoms[
      kingdomId
    ]
  ) {
    return {
      ok: false as const,
      error:
        "KINGDOM_NOT_FOUND" as const,
    };
  }

  return {
    ok: true as const,

    economy:
      getKingdomStrategicEconomy(
        kingdomId
      ),
  };
}

export function inspectRoad(
  edgeId: string
) {
  try {
    return {
      ok: true as const,

      road:
        getRoadSecurity(
          edgeId
        ),
    };
  } catch {
    return {
      ok: false as const,
      error:
        "ROAD_NOT_FOUND" as const,
    };
  }
}