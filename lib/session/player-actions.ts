import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

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

import type {
  BattleOrderType,
  BattleTactic,
  UnitType,
} from "@/types/military";

export function issuePlayerArmyMove(
  sessionId:
    string,
  playerId:
    string,
  armyId:
    string,
  destinationNodeId:
    string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  return issueStrategicOrder({
    playerId,

    type:
      "move_army",

    payload: {
      armyId,

      destinationNodeId,
    },
  });
}

export function issuePlayerInterception(
  sessionId:
    string,
  playerId:
    string,
  armyId:
    string,
  targetArmyId:
    string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  return issueStrategicOrder({
    playerId,

    type:
      "intercept_army",

    payload: {
      armyId,

      targetArmyId,
    },
  });
}

export function cancelPlayerOrder(
  sessionId:
    string,
  playerId:
    string,
  orderId:
    string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  return cancelStrategicOrder(
    playerId,
    orderId
  );
}

export function changeQueuedPlayerArmyOrder(
  sessionId:
    string,
  playerId:
    string,
  orderId:
    string,
  destinationNodeId:
    string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const existing =
    world.session
      .orders[
        orderId
      ];

  if (!existing) {
    return {
      ok:
        false as const,

      error:
        "ORDER_NOT_FOUND",
    };
  }

  if (
    existing.playerId !==
    playerId
  ) {
    return {
      ok:
        false as const,

      error:
        "NOT_AUTHORIZED",
    };
  }

  /*
   * We deliberately do not fake a
   * mid-edge reroute here.
   *
   * B2 can halt an executing army at its
   * exact road position, but the movement
   * model does not yet create a new route
   * originating from fractional edge progress.
   */
  if (
    existing.status !==
    "queued"
  ) {
    return {
      ok:
        false as const,

      error:
        "ONLY_QUEUED_ORDER_CAN_BE_CHANGED",
    };
  }

  if (
    existing.type !==
      "move_army" ||
    !(
      "armyId" in
      existing.payload
    )
  ) {
    return {
      ok:
        false as const,

      error:
        "ORDER_TYPE_NOT_CHANGEABLE",
    };
  }

  const armyId =
    existing
      .payload
      .armyId;

  const cancelled =
    cancelStrategicOrder(
      playerId,
      orderId
    );

  if (
    cancelled.ok ===
    false
  ) {
    return cancelled;
  }

  return issueStrategicOrder({
    playerId,

    type:
      "move_army",

    payload: {
      armyId,

      destinationNodeId,
    },
  });
}

export function setPlayerBattleTactic(
  sessionId:
    string,
  playerId:
    string,
  battleId:
    string,
  armyId:
    string,
  tactic:
    BattleTactic
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  if (
    !playerControlsArmy(
      playerId,
      armyId
    )
  ) {
    return {
      ok:
        false as const,

      error:
        "NOT_AUTHORIZED",
    };
  }

  return setBattleTactic({
    battleId,

    armyId,

    tactic,
  });
}

export function submitPlayerBattleCrisisOrder(
  sessionId:
    string,
  playerId:
    string,
  battleId:
    string,
  armyId:
    string,
  order:
    BattleOrderType
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  if (
    !playerControlsArmy(
      playerId,
      armyId
    )
  ) {
    return {
      ok:
        false as const,

      error:
        "NOT_AUTHORIZED",
    };
  }

  return submitBattleOrder({
    battleId,

    armyId,

    actorType:
      "player",

    actorId:
      access
        .player
        .characterId,

    order,
  });
}

export function recruitPlayerUnits(
  sessionId:
    string,
  playerId:
    string,
  settlementId:
    string,
  unitType:
    UnitType,
  blocks:
    number
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  return recruitUnits({
    settlementId,

    unitType,

    blocks,

    actorId:
      access
        .player
        .characterId,
  });
}

export function startPlayerSiege(
  sessionId:
    string,
  playerId:
    string,
  armyId:
    string,
  settlementId:
    string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  if (
    !playerControlsArmy(
      playerId,
      armyId
    )
  ) {
    return {
      ok:
        false as const,

      error:
        "NOT_AUTHORIZED",
    };
  }

  return startSiege({
    armyId,

    settlementId,
  });
}

function dispatchPlayerMessage(
  sessionId:
    string,
  playerId:
    string,
  recipientCharacterId:
    string,
  content:
    string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const senderCharacterId =
    access
      .player
      .characterId;

  const senderPosition =
    world.simulation
      .entityPositions[
        senderCharacterId
      ];

  if (
    !senderPosition ||
    senderPosition.kind !==
      "node"
  ) {
    return {
      ok:
        false as const,

      error:
        "SENDER_NOT_AT_NODE",
    };
  }

  const recipient =
    world.characters[
      recipientCharacterId
    ];

  if (!recipient) {
    return {
      ok:
        false as const,

      error:
        "RECIPIENT_NOT_FOUND",
    };
  }

  const recipientPosition =
    world.simulation
      .entityPositions[
        recipientCharacterId
      ];

  if (
    !recipientPosition ||
    recipientPosition.kind !==
      "node"
  ) {
    return {
      ok:
        false as const,

      error:
        "RECIPIENT_NOT_SETTLED",
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
  sessionId:
    string,
  playerId:
    string,
  recipientCharacterId:
    string,
  content:
    string
) {
  return dispatchPlayerMessage(
    sessionId,
    playerId,
    recipientCharacterId,
    content
  );
}

export function sendPlayerEnvoy(
  sessionId:
    string,
  playerId:
    string,
  recipientCharacterId:
    string,
  proposal:
    string
) {
  /*
   * Envoys use the same physical courier
   * layer for now.
   *
   * D will interpret diplomatic proposals
   * through NPC / World Director logic.
   */
  return dispatchPlayerMessage(
    sessionId,
    playerId,
    recipientCharacterId,
    `[ENVOY] ${proposal}`
  );
}

export function passPlayerCommandWindow(
  sessionId:
    string,
  playerId:
    string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  return passCommandWindow(
    playerId
  );
}