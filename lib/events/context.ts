import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  EventDirectorContext,
  EventOpportunity,
} from "@/types/events";

export function buildEventDirectorContext(
  opportunity: EventOpportunity
): EventDirectorContext {
  const world = getRuntimeWorldState();

  return {
    worldTimeMinutes: world.simulation.worldTimeMinutes,
    opportunity: {
      id: opportunity.id,
      category: opportunity.category,
      reason: opportunity.reason,
      kingdomId: opportunity.kingdomId,
    },
    candidates: opportunity.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      definitionId: candidate.definitionId,
      name: candidate.name,
      severity: candidate.severity,
      resolutionMode: candidate.resolutionMode,
      bindings: { ...candidate.bindings },
    })),
    recentEvents: Object.values(world.session.director.events.instances)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
      .slice(-20)
      .map((event) => ({
        id: event.id,
        definitionId: event.definitionId,
        status: event.status,
        resultSummary: event.resultSummary,
      })),
    rules: [
      "Select only a provided candidateId or null.",
      "You are the World Director, not a player and not an NPC character.",
      "Never invent a new event definition.",
      "Never mutate state directly; selection is revalidated and canonically applied.",
      "Prefer contextually meaningful variety and avoid event spam.",
      "Do not reveal hidden information merely because an event exists.",
      "Do not choose battle winners or force player actions.",
    ],
  };
}
