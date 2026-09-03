import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getSettlementControllerId,
  inspectSettlementOccupation,
} from "@/lib/military/occupation";

import {
  getRecommendedGarrison,
} from "@/lib/military/garrison";

import {
  getArmyDailyCosts,
  getArmySoldierCount,
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  getArmySupplyDays,
} from "@/lib/military/supply";

import {
  getAvailableSettlementResources,
  getReservedResources,
} from "@/lib/economy/reservations";

export function inspectArmy(
  armyId: string
) {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  return {
    ok: true,

    army: {
      ...army,

      position:
        world.simulation
          .entityPositions[
            armyId
          ],

      movement:
        world.simulation
          .activeMovements[
            armyId
          ],

      units:
        getArmyUnits(
          armyId
        ),

      soldiers:
        getArmySoldierCount(
          armyId
        ),

      dailyUpkeep:
        getArmyDailyCosts(
          armyId
        ),

      supplyDays:
        getArmySupplyDays(
          armyId
        ),
    },
  };
}

export function inspectSettlementResources(
  settlementId:
    string
) {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    return {
      ok: false,
      error:
        "SETTLEMENT_NOT_FOUND",
    };
  }

  return {
    ok: true,

    settlementId,

    total:
      settlement.resources,

    reserved:
      getReservedResources(
        settlementId
      ),

    available:
      getAvailableSettlementResources(
        settlementId
      ),
  };
}

export function inspectSettlementMilitary(
  settlementId:
    string
) {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    return {
      ok: false as const,
      error:
        "SETTLEMENT_NOT_FOUND" as const,
    };
  }

  const armies =
    Object.values(
      world.armies
    )
      .filter(
        (army) => {
          const position =
            world.simulation
              .entityPositions[
                army.id
              ];

          return (
            army.status !==
              "destroyed" &&
            position?.kind ===
              "node" &&
            position.nodeId ===
              settlement.locationId
          );
        }
      )
      .map(
        (army) => ({
          armyId:
            army.id,

          ownerId:
            army.ownerId,

          status:
            army.status,

          soldiers:
            getArmySoldierCount(
              army.id
            ),
        })
      );

  const controllerKingdomId =
    getSettlementControllerId(
      settlement
    );

  const garrisonSoldiers =
    armies
      .filter(
        (army) =>
          army.status ===
            "garrison" &&
          army.ownerId ===
            controllerKingdomId
      )
      .reduce(
        (
          total,
          army
        ) =>
          total +
          army.soldiers,
        0
      );

  const recommendedGarrison =
    getRecommendedGarrison(
      settlement.type
    );
  const activeFortificationOrder =
    Object.values(
      world
        .fortificationOrders
    ).find(
      (order) =>
        order.settlementId ===
          settlementId &&
        order.status ===
          "active"
    );
  const activeFortificationRepair =
    Object.values(
      world
        .fortificationRepairOrders
    ).find(
      (order) =>
        order.settlementId ===
          settlementId &&
        order.status ===
          "active"
    );
  return {
    ok: true as const,

    settlementId,

    politicalOwnerKingdomId:
      settlement.kingdomId,

    controllerKingdomId:
      getSettlementControllerId(
        settlement
      ),

    occupation:
      inspectSettlementOccupation(
        settlementId
      ),

    fortificationLevel:
      settlement
        .fortificationLevel ??
      0,

    recommendedGarrison,

    garrisonSoldiers,

    underGarrisoned:
      garrisonSoldiers <
      recommendedGarrison,

    productionDamage:
      settlement
        .productionDamage,

    armies,
    
    activeFortificationOrder,
    fortificationIntegrity:
      settlement
        .fortificationLevel &&
      settlement
        .fortificationLevel >
         0
        ? settlement
            .fortificationIntegrity ??
          100
        : 0,

    activeFortificationRepair,
  };
}