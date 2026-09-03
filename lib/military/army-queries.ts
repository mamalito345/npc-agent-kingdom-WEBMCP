import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmyDailyUpkeep,
  getArmyTotalSoldiers,
} from "@/lib/military/calculations";

import {
  getMapEdge,
  getNodeTerritory,
} from "@/lib/map/graph";

import type {
  Army,
  UnitBlock,
} from "@/types/military";

export function getArmy(
  armyId: string
): Army | undefined {
  return (
    getRuntimeWorldState()
      .armies[
        armyId
      ]
  );
}

export function getArmyUnits(
  armyId: string
): UnitBlock[] {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return [];
  }

  return army.unitIds
    .map(
      (unitId) =>
        world.unitBlocks[
          unitId
        ]
    )
    .filter(
      (
        unit
      ): unit is UnitBlock =>
        Boolean(unit)
    );
}

export function getArmySoldierCount(
  armyId: string
): number {
  return getArmyTotalSoldiers(
    getArmyUnits(
      armyId
    )
  );
}

function getArmyTerritoryKingdomId(
  armyId: string
): string | undefined {
  const world =
    getRuntimeWorldState();

  const position =
    world.simulation
      .entityPositions[
        armyId
      ];

  if (!position) {
    return undefined;
  }

  if (
    position.kind ===
    "node"
  ) {
    return getNodeTerritory(
      position.nodeId
    );
  }

  if (
    position.kind ===
    "edge"
  ) {
    const edge =
      getMapEdge(
        position.edgeId
      );

    if (
      edge?.territoryKingdomId
    ) {
      return edge
        .territoryKingdomId;
    }

    if (
      edge?.borderCrossing
    ) {
      return undefined;
    }
  }

  return undefined;
}

export function getArmyCampaignCostMultiplier(
  armyId: string
): number {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return 1;
  }

  if (
    army.status ===
    "garrison"
  ) {
    return 1;
  }

  let multiplier =
    1;

  if (
    army.status ===
    "siege"
  ) {
    multiplier *=
      1.35;
  } else if (
    army.status ===
    "battle"
  ) {
    multiplier *=
      1.2;
  } else if (
    world.simulation
      .activeMovements[
        armyId
      ]
  ) {
    multiplier *=
      1.15;
  }

  const territoryKingdomId =
    getArmyTerritoryKingdomId(
      armyId
    );

  if (
    territoryKingdomId &&
    territoryKingdomId !==
      army.ownerId
  ) {
    multiplier *=
      1.15;
  }

  return Math.min(
    1.6,
    multiplier
  );
}

export function getArmyDailyCosts(
  armyId: string
): {
  gold: number;
  food: number;
} {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return {
      gold: 0,
      food: 0,
    };
  }

  const base =
    getArmyDailyUpkeep(
      getArmyUnits(
        armyId
      ),
      army.status ===
        "garrison"
        ? "garrison"
        : "field"
    );

  const multiplier =
    getArmyCampaignCostMultiplier(
      armyId
    );

  return {
    gold:
      base.gold *
      multiplier,
    food:
      base.food *
      multiplier,
  };
}

export function isArmyAtNode(
  armyId: string
): boolean {
  const position =
    getRuntimeWorldState()
      .simulation
      .entityPositions[
        armyId
      ];

  return (
    position?.kind ===
    "node"
  );
}

export function getArmyNodeId(
  armyId: string
): string | undefined {
  const position =
    getRuntimeWorldState()
      .simulation
      .entityPositions[
        armyId
      ];

  if (
    !position ||
    position.kind !==
      "node"
  ) {
    return undefined;
  }

  return position.nodeId;
}
