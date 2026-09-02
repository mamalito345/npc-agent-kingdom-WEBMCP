import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  EVENT_DEFINITIONS,
} from "@/data/events/catalog";

import type {
  DirectorEventCategory,
  EventCandidate,
  EventDefinition,
  EventOpportunity,
} from "@/types/events";

function activePlayerForKingdom(
  kingdomId: string
) {
  return Object.values(
    getRuntimeWorldState().session.players
  ).find(
    (player) =>
      player.active &&
      player.kingdomId === kingdomId
  );
}

function candidate(
  definition: EventDefinition,
  suffix: string,
  bindings: Record<string, string>,
  reason: string,
  kingdomId?: string
): EventCandidate {
  return {
    candidateId: `${definition.id}:${suffix}`,
    definitionId: definition.id,
    category: definition.category,
    name: definition.name,
    severity: definition.severity,
    resolutionMode: definition.resolutionMode,
    bindings,
    kingdomId,
    reason,
  };
}

function definitions(category: DirectorEventCategory): EventDefinition[] {
  return EVENT_DEFINITIONS.filter((definition) => definition.category === category);
}

function isDefinitionContextuallyEligible(
  definition: EventDefinition,
  bindings: Record<string, string>
): boolean {
  const world = getRuntimeWorldState();

  for (const requirement of definition.requirements) {
    switch (requirement) {
      case "army_traveling": {
        const armyId = bindings.armyId;
        if (
          !armyId ||
          !world.armies[armyId] ||
          !world.simulation.activeMovements[armyId]
        ) {
          return false;
        }
        break;
      }

      case "player_owned_army": {
        const army = world.armies[bindings.armyId ?? ""];
        if (!army || !activePlayerForKingdom(army.ownerId)) {
          return false;
        }
        break;
      }

      case "army_in_active_war": {
        const army = world.armies[bindings.armyId ?? ""];
        const war = world.wars[bindings.warId ?? ""];
        if (!army || !war || war.status !== "active") {
          return false;
        }

        const involved =
          war.attackerRealmIds.includes(army.ownerId) ||
          war.defenderRealmIds.includes(army.ownerId);

        if (!involved) {
          return false;
        }
        break;
      }

      case "active_battle": {
        const battle = world.battles[bindings.battleId ?? ""];
        if (!battle || battle.status !== "active") {
          return false;
        }
        break;
      }

      case "active_siege": {
        const siege = world.sieges[bindings.siegeId ?? ""];
        if (!siege || siege.status !== "active") {
          return false;
        }
        break;
      }

      case "major_lord": {
        if (!world.session.lords.profiles[bindings.lordId ?? ""]) {
          return false;
        }
        break;
      }

      case "low_loyalty_lord": {
        const lord = world.session.lords.profiles[bindings.lordId ?? ""];
        if (!lord || lord.loyalty > 40) {
          return false;
        }
        break;
      }

      case "player_kingdom": {
        if (!bindings.kingdomId || !activePlayerForKingdom(bindings.kingdomId)) {
          return false;
        }
        break;
      }

      case "kingdom": {
        if (!world.kingdoms[bindings.kingdomId ?? ""]) {
          return false;
        }
        break;
      }

      case "active_or_proposed_agreement": {
        const agreement = world.session.politics.agreements[bindings.agreementId ?? ""];
        if (
          !agreement ||
          !["PROPOSED", "ACTIVE"].includes(agreement.status)
        ) {
          return false;
        }
        break;
      }

      case "war_pressure": {
        const war = world.wars[bindings.warId ?? ""];
        if (!war || war.status !== "active") {
          return false;
        }
        break;
      }

      case "active_alliance": {
        const agreement = world.session.politics.agreements[bindings.agreementId ?? ""];
        if (
          !agreement ||
          agreement.status !== "ACTIVE" ||
          agreement.type !== "ALLIANCE"
        ) {
          return false;
        }
        break;
      }
    }
  }

  return true;
}

function pushOpportunity(
  list: EventOpportunity[],
  category: DirectorEventCategory,
  reason: string,
  suffix: string,
  bindings: Record<string, string>,
  kingdomId?: string
): void {
  const candidates = definitions(category)
    .filter((definition) => isDefinitionContextuallyEligible(definition, bindings))
    .map((definition) =>
      candidate(definition, suffix, bindings, reason, kingdomId)
    );

  if (candidates.length === 0) {
    return;
  }

  list.push({
    id: `event-opportunity:${category.toLowerCase()}:${suffix}`,
    category,
    reason,
    kingdomId,
    candidates,
    createdAt: getRuntimeWorldState().simulation.worldTimeMinutes,
  });
}

export function buildEventOpportunities(): EventOpportunity[] {
  const world = getRuntimeWorldState();
  const opportunities: EventOpportunity[] = [];

  for (const army of Object.values(world.armies)) {
    if (world.simulation.activeMovements[army.id]) {
      const player = activePlayerForKingdom(army.ownerId);
      pushOpportunity(
        opportunities,
        "TRAVEL",
        `${army.id} is physically traveling.`,
        army.id,
        {
          armyId: army.id,
          kingdomId: army.ownerId,
          ...(player ? { playerId: player.id } : {}),
        },
        army.ownerId
      );
    }

    const war = Object.values(world.wars).find(
      (candidateWar) =>
        candidateWar.status === "active" &&
        (
          candidateWar.attackerRealmIds.includes(army.ownerId) ||
          candidateWar.defenderRealmIds.includes(army.ownerId)
        )
    );

    if (war) {
      const player = activePlayerForKingdom(army.ownerId);
      pushOpportunity(
        opportunities,
        "CAMPAIGN",
        `${army.id} is operating during active war ${war.id}.`,
        `${army.id}:${war.id}`,
        {
          armyId: army.id,
          warId: war.id,
          kingdomId: army.ownerId,
          ...(player ? { playerId: player.id } : {}),
        },
        army.ownerId
      );
    }
  }

  for (const battle of Object.values(world.battles)) {
    if (battle.status !== "active") {
      continue;
    }

    const attackerArmyId = battle.attackerArmyIds[0] ?? "";
    const attacker = world.armies[attackerArmyId];
    pushOpportunity(
      opportunities,
      "BATTLE",
      `Battle ${battle.id} is active in phase ${battle.currentPhase}.`,
      battle.id,
      {
        battleId: battle.id,
        armyId: attackerArmyId,
        kingdomId: attacker?.ownerId ?? "",
      },
      attacker?.ownerId
    );
  }

  for (const siege of Object.values(world.sieges)) {
    if (siege.status !== "active") {
      continue;
    }

    const armyId = siege.attackerArmyIds[0] ?? "";
    const army = world.armies[armyId];
    const player = army ? activePlayerForKingdom(army.ownerId) : undefined;

    pushOpportunity(
      opportunities,
      "SIEGE",
      `Siege ${siege.id} is active in phase ${siege.currentPhase}.`,
      siege.id,
      {
        siegeId: siege.id,
        armyId,
        settlementId: siege.settlementId,
        kingdomId: army?.ownerId ?? "",
        ...(player ? { playerId: player.id } : {}),
      },
      army?.ownerId
    );
  }

  for (const lord of Object.values(world.session.lords.profiles)) {
    const rulerId = world.kingdoms[lord.kingdomId]?.rulerId ?? "";
    const player = activePlayerForKingdom(lord.kingdomId);

    pushOpportunity(
      opportunities,
      "POLITICAL",
      `${lord.title} has an active political position in ${lord.kingdomId}.`,
      lord.characterId,
      {
        lordId: lord.characterId,
        rulerId,
        kingdomId: lord.kingdomId,
        ...(player ? { playerId: player.id } : {}),
      },
      lord.kingdomId
    );
  }

  for (const kingdom of Object.values(world.kingdoms)) {
    pushOpportunity(
      opportunities,
      "ECONOMIC",
      `${kingdom.id} reached a daily local-economic event check.`,
      kingdom.id,
      {
        kingdomId: kingdom.id,
      },
      kingdom.id
    );
  }

  for (const agreement of Object.values(world.session.politics.agreements)) {
    if (!["PROPOSED", "ACTIVE"].includes(agreement.status)) {
      continue;
    }

    const targetPlayer = world.session.players[agreement.proposedToPlayerId];
    const sourcePlayer = world.session.players[agreement.proposedByPlayerId];

    pushOpportunity(
      opportunities,
      "DIPLOMATIC",
      `Agreement ${agreement.id} is politically active.`,
      agreement.id,
      {
        agreementId: agreement.id,
        kingdomId: targetPlayer?.kingdomId ?? agreement.partyKingdomIds[1] ?? "",
        playerId: targetPlayer?.id ?? "",
        sourceCharacterId: sourcePlayer?.characterId ?? "",
        targetCharacterId: targetPlayer?.characterId ?? "",
      },
      targetPlayer?.kingdomId
    );
  }

  for (const war of Object.values(world.wars)) {
    if (war.status !== "active") {
      continue;
    }

    for (const kingdomId of [...war.attackerRealmIds, ...war.defenderRealmIds]) {
      const player = activePlayerForKingdom(kingdomId);
      if (!player) {
        continue;
      }

      pushOpportunity(
        opportunities,
        "DIPLOMATIC",
        `Active war ${war.id} creates diplomatic pressure.`,
        `${war.id}:${kingdomId}`,
        {
          warId: war.id,
          kingdomId,
          playerId: player.id,
          sourceCharacterId: player.characterId,
          targetCharacterId: player.characterId,
        },
        kingdomId
      );
    }
  }

  return opportunities;
}

export function revalidateEventCandidate(
  candidate: EventCandidate
): { ok: true } | { ok: false; error: string } {
  const definition = EVENT_DEFINITIONS.find(
    (item) => item.id === candidate.definitionId
  );

  if (!definition) {
    return {
      ok: false,
      error: "EVENT_DEFINITION_NOT_FOUND",
    };
  }

  if (definition.category !== candidate.category) {
    return {
      ok: false,
      error: "EVENT_CATEGORY_MISMATCH",
    };
  }

  if (!isDefinitionContextuallyEligible(definition, candidate.bindings)) {
    return {
      ok: false,
      error: "EVENT_CONTEXT_NO_LONGER_VALID",
    };
  }

  return { ok: true };
}
