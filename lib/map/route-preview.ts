import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  findRoute,
} from "@/lib/map/paths";

import {
  getMapNode,
} from "@/lib/map/graph";

import {
  findFirstUnauthorizedBorderCrossing,
} from "@/lib/map/border-access";

import {
  getArmyEffectiveSpeedKmPerHour,
} from "@/lib/military/army-movement";

export interface RoutePreviewPoint {
  x: number;
  y: number;
}

export interface ArmyRoutePreview {
  armyId: string;
  destinationNodeId: string;
  destinationName: string;
  destinationTerrain?: string;
  destinationFeatures: string[];
  physicalDistanceKm: number;
  effectiveDistanceKm: number;
  estimatedDurationMinutes: number;
  estimatedArrivalAt: number;
  nodeIds: string[];
  edgeIds: string[];
  points: RoutePreviewPoint[];
  unauthorizedBorder?: {
    edgeId: string;
    fromKingdomId: string;
    toKingdomId: string;
    crossingNodeId?: string;
  };
}

export function buildArmyRoutePreview(
  armyId: string,
  destinationNodeId: string
):
  | {
      ok: true;
      preview: ArmyRoutePreview;
    }
  | {
      ok: false;
      error:
        | "ARMY_NOT_FOUND"
        | "ARMY_NOT_AT_NODE"
        | "DESTINATION_NOT_FOUND"
        | "ROUTE_NOT_FOUND"
        | "ALREADY_AT_DESTINATION";
    } {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[armyId];

  if (!army) {
    return {
      ok: false,
      error: "ARMY_NOT_FOUND",
    };
  }

  const position =
    world.simulation
      .entityPositions[armyId];

  if (
    !position ||
    position.kind !== "node"
  ) {
    return {
      ok: false,
      error: "ARMY_NOT_AT_NODE",
    };
  }

  const destination =
    world.locations[
      destinationNodeId
    ];

  if (!destination) {
    return {
      ok: false,
      error:
        "DESTINATION_NOT_FOUND",
    };
  }

  if (
    position.nodeId ===
    destinationNodeId
  ) {
    return {
      ok: false,
      error:
        "ALREADY_AT_DESTINATION",
    };
  }

  const route =
    findRoute(
      position.nodeId,
      destinationNodeId
    );

  if (!route) {
    return {
      ok: false,
      error: "ROUTE_NOT_FOUND",
    };
  }

  const estimatedDurationMinutes =
    Math.ceil(
      (
        route.effectiveDistanceKm /
        getArmyEffectiveSpeedKmPerHour(
          armyId
        )
      ) *
        60
    );

  const points =
    route.nodeIds
      .map(
        (nodeId) =>
          getMapNode(nodeId)
      )
      .filter(
        (
          node
        ): node is NonNullable<
          ReturnType<
            typeof getMapNode
          >
        > =>
          Boolean(node)
      )
      .map(
        (node) => ({
          x: node.x,
          y: node.y,
        })
      );

  const destinationNode =
    getMapNode(
      destinationNodeId
    );

  return {
    ok: true,
    preview: {
      armyId,
      destinationNodeId,
      destinationName:
        destination.name,
      destinationTerrain:
        destinationNode?.terrain,
      destinationFeatures:
        destinationNode?.features
          ? [
              ...destinationNode.features,
            ]
          : [],
      physicalDistanceKm:
        route.totalDistanceKm,
      effectiveDistanceKm:
        route.effectiveDistanceKm,
      estimatedDurationMinutes,
      estimatedArrivalAt:
        world.simulation
          .worldTimeMinutes +
        estimatedDurationMinutes,
      nodeIds:
        [...route.nodeIds],
      edgeIds:
        [...route.edgeIds],
      points,
      unauthorizedBorder:
        findFirstUnauthorizedBorderCrossing(
          route,
          army.ownerId
        ),
    },
  };
}

export function formatDuration(
  minutes: number
): string {
  const days =
    Math.floor(
      minutes /
        (24 * 60)
    );

  const hours =
    Math.floor(
      (
        minutes %
        (24 * 60)
      ) / 60
    );

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${Math.max(1, hours)}h`;
}
