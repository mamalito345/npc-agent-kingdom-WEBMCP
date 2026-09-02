import {
  EVENT_DEFINITION_BY_ID,
} from "@/data/events/catalog";

import {
  deterministicUnitRoll,
} from "@/lib/events/rng";

import type {
  EventOpportunity,
} from "@/types/events";

export function passEventOpportunityGate(
  opportunity: EventOpportunity
): boolean {
  if (opportunity.candidates.length === 0) {
    return false;
  }

  const maxChance = Math.max(
    ...opportunity.candidates.map(
      (candidate) =>
        EVENT_DEFINITION_BY_ID[candidate.definitionId]?.baseChance ?? 0
    )
  );

  const boundedChance = Math.max(0, Math.min(0.75, maxChance));

  const roll = deterministicUnitRoll(
    `${opportunity.id}:${opportunity.createdAt}:${opportunity.candidates
      .map((candidate) => candidate.definitionId)
      .join(",")}`
  );

  return roll < boundedChance;
}
