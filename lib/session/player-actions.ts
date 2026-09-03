import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  findRoute,
} from "@/lib/map/paths";

import {
  getDeliveredPlayerKnowledge,
} from "@/lib/session/knowledge";

import {
  validatePlayerAccess,
  validatePlayerCommandAccess,
} from "@/lib/session/access";

import {
  issueStrategicOrder,
  cancelStrategicOrder,
} from "@/lib/session/orders";

import {
  passCommandWindow,
} from "@/lib/session/command-cycle";

import {
  playerControlsArmy,
} from "@/lib/session/players";

import {
  setBattleTactic,
} from "@/lib/military/battle-tactic-orders";

import {
  submitBattleOrder,
} from "@/lib/military/battle-orders";

import {
  recruitUnits,
} from "@/lib/military/recruitment";

import {
  startSiege,
} from "@/lib/military/siege";

import {
  spawnCourier,
} from "@/lib/world/couriers";

import {
  declareWar,
} from "@/lib/politics/war";

import type {
  WarReason,
} from "@/lib/politics/war";

import type {
  BattleOrderType,
  BattleTactic,
  UnitType,
} from "@/types/military";

export function issuePlayerArmyMove(
  sessionId: string,
  playerId: string,
  armyId: string,
  destinationNodeId: string
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  return issueStrategicOrder({
    playerId,
    type: "move_army",
    payload: {
      armyId,
      destinationNodeId,
    },
  });
}

function resolveKnowledgeSafeInterceptNode(
  playerId: string,
  armyId: string,
  targetArmyId: string
):
  | {
      ok: true;
      interceptNodeId: string;
      knowledgeFactId: string;
    }
  | {
      ok: false;
      error:
        | "TARGET_NOT_KNOWN"
        | "TARGET_LOCATION_UNKNOWN"
        | "INTERCEPTOR_NOT_AT_NODE"
        | "NO_ROUTE_TO_KNOWN_TARGET";
    } {
  const world = getRuntimeWorldState();
  const fact = getDeliveredPlayerKnowledge(playerId)
    .filter(
      (candidate) =>
        candidate.kind === "army" &&
        candidate.subjectId === targetArmyId
    )
    .sort(
      (a, b) =>
        b.observedAt - a.observedAt ||
        b.deliveredAt - a.deliveredAt ||
        b.id.localeCompare(a.id)
    )[0];

  if (!fact) {
    return {
      ok: false,
      error: "TARGET_NOT_KNOWN",
    };
  }

  const interceptorPosition = world.simulation.entityPositions[armyId];

  if (!interceptorPosition || interceptorPosition.kind !== "node") {
    return {
      ok: false,
      error: "INTERCEPTOR_NOT_AT_NODE",
    };
  }

  const nodeId =
    typeof fact.data.nodeId === "string"
      ? fact.data.nodeId
      : undefined;

  if (nodeId) {
    const route = findRoute(interceptorPosition.nodeId, nodeId);

    if (!route) {
      return {
        ok: false,
        error: "NO_ROUTE_TO_KNOWN_TARGET",
      };
    }

    return {
      ok: true,
      interceptNodeId: nodeId,
      knowledgeFactId: fact.id,
    };
  }

  const roadFrom =
    typeof fact.data.roadFrom === "string"
      ? fact.data.roadFrom
      : undefined;
  const roadTo =
    typeof fact.data.roadTo === "string"
      ? fact.data.roadTo
      : undefined;

  if (!roadFrom || !roadTo) {
    return {
      ok: false,
      error: "TARGET_LOCATION_UNKNOWN",
    };
  }

  const candidates = [roadFrom, roadTo]
    .map((candidateNodeId) => ({
      candidateNodeId,
      route: findRoute(interceptorPosition.nodeId, candidateNodeId),
    }))
    .filter(
      (
        candidate
      ): candidate is {
        candidateNodeId: string;
        route: NonNullable<ReturnType<typeof findRoute>>;
      } => Boolean(candidate.route)
    )
    .sort(
      (a, b) =>
        a.route.effectiveDistanceKm - b.route.effectiveDistanceKm ||
        a.candidateNodeId.localeCompare(b.candidateNodeId)
    );

  const best = candidates[0];

  if (!best) {
    return {
      ok: false,
      error: "NO_ROUTE_TO_KNOWN_TARGET",
    };
  }

  return {
    ok: true,
    interceptNodeId: best.candidateNodeId,
    knowledgeFactId: fact.id,
  };
}

export function issuePlayerInterception(
  sessionId: string,
  playerId: string,
  armyId: string,
  targetArmyId: string
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  if (!playerControlsArmy(playerId, armyId)) {
    return {
      ok: false as const,
      error: "NOT_AUTHORIZED",
    };
  }

  const knownTarget = resolveKnowledgeSafeInterceptNode(
    playerId,
    armyId,
    targetArmyId
  );

  if (!knownTarget.ok) {
    return knownTarget;
  }

  /*
   * IMPORTANT:
   * The chosen destination is frozen from player knowledge at order time.
   * Execution must not inspect the target's hidden canonical future route.
   * Exact canonical movement is used only by the encounter engine to decide
   * whether the two real armies actually meet.
   */
  return issueStrategicOrder({
    playerId,
    type: "intercept_army",
    payload: {
      armyId,
      targetArmyId,
      interceptNodeId: knownTarget.interceptNodeId,
      knowledgeFactId: knownTarget.knowledgeFactId,
    },
  });
}

export function cancelPlayerOrder(
  sessionId: string,
  playerId: string,
  orderId: string
) {
  const access = validatePlayerAccess(sessionId, playerId);
  if (!access.ok) return access;

  return cancelStrategicOrder(playerId, orderId);
}

export function changeQueuedPlayerArmyOrder(
  sessionId: string,
  playerId: string,
  orderId: string,
  destinationNodeId: string
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  const existing = getRuntimeWorldState().session.orders[orderId];

  if (!existing) {
    return {
      ok: false as const,
      error: "ORDER_NOT_FOUND",
    };
  }

  if (existing.playerId !== playerId) {
    return {
      ok: false as const,
      error: "NOT_AUTHORIZED",
    };
  }

  if (existing.status !== "queued") {
    return {
      ok: false as const,
      error: "ONLY_QUEUED_ORDER_CAN_BE_CHANGED",
    };
  }

  if (
    existing.type !== "move_army" ||
    !("armyId" in existing.payload)
  ) {
    return {
      ok: false as const,
      error: "ORDER_TYPE_NOT_CHANGEABLE",
    };
  }

  const armyId = existing.payload.armyId;
  const cancelled = cancelStrategicOrder(playerId, orderId);
  if (!cancelled.ok) return cancelled;

  return issueStrategicOrder({
    playerId,
    type: "move_army",
    payload: {
      armyId,
      destinationNodeId,
    },
  });
}

export function setPlayerBattleTactic(
  sessionId: string,
  playerId: string,
  battleId: string,
  armyId: string,
  tactic: BattleTactic
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  if (!playerControlsArmy(playerId, armyId)) {
    return {
      ok: false as const,
      error: "NOT_AUTHORIZED",
    };
  }

  return setBattleTactic({
    battleId,
    armyId,
    tactic,
  });
}

export function submitPlayerBattleCrisisOrder(
  sessionId: string,
  playerId: string,
  battleId: string,
  armyId: string,
  order: BattleOrderType
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  if (!playerControlsArmy(playerId, armyId)) {
    return {
      ok: false as const,
      error: "NOT_AUTHORIZED",
    };
  }

  return submitBattleOrder({
    battleId,
    armyId,
    actorType: "player",
    actorId: access.player.characterId,
    order,
  });
}

export function recruitPlayerUnits(
  sessionId: string,
  playerId: string,
  settlementId: string,
  unitType: UnitType,
  blocks: number
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  return recruitUnits({
    settlementId,
    unitType,
    blocks,
    actorId: access.player.characterId,
  });
}

export function startPlayerSiege(
  sessionId: string,
  playerId: string,
  armyId: string,
  settlementId: string
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  if (!playerControlsArmy(playerId, armyId)) {
    return {
      ok: false as const,
      error: "NOT_AUTHORIZED",
    };
  }

  return startSiege({
    armyId,
    settlementId,
  });
}

function dispatchPlayerMessage(
  sessionId: string,
  playerId: string,
  recipientCharacterId: string,
  content: string
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  const world = getRuntimeWorldState();
  const senderCharacterId = access.player.characterId;
  const senderPosition = world.simulation.entityPositions[senderCharacterId];

  if (!senderPosition || senderPosition.kind !== "node") {
    return {
      ok: false as const,
      error: "SENDER_NOT_AT_NODE",
    };
  }

  const recipient = world.characters[recipientCharacterId];
  if (!recipient) {
    return {
      ok: false as const,
      error: "RECIPIENT_NOT_FOUND",
    };
  }

  const recipientPosition = world.simulation.entityPositions[recipientCharacterId];

  if (!recipientPosition || recipientPosition.kind !== "node") {
    return {
      ok: false as const,
      error: "RECIPIENT_NOT_SETTLED",
    };
  }

  return spawnCourier(
    senderCharacterId,
    recipientCharacterId,
    content,
    senderPosition.nodeId,
    recipientPosition.nodeId
  );
}

export function sendPlayerMessage(
  sessionId: string,
  playerId: string,
  recipientCharacterId: string,
  content: string
) {
  return dispatchPlayerMessage(
    sessionId,
    playerId,
    recipientCharacterId,
    content
  );
}

export function sendPlayerEnvoy(
  sessionId: string,
  playerId: string,
  recipientCharacterId: string,
  proposal: string
) {
  return dispatchPlayerMessage(
    sessionId,
    playerId,
    recipientCharacterId,
    `[ENVOY] ${proposal}`
  );
}

export function declarePlayerWar(
  sessionId: string,
  playerId: string,
  targetKingdomId: string,
  reason: WarReason = "AGGRESSION"
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  return declareWar(
    access.player.kingdomId,
    targetKingdomId,
    reason
  );
}

export function passPlayerCommandWindow(
  sessionId: string,
  playerId: string
) {
  const access = validatePlayerCommandAccess(sessionId, playerId);
  if (!access.ok) return access;

  return passCommandWindow(playerId);
}
