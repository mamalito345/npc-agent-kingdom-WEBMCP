import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  addPlayerKnowledge,
} from "@/lib/session/knowledge";

import {
  adjustRelationship,
} from "@/lib/politics/relationships";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import {
  getGmLordOrderModelAdapter,
} from "@/lib/lords/model";

import {
  EVENT_DEFINITION_BY_ID,
} from "@/data/events/catalog";

import {
  deterministicWeightedIndex,
} from "@/lib/events/rng";

import {
  revalidateEventCandidate,
} from "@/lib/events/opportunities";

import type {
  EventCandidate,
  EventEffect,
  EventInstance,
  EventOutcomeDefinition,
} from "@/types/events";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyEffect(
  effect: EventEffect,
  bindings: Record<string, string>
): string {
  const world = getRuntimeWorldState();

  switch (effect.type) {
    case "ARMY_SUPPLY_DELTA": {
      const armyId = bindings[effect.targetBinding];
      const army = world.armies[armyId ?? ""];

      if (!army) {
        throw new Error("EVENT_ARMY_NOT_FOUND");
      }

      const before = army.supply.foodSupply;
      const after = Math.max(0, before + effect.amount);

      updateRuntimeWorldState((current) => ({
        ...current,
        armies: {
          ...current.armies,
          [armyId]: {
            ...current.armies[armyId],
            supply: {
              ...current.armies[armyId].supply,
              foodSupply: after,
            },
          },
        },
      }));

      return `${armyId} supply ${before} -> ${after}`;
    }

    case "ARMY_MORALE_SET": {
      const armyId = bindings[effect.targetBinding];
      const army = world.armies[armyId ?? ""];

      if (!army) {
        throw new Error("EVENT_ARMY_NOT_FOUND");
      }

      const before = army.morale;

      updateRuntimeWorldState((current) => ({
        ...current,
        armies: {
          ...current.armies,
          [armyId]: {
            ...current.armies[armyId],
            morale: effect.value,
          },
        },
      }));

      return `${armyId} morale ${before} -> ${effect.value}`;
    }

    case "KINGDOM_TREASURY_DELTA": {
      const kingdomId = bindings[effect.targetBinding];
      const kingdom = world.kingdoms[kingdomId ?? ""];

      if (!kingdom) {
        throw new Error("EVENT_KINGDOM_NOT_FOUND");
      }

      const before = kingdom.treasury;
      const after = Math.max(0, before + effect.amount);

      updateRuntimeWorldState((current) => ({
        ...current,
        kingdoms: {
          ...current.kingdoms,
          [kingdomId]: {
            ...current.kingdoms[kingdomId],
            treasury: after,
          },
        },
      }));

      return `${kingdomId} treasury ${before} -> ${after}`;
    }

    case "KINGDOM_FOOD_DELTA": {
      const kingdomId = bindings[effect.targetBinding];
      const kingdom = world.kingdoms[kingdomId ?? ""];

      if (!kingdom) {
        throw new Error("EVENT_KINGDOM_NOT_FOUND");
      }

      const before = kingdom.food;
      const after = clamp(before + effect.amount, 0, 100);

      updateRuntimeWorldState((current) => ({
        ...current,
        kingdoms: {
          ...current.kingdoms,
          [kingdomId]: {
            ...current.kingdoms[kingdomId],
            food: after,
          },
        },
      }));

      return `${kingdomId} food ${before} -> ${after}`;
    }

    case "KINGDOM_STABILITY_DELTA": {
      const kingdomId = bindings[effect.targetBinding];
      const kingdom = world.kingdoms[kingdomId ?? ""];

      if (!kingdom) {
        throw new Error("EVENT_KINGDOM_NOT_FOUND");
      }

      const before = kingdom.stability;
      const after = clamp(before + effect.amount, 0, 100);

      updateRuntimeWorldState((current) => ({
        ...current,
        kingdoms: {
          ...current.kingdoms,
          [kingdomId]: {
            ...current.kingdoms[kingdomId],
            stability: after,
          },
        },
      }));

      return `${kingdomId} stability ${before} -> ${after}`;
    }

    case "LORD_LOYALTY_DELTA": {
      const lordId = bindings[effect.targetBinding];
      const lord = world.session.lords.profiles[lordId ?? ""];

      if (!lord) {
        throw new Error("EVENT_LORD_NOT_FOUND");
      }

      const before = lord.loyalty;
      const after = clamp(before + effect.amount, 0, 100);

      updateRuntimeWorldState((current) => ({
        ...current,
        session: {
          ...current.session,
          lords: {
            ...current.session.lords,
            profiles: {
              ...current.session.lords.profiles,
              [lordId]: {
                ...current.session.lords.profiles[lordId],
                loyalty: after,
              },
            },
          },
        },
      }));

      return `${lordId} loyalty ${before} -> ${after}`;
    }

    case "RELATIONSHIP_DELTA": {
      const fromId = bindings[effect.fromBinding];
      const toId = bindings[effect.toBinding];

      if (!fromId || !toId) {
        throw new Error("EVENT_RELATIONSHIP_BINDING_MISSING");
      }

      const result = adjustRelationship(fromId, toId, effect.amount);
      return `${fromId}->${toId} relationship now ${result.value}`;
    }

    case "BATTLE_MOMENTUM_DELTA": {
      const battleId = bindings[effect.targetBinding];
      const battle = world.battles[battleId ?? ""];

      if (!battle || battle.status !== "active") {
        throw new Error("EVENT_BATTLE_NOT_ACTIVE");
      }

      const before = battle.frontMomentum;
      const after = clamp(before + effect.amount, -100, 100);

      updateRuntimeWorldState((current) => ({
        ...current,
        battles: {
          ...current.battles,
          [battleId]: {
            ...current.battles[battleId],
            frontMomentum: after,
          },
        },
      }));

      return `${battleId} momentum ${before} -> ${after}`;
    }

    case "BATTLE_MORALE_PRESSURE_DELTA": {
      const battleId = bindings[effect.targetBinding];
      const battle = world.battles[battleId ?? ""];

      if (!battle || battle.status !== "active") {
        throw new Error("EVENT_BATTLE_NOT_ACTIVE");
      }

      const field =
        effect.side === "attacker"
          ? "attackerMoralePressure"
          : "defenderMoralePressure";

      const before = battle[field];
      const after = clamp(before + effect.amount, 0, 100);

      updateRuntimeWorldState((current) => ({
        ...current,
        battles: {
          ...current.battles,
          [battleId]: {
            ...current.battles[battleId],
            [field]: after,
          },
        },
      }));

      return `${battleId} ${field} ${before} -> ${after}`;
    }

    case "SIEGE_HISTORY_NOTE": {
      const siegeId = bindings[effect.targetBinding];
      const siege = world.sieges[siegeId ?? ""];

      if (!siege || siege.status !== "active") {
        throw new Error("EVENT_SIEGE_NOT_ACTIVE");
      }

      const sequence = allocateSimulationSequence();

      updateRuntimeWorldState((current) => ({
        ...current,
        sieges: {
          ...current.sieges,
          [siegeId]: {
            ...current.sieges[siegeId],
            history: [
              ...current.sieges[siegeId].history,
              {
                id: `siege-history-${sequence.toString().padStart(6, "0")}`,
                timestamp: current.simulation.worldTimeMinutes,
                type: "phase_changed",
                summary: effect.summary,
              },
            ],
          },
        },
      }));

      return effect.summary;
    }

    case "PLAYER_KNOWLEDGE": {
      const playerId = bindings[effect.playerBinding];
      const subjectId = bindings[effect.subjectBinding];

      if (!playerId || !subjectId) {
        return "Knowledge effect skipped because no entitled player binding exists.";
      }

      const fact = addPlayerKnowledge({
        playerId,
        subjectId,
        kind: effect.kind,
        observedAt: world.simulation.worldTimeMinutes,
        deliveredAt: world.simulation.worldTimeMinutes,
        source: "direct_observation",
        confidence: effect.confidence,
        summary: effect.summary,
        data: {
          source: "director_event",
        },
      });

      if (!fact) {
        throw new Error("EVENT_PLAYER_KNOWLEDGE_FAILED");
      }

      return `Knowledge ${fact.id} delivered only to ${playerId}`;
    }

    case "NO_OP":
      return effect.summary;
  }
}

function pickOutcome(
  instance: EventInstance,
  outcomes: EventOutcomeDefinition[]
): EventOutcomeDefinition {
  const index = deterministicWeightedIndex(
    `${instance.id}:${instance.createdAt}:outcome`,
    outcomes.map((outcome) => outcome.weight)
  );

  return outcomes[index] ?? outcomes[0];
}

function updateInstance(instance: EventInstance): void {
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      director: {
        ...current.session.director,
        events: {
          ...current.session.director.events,
          instances: {
            ...current.session.director.events.instances,
            [instance.id]: instance,
          },
        },
      },
    },
  }));
}

export function createSelectedEventInstance(
  candidate: EventCandidate,
  decisionSummary: string
): EventInstance {
  const sequence = allocateSimulationSequence();
  const now = getRuntimeWorldState().simulation.worldTimeMinutes;

  const instance: EventInstance = {
    id: `director-event-${sequence.toString().padStart(6, "0")}`,
    definitionId: candidate.definitionId,
    createdAt: now,
    status: "SELECTED",
    bindings: { ...candidate.bindings },
    selectedBy: "WORLD_DIRECTOR",
    decisionSummary,
    causeEventIds: [],
    affectedEntityIds: Object.values(candidate.bindings),
  };

  updateInstance(instance);
  return instance;
}

function affectedPlayerId(bindings: Record<string, string>): string | undefined {
  if (bindings.playerId) {
    return bindings.playerId;
  }

  const kingdomId = bindings.kingdomId;

  if (!kingdomId) {
    return undefined;
  }

  return Object.values(getRuntimeWorldState().session.players).find(
    (player) =>
      player.active &&
      player.kingdomId === kingdomId
  )?.id;
}

export async function applyEventInstance(
  eventId: string
): Promise<EventInstance | undefined> {
  const world = getRuntimeWorldState();
  const instance = world.session.director.events.instances[eventId];

  if (!instance || instance.status !== "SELECTED") {
    return instance;
  }

  const definition = EVENT_DEFINITION_BY_ID[instance.definitionId];

  if (!definition) {
    const failed: EventInstance = {
      ...instance,
      status: "FAILED",
      resolvedAt: world.simulation.worldTimeMinutes,
      resultSummary: "Event definition missing.",
    };
    updateInstance(failed);
    return failed;
  }

  const candidate: EventCandidate = {
    candidateId: `${definition.id}:revalidate`,
    definitionId: definition.id,
    category: definition.category,
    name: definition.name,
    severity: definition.severity,
    resolutionMode: definition.resolutionMode,
    bindings: { ...instance.bindings },
    kingdomId: instance.bindings.kingdomId,
    reason: "Pre-apply revalidation",
  };

  const validation = revalidateEventCandidate(candidate);

  if (validation.ok === false) {
    const cancelled: EventInstance = {
      ...instance,
      status: "CANCELLED",
      resolvedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
      cancellationReason: validation.error,
      resultSummary: `Cancelled during revalidation: ${validation.error}`,
    };

    updateInstance(cancelled);
    return cancelled;
  }

  if (definition.resolutionMode === "PLAYER_DECISION") {
    const playerId = affectedPlayerId(instance.bindings);

    if (!playerId) {
      const failed: EventInstance = {
        ...instance,
        status: "FAILED",
        resolvedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
        resultSummary: "No affected player for player-decision event.",
      };
      updateInstance(failed);
      return failed;
    }

    openCommandInterrupt({
      type: "MAJOR_WORLD_EVENT",
      affectedPlayerIds: [playerId],
      message: `${definition.name}: a response is required.`,
    });

    const waiting: EventInstance = {
      ...instance,
      status: "WAITING_PLAYER",
      resultSummary: `Waiting for ${playerId} decision.`,
    };

    updateInstance(waiting);
    return waiting;
  }

  let outcome: EventOutcomeDefinition;

  if (definition.resolutionMode === "GM_NPC_DECISION") {
    const lordId = instance.bindings.lordId;
    const lord = lordId
      ? getRuntimeWorldState().session.lords.profiles[lordId]
      : undefined;

    if (!lord) {
      const failed: EventInstance = {
        ...instance,
        status: "FAILED",
        resolvedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
        resultSummary: "GM NPC event has no valid lord binding.",
      };
      updateInstance(failed);
      return failed;
    }

    const rulerId =
      getRuntimeWorldState().kingdoms[lord.kingdomId]?.rulerId ?? "";

    const gmDecision = await getGmLordOrderModelAdapter().decideOrder({
      worldTimeMinutes: getRuntimeWorldState().simulation.worldTimeMinutes,
      lord,
      order: {
        id: `event-order:${instance.id}`,
        playerId: affectedPlayerId(instance.bindings) ?? "director-event",
        rulerCharacterId: rulerId,
        lordCharacterId: lord.characterId,
        type: "HOLD_POSITION",
        risk: definition.severity === "major" ? 75 : 45,
        note: `Political event: ${definition.name}`,
        issuedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
        status: "RECEIVED",
      },
      ruler: {
        characterId: rulerId,
        relationship: lord.relationshipToRuler,
      },
      knownMilitarySituation: [],
      relevantMemories: [],
      rules: [
        "Respond as this NPC lord.",
        "This response does not mutate canonical state directly.",
      ],
    });

    outcome =
      ["ACCEPT", "PARTIAL_COMPLIANCE"].includes(gmDecision.response)
        ? definition.outcomes[0]
        : definition.outcomes[Math.min(1, definition.outcomes.length - 1)];
  } else if (definition.resolutionMode === "RNG") {
    outcome = pickOutcome(instance, definition.outcomes);
  } else {
    outcome = definition.outcomes[0];
  }

  try {
    const summaries = outcome.effects.map((effect) =>
      applyEffect(effect, instance.bindings)
    );

    const resolved: EventInstance = {
      ...instance,
      status: "RESOLVED",
      outcomeId: outcome.id,
      resolvedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
      resultSummary: summaries.join(" | "),
    };

    updateInstance(resolved);
    return resolved;
  } catch (error) {
    const failed: EventInstance = {
      ...instance,
      status: "FAILED",
      resolvedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
      resultSummary:
        error instanceof Error ? error.message : String(error),
    };

    updateInstance(failed);
    return failed;
  }
}

export async function resolvePlayerDecisionEvent(
  eventId: string,
  playerId: string,
  outcomeId: string
): Promise<EventInstance | undefined> {
  const world = getRuntimeWorldState();
  const instance = world.session.director.events.instances[eventId];

  if (!instance || instance.status !== "WAITING_PLAYER") {
    return instance;
  }

  const expectedPlayerId = affectedPlayerId(instance.bindings);

  if (expectedPlayerId !== playerId) {
    return undefined;
  }

  const definition = EVENT_DEFINITION_BY_ID[instance.definitionId];
  const outcome = definition?.outcomes.find((item) => item.id === outcomeId);

  if (!definition || !outcome) {
    return undefined;
  }

  const validation = revalidateEventCandidate({
    candidateId: `${instance.definitionId}:player-resolution`,
    definitionId: instance.definitionId,
    category: definition.category,
    name: definition.name,
    severity: definition.severity,
    resolutionMode: definition.resolutionMode,
    bindings: { ...instance.bindings },
    kingdomId: instance.bindings.kingdomId,
    reason: "Player decision revalidation",
  });

  if (validation.ok === false) {
    const cancelled: EventInstance = {
      ...instance,
      status: "CANCELLED",
      resolvedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
      cancellationReason: validation.error,
      resultSummary: `Cancelled before player decision applied: ${validation.error}`,
    };
    updateInstance(cancelled);
    return cancelled;
  }

  try {
    const summaries = outcome.effects.map((effect) =>
      applyEffect(effect, instance.bindings)
    );

    const resolved: EventInstance = {
      ...instance,
      status: "RESOLVED",
      outcomeId,
      resolvedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
      resultSummary: summaries.join(" | "),
    };

    updateInstance(resolved);
    return resolved;
  } catch (error) {
    const failed: EventInstance = {
      ...instance,
      status: "FAILED",
      resolvedAt: getRuntimeWorldState().simulation.worldTimeMinutes,
      resultSummary:
        error instanceof Error ? error.message : String(error),
    };
    updateInstance(failed);
    return failed;
  }
}
