import {
  validatePlayerCommandAccess,
} from "@/lib/session/access";

import {
  playerControlsArmy,
} from "@/lib/session/players";

import {
  splitArmy,
  mergeArmies,
} from "@/lib/military/army-organization";

import {
  assignArmyCommander,
  clearArmySupport,
  supportArmyFromAdjacentPosition,
} from "@/lib/military/army-management";

import {
  fortify,
} from "@/lib/military/fortification";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  developSettlement,
} from "@/lib/economy/development";

import {
  raidSettlement,
} from "@/lib/military/raid";

import {
  captureSettlement,
} from "@/lib/military/conquest";

import {
  getSettlementControllerId,
} from "@/lib/military/occupation";

import {
  findActiveWarBetweenRealms,
} from "@/lib/military/war";

import type {
  SettlementDevelopmentFocus,
} from "@/types/settlement";

export function splitPlayerArmy(
  sessionId:
    string,
  playerId:
    string,
  armyId:
    string,
  unitIds:
    string[]
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
        "NOT_AUTHORIZED" as const,
    };
  }

  return splitArmy(
    armyId,
    unitIds
  );
}

export function mergePlayerArmies(
  sessionId:
    string,
  playerId:
    string,
  targetArmyId:
    string,
  sourceArmyId:
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
      targetArmyId
    ) ||
    !playerControlsArmy(
      playerId,
      sourceArmyId
    )
  ) {
    return {
      ok:
        false as const,
      error:
        "NOT_AUTHORIZED" as const,
    };
  }

  return mergeArmies(
    targetArmyId,
    sourceArmyId
  );
}

export function supportPlayerArmy(
  sessionId:
    string,
  playerId:
    string,
  supporterArmyId:
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

  if (
    !playerControlsArmy(
      playerId,
      supporterArmyId
    ) ||
    !playerControlsArmy(
      playerId,
      targetArmyId
    )
  ) {
    return {
      ok:
        false as const,
      error:
        "NOT_AUTHORIZED" as const,
    };
  }

  return supportArmyFromAdjacentPosition(
    supporterArmyId,
    targetArmyId
  );
}

export function stopPlayerArmySupport(
  sessionId:
    string,
  playerId:
    string,
  armyId:
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
        "NOT_AUTHORIZED" as const,
    };
  }

  return clearArmySupport(
    armyId
  );
}

export function assignPlayerArmyCommander(
  sessionId:
    string,
  playerId:
    string,
  armyId:
    string,
  characterId:
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
        "NOT_AUTHORIZED" as const,
    };
  }

  /*
   * Direct assignment is deliberately limited to the player's own ruler.
   * Independent lords remain political actors and must still be commanded
   * through issue_character_order rather than being silently puppeted.
   */
  if (
    characterId !==
    access.player
      .characterId
  ) {
    return {
      ok:
        false as const,
      error:
        "COMMANDER_MUST_BE_PLAYER_CHARACTER" as const,
    };
  }

  return assignArmyCommander(
    armyId,
    characterId
  );
}

export function fortifyPlayerSettlement(
  sessionId:
    string,
  playerId:
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

  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (
    !settlement ||
    settlement.kingdomId !==
      access.player
        .kingdomId
  ) {
    return {
      ok:
        false as const,
      error:
        "NOT_AUTHORIZED" as const,
    };
  }

  return fortify({
    settlementId,
    actorId:
      access.player
        .characterId,
  });
}


export function developPlayerSettlement(
  sessionId:
    string,
  playerId:
    string,
  settlementId:
    string,
  focus:
    SettlementDevelopmentFocus
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

  const settlement =
    world.settlements[
      settlementId
    ];

  if (
    !settlement ||
    getSettlementControllerId(
      settlement
    ) !==
      access.player
        .kingdomId
  ) {
    return {
      ok:
        false as const,

      error:
        "NOT_AUTHORIZED" as const,
    };
  }

  return developSettlement({
    settlementId,
    kingdomId:
      access.player
        .kingdomId,
    focus,
  });
}

export function raidPlayerSettlement(
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
        "NOT_AUTHORIZED" as const,
    };
  }

  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  const settlement =
    world.settlements[
      settlementId
    ];

  if (
    !army ||
    !settlement
  ) {
    return {
      ok:
        false as const,

      error:
        "TARGET_NOT_FOUND" as const,
    };
  }

  const defender =
    getSettlementControllerId(
      settlement
    );

  if (
    !findActiveWarBetweenRealms(
      army.ownerId,
      defender
    )
  ) {
    return {
      ok:
        false as const,

      error:
        "NO_ACTIVE_WAR" as const,
    };
  }

  return raidSettlement(
    armyId,
    settlementId
  );
}

export function capturePlayerSettlement(
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
        "NOT_AUTHORIZED" as const,
    };
  }

  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  const settlement =
    world.settlements[
      settlementId
    ];

  if (
    !army ||
    !settlement
  ) {
    return {
      ok:
        false as const,

      error:
        "TARGET_NOT_FOUND" as const,
    };
  }

  const defender =
    getSettlementControllerId(
      settlement
    );

  if (
    !findActiveWarBetweenRealms(
      army.ownerId,
      defender
    )
  ) {
    return {
      ok:
        false as const,

      error:
        "NO_ACTIVE_WAR" as const,
    };
  }

  const level =
    settlement
      .fortificationLevel ??
    0;

  const integrity =
    level >
      0
      ? (
          settlement
            .fortificationIntegrity ??
          100
        )
      : 0;

  if (
    level >
      0 &&
    integrity >
      0
  ) {
    return {
      ok:
        false as const,

      error:
        "FORTIFICATION_STILL_STANDS" as const,
    };
  }

  return captureSettlement(
    armyId,
    settlementId
  );
}
