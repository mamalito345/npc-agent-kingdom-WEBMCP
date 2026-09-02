import type {
  Army,
  UnitBlock,
} from "@/types/military";

import type {
  Position,
} from "@/types/simulation";

interface ForceDefinition {
  armyId: string;
  kingdomId: string;
  commanderId: string;
  nodeId: string;
  infantryBlocks: number;
  cavalryBlocks: number;
  siegeBlocks?: number;
  foodSupply: number;
}

const royalForces: ForceDefinition[] = [
  {
    armyId: "army-northreach-edwyn",
    kingdomId: "northreach",
    commanderId: "lord_edwyn",
    nodeId: "stoneford",
    infantryBlocks: 2,
    cavalryBlocks: 1,
    siegeBlocks: 1,
    foodSupply: 1800,
  },
  {
    armyId: "army-eastvale-roderic",
    kingdomId: "eastvale",
    commanderId: "king_roderic",
    nodeId: "eastkeep",
    infantryBlocks: 2,
    cavalryBlocks: 1,
    siegeBlocks: 1,
    foodSupply: 1800,
  },
  {
    armyId: "army-westmoor-garran",
    kingdomId: "westmoor",
    commanderId: "king_garran",
    nodeId: "moorhall",
    infantryBlocks: 2,
    cavalryBlocks: 1,
    siegeBlocks: 1,
    foodSupply: 1800,
  },
  {
    armyId: "army-southmark-osric",
    kingdomId: "southmark",
    commanderId: "king_osric",
    nodeId: "sunspire",
    infantryBlocks: 2,
    cavalryBlocks: 1,
    siegeBlocks: 1,
    foodSupply: 1800,
  },
  {
    armyId: "army-ironhollow-varren",
    kingdomId: "ironhollow",
    commanderId: "king_varren",
    nodeId: "riverhold",
    infantryBlocks: 2,
    cavalryBlocks: 1,
    siegeBlocks: 1,
    foodSupply: 1800,
  },
];

const lordForces: ForceDefinition[] = [
  { armyId: "army-house-merek", kingdomId: "northreach", commanderId: "lord_merek", nodeId: "riverhold", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1200 },
  { armyId: "army-house-rowan", kingdomId: "northreach", commanderId: "lord_rowan", nodeId: "frostmere", infantryBlocks: 1, cavalryBlocks: 1, foodSupply: 850 },

  { armyId: "army-house-theon", kingdomId: "eastvale", commanderId: "lord_theon", nodeId: "greenharbor", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1200 },
  { armyId: "army-house-beric", kingdomId: "eastvale", commanderId: "lord_beric", nodeId: "dawnfort", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1100 },

  { armyId: "army-house-corvin", kingdomId: "westmoor", commanderId: "lord_corvin", nodeId: "blackfen", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1050 },
  { armyId: "army-house-harlan", kingdomId: "westmoor", commanderId: "lord_harlan", nodeId: "greywatch", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1100 },

  { armyId: "army-house-cedric", kingdomId: "southmark", commanderId: "lord_cedric", nodeId: "goldmeadow", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1200 },
  { armyId: "army-house-tavian", kingdomId: "southmark", commanderId: "lord_tavian", nodeId: "southgate", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1050 },

  { armyId: "army-house-durand", kingdomId: "ironhollow", commanderId: "lord_durand", nodeId: "emberfall", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1150 },
  { armyId: "army-house-malric", kingdomId: "ironhollow", commanderId: "lord_malric", nodeId: "ashguard", infantryBlocks: 2, cavalryBlocks: 1, foodSupply: 1150 },
];

const forces = [
  ...royalForces,
  ...lordForces,
];

const unitBlocks: Record<string, UnitBlock> = {};
const armies: Record<string, Army> = {};
const positions: Record<string, Position> = {};

function addUnits(
  force: ForceDefinition,
  type: UnitBlock["type"],
  count: number
): string[] {
  return Array.from(
    { length: count },
    (_, index) => {
      const unitId =
        `unit-${force.armyId}-${type}-${index + 1}`;

      unitBlocks[unitId] = {
        id: unitId,
        type,
        currentSoldiers:
          type === "siege"
            ? 1
            : 250,
      };

      return unitId;
    }
  );
}

for (const force of forces) {
  const unitIds = [
    ...addUnits(
      force,
      "infantry",
      force.infantryBlocks
    ),
    ...addUnits(
      force,
      "cavalry",
      force.cavalryBlocks
    ),
    ...addUnits(
      force,
      "siege",
      force.siegeBlocks ?? 0
    ),
  ];

  armies[force.armyId] = {
    id: force.armyId,
    ownerId: force.kingdomId,
    commanderId: force.commanderId,
    unitIds,
    morale: "normal",
    supply: {
      foodSupply: force.foodSupply,
      state: "supplied",
    },
    funding: {
      unpaidDays: 0,
      state: "funded",
    },
    status: "field",
  };

  positions[force.armyId] = {
    kind: "node",
    nodeId: force.nodeId,
  };
}

export const demoUnitBlocks =
  unitBlocks;

export const demoArmies =
  armies;

export const demoArmyPositions =
  positions;
