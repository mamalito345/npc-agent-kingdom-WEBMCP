import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmyDailyUpkeep,
  getArmyTotalSoldiers,
} from "@/lib/military/calculations";

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

  return getArmyDailyUpkeep(
    getArmyUnits(
      armyId
    ),
    army.status ===
      "garrison"
      ? "garrison"
      : "field"
  );
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