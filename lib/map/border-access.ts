import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getMapEdge,
} from "@/lib/map/graph";

import type {
  Route,
} from "@/types/map";

export interface UnauthorizedBorderCrossing {
  edgeId: string;
  fromKingdomId: string;
  toKingdomId: string;
  crossingNodeId?: string;
}

function kingdomsAtWar(
  kingdomA: string,
  kingdomB: string
): boolean {
  return Object.values(
    getRuntimeWorldState().wars
  ).some(
    (war) =>
      war.status === "active" &&
      (
        (
          war.attackerRealmIds.includes(kingdomA) &&
          war.defenderRealmIds.includes(kingdomB)
        ) ||
        (
          war.attackerRealmIds.includes(kingdomB) &&
          war.defenderRealmIds.includes(kingdomA)
        )
      )
  );
}

function hasMilitaryAccessAgreement(
  kingdomA: string,
  kingdomB: string
): boolean {
  return Object.values(
    getRuntimeWorldState().session.politics.agreements
  ).some(
    (agreement) =>
      agreement.status === "ACTIVE" &&
      (
        agreement.type === "ALLIANCE" ||
        agreement.type === "MILITARY_SUPPORT"
      ) &&
      agreement.partyKingdomIds.includes(kingdomA) &&
      agreement.partyKingdomIds.includes(kingdomB)
  );
}

export function hasCanonicalMilitaryAccess(
  movingKingdomId: string,
  foreignKingdomId: string
): boolean {
  if (movingKingdomId === foreignKingdomId) {
    return true;
  }

  return (
    kingdomsAtWar(
      movingKingdomId,
      foreignKingdomId
    ) ||
    hasMilitaryAccessAgreement(
      movingKingdomId,
      foreignKingdomId
    )
  );
}

export function findFirstUnauthorizedBorderCrossing(
  route: Route,
  movingKingdomId: string
): UnauthorizedBorderCrossing | undefined {
  for (let index = 0; index < route.edgeIds.length; index += 1) {
    const edgeId = route.edgeIds[index];
    const fromNodeId = route.nodeIds[index];

    if (!edgeId || !fromNodeId) {
      continue;
    }

    const edge = getMapEdge(edgeId);

    if (!edge?.borderCrossing) {
      continue;
    }

    const forward =
      edge.fromNodeId === fromNodeId;

    const fromKingdomId =
      forward
        ? edge.borderCrossing.fromKingdomId
        : edge.borderCrossing.toKingdomId;

    const toKingdomId =
      forward
        ? edge.borderCrossing.toKingdomId
        : edge.borderCrossing.fromKingdomId;

    if (
      fromKingdomId === movingKingdomId &&
      toKingdomId !== movingKingdomId &&
      !hasCanonicalMilitaryAccess(
        movingKingdomId,
        toKingdomId
      )
    ) {
      return {
        edgeId,
        fromKingdomId,
        toKingdomId,
        crossingNodeId:
          edge.borderCrossing.crossingNodeId,
      };
    }
  }

  return undefined;
}
