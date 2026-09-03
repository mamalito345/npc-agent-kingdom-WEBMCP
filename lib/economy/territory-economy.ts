import {
  getConnectedEdges,
  getMapNodes,
} from "@/lib/map/graph";

import {
  getRoadSecurity,
} from "@/lib/economy/road-security";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  areKingdomsAtWar,
} from "@/lib/politics/war";

import type {
  MapNode,
  TransitNodeType,
} from "@/types/map";

export type TerritoryEconomicStatus =
  | "secure"
  | "threatened"
  | "contested"
  | "occupied";

export interface TerritoryNodeEconomy {
  nodeId: string;
  homeKingdomId: string;
  controllerKingdomId?: string;
  status: TerritoryEconomicStatus;
  baseGold: number;
  connectivityMultiplier: number;
  roadSecurityMultiplier: number;
  controlMultiplier: number;
  grossGold: number;
  homeIncomeGold: number;
  occupationIncomeGold: number;
  hostileArmyKingdomIds: string[];
}

export interface KingdomTerritoryEconomy {
  kingdomId: string;
  homeNodeCount: number;
  secureNodeCount: number;
  threatenedNodeCount: number;
  contestedNodeCount: number;
  occupiedHomeNodeCount: number;
  homePotentialGold: number;
  homeRealizedGold: number;
  occupationIncomeGold: number;
  dailyTerritoryGold: number;
  disruptedGold: number;
  nodes: TerritoryNodeEconomy[];
}

const BASE_GOLD_BY_TYPE:
  Record<TransitNodeType, number> = {
    road_junction: 8,
    forest_path: 3,
    mountain_pass: 7,
    river_crossing: 6,
    plains_waypoint: 4,
    bridge: 10,
    border_crossing: 7,
    coast_road: 5,
    hill_road: 4,
  };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isEconomicTransitNode(
  node: MapNode
): node is MapNode & {
  transitType: TransitNodeType;
  territoryKingdomId: string;
} {
  return (
    node.kind === "transit" &&
    node.transitType !== undefined &&
    node.territoryKingdomId !== undefined
  );
}

function activeArmyKingdomsAtNode(
  nodeId: string
): string[] {
  const world = getRuntimeWorldState();

  return [
    ...new Set(
      Object.values(world.armies)
        .filter((army) => {
          if (army.status === "destroyed") return false;

          const position =
            world.simulation.entityPositions[army.id];

          return (
            position?.kind === "node" &&
            position.nodeId === nodeId
          );
        })
        .map((army) => army.ownerId)
    ),
  ].sort();
}

function areHostile(a: string, b: string): boolean {
  if (a === b) return false;

  return areKingdomsAtWar(
    a,
    b
  );
}

function getNodeControl(
  node: MapNode & {
    territoryKingdomId: string;
  }
): {
  controllerKingdomId?: string;
  status: TerritoryEconomicStatus;
  hostileArmyKingdomIds: string[];
} {
  const home = node.territoryKingdomId;
  const present = activeArmyKingdomsAtNode(node.id);
  const homePresent = present.includes(home);

  const foreign =
    present.filter((kingdomId) => kingdomId !== home);

  const hostile =
    foreign.filter((kingdomId) =>
      areHostile(home, kingdomId)
    );

  if (homePresent && hostile.length > 0) {
    return {
      controllerKingdomId: undefined,
      status: "contested",
      hostileArmyKingdomIds: hostile,
    };
  }

  if (!homePresent && hostile.length === 1) {
    return {
      controllerKingdomId: hostile[0],
      status: "occupied",
      hostileArmyKingdomIds: hostile,
    };
  }

  if (hostile.length > 1) {
    return {
      controllerKingdomId: undefined,
      status: "contested",
      hostileArmyKingdomIds: hostile,
    };
  }

  if (foreign.length > 0) {
    return {
      controllerKingdomId: home,
      status: "threatened",
      hostileArmyKingdomIds: [],
    };
  }

  return {
    controllerKingdomId: home,
    status: "secure",
    hostileArmyKingdomIds: [],
  };
}

function getControlMultiplier(
  status: TerritoryEconomicStatus
): number {
  switch (status) {
    case "secure":
      return 1;
    case "threatened":
      return 0.72;
    case "contested":
      return 0.2;
    case "occupied":
      return 0.35;
  }
}

function getConnectivityMultiplier(
  nodeId: string
): number {
  const degree = getConnectedEdges(nodeId).length;

  return Math.min(
    1.6,
    1 + Math.max(0, degree - 2) * 0.12
  );
}

function getAverageRoadSecurityMultiplier(
  nodeId: string
): number {
  const edges = getConnectedEdges(nodeId);

  if (edges.length === 0) return 0.5;

  return (
    edges.reduce(
      (total, edge) =>
        total + getRoadSecurity(edge.id).multiplier,
      0
    ) / edges.length
  );
}

export function getTerritoryNodeEconomy(
  nodeId: string
): TerritoryNodeEconomy | undefined {
  const node = getMapNodes().find(
    (candidate) => candidate.id === nodeId
  );

  if (!node || !isEconomicTransitNode(node)) {
    return undefined;
  }

  const control = getNodeControl(node);
  const baseGold = BASE_GOLD_BY_TYPE[node.transitType];
  const connectivityMultiplier =
    getConnectivityMultiplier(node.id);
  const roadSecurityMultiplier =
    getAverageRoadSecurityMultiplier(node.id);
  const controlMultiplier =
    getControlMultiplier(control.status);

  const grossGold =
    baseGold *
    connectivityMultiplier *
    roadSecurityMultiplier;

  const realized =
    grossGold * controlMultiplier;

  const homeIncomeGold =
    control.status === "occupied"
      ? 0
      : realized;

  const occupationIncomeGold =
    control.status === "occupied" &&
    control.controllerKingdomId
      ? realized
      : 0;

  return {
    nodeId: node.id,
    homeKingdomId: node.territoryKingdomId,
    controllerKingdomId:
      control.controllerKingdomId,
    status: control.status,
    baseGold: round2(baseGold),
    connectivityMultiplier:
      round2(connectivityMultiplier),
    roadSecurityMultiplier:
      round2(roadSecurityMultiplier),
    controlMultiplier:
      round2(controlMultiplier),
    grossGold: round2(grossGold),
    homeIncomeGold:
      round2(homeIncomeGold),
    occupationIncomeGold:
      round2(occupationIncomeGold),
    hostileArmyKingdomIds:
      control.hostileArmyKingdomIds,
  };
}

export function getAllTerritoryNodeEconomies():
  TerritoryNodeEconomy[] {
  return getMapNodes()
    .filter(isEconomicTransitNode)
    .map((node) =>
      getTerritoryNodeEconomy(node.id)
    )
    .filter(
      (
        value
      ): value is TerritoryNodeEconomy =>
        value !== undefined
    )
    .sort((a, b) =>
      a.nodeId.localeCompare(b.nodeId)
    );
}

export function getKingdomTerritoryEconomy(
  kingdomId: string
): KingdomTerritoryEconomy {
  const relevant =
    getAllTerritoryNodeEconomies();

  const homeNodes =
    relevant.filter(
      (node) =>
        node.homeKingdomId === kingdomId
    );

  const occupationNodes =
    relevant.filter(
      (node) =>
        node.status === "occupied" &&
        node.controllerKingdomId === kingdomId &&
        node.homeKingdomId !== kingdomId
    );

  const homePotentialGold =
    homeNodes.reduce(
      (total, node) =>
        total + node.grossGold,
      0
    );

  const homeRealizedGold =
    homeNodes.reduce(
      (total, node) =>
        total + node.homeIncomeGold,
      0
    );

  const occupationIncomeGold =
    occupationNodes.reduce(
      (total, node) =>
        total + node.occupationIncomeGold,
      0
    );

  return {
    kingdomId,
    homeNodeCount: homeNodes.length,
    secureNodeCount:
      homeNodes.filter(
        (node) => node.status === "secure"
      ).length,
    threatenedNodeCount:
      homeNodes.filter(
        (node) => node.status === "threatened"
      ).length,
    contestedNodeCount:
      homeNodes.filter(
        (node) => node.status === "contested"
      ).length,
    occupiedHomeNodeCount:
      homeNodes.filter(
        (node) => node.status === "occupied"
      ).length,
    homePotentialGold:
      round2(homePotentialGold),
    homeRealizedGold:
      round2(homeRealizedGold),
    occupationIncomeGold:
      round2(occupationIncomeGold),
    dailyTerritoryGold:
      round2(
        homeRealizedGold +
          occupationIncomeGold
      ),
    disruptedGold:
      round2(
        Math.max(
          0,
          homePotentialGold -
            homeRealizedGold
        )
      ),
    nodes: [
      ...homeNodes,
      ...occupationNodes,
    ],
  };
}
