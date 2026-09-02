import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  EVENT_DEFINITION_BY_ID,
} from "@/data/events/catalog";

import {
  buildEventDirectorContext,
} from "@/lib/events/context";

import {
  buildEventOpportunities,
} from "@/lib/events/opportunities";

import {
  canSpendEventBudget,
  categoryDue,
  markCategoryChecked,
  spendEventBudget,
} from "@/lib/events/budget";

import {
  isEventOnCooldown,
  setEventCooldown,
} from "@/lib/events/cooldown";

import {
  passEventOpportunityGate,
} from "@/lib/events/gate";

import {
  createSelectedEventInstance,
  applyEventInstance,
} from "@/lib/events/apply";

import {
  appendDirectorTrace,
} from "@/lib/events/trace";

import type {
  DirectorEventCategory,
  EventCandidate,
  EventDirectorModelAdapter,
  EventInstance,
  EventOpportunity,
} from "@/types/events";

const CATEGORY_ORDER: DirectorEventCategory[] = [
  "BATTLE",
  "SIEGE",
  "DIPLOMATIC",
  "POLITICAL",
  "TRAVEL",
  "CAMPAIGN",
  "ECONOMIC",
];

function filterOpportunity(
  opportunity: EventOpportunity
): EventOpportunity {
  return {
    ...opportunity,
    candidates: opportunity.candidates.filter(
      (candidate) =>
        !isEventOnCooldown(candidate) &&
        canSpendEventBudget(candidate)
    ),
  };
}

function candidateTargetSummary(candidate: EventCandidate): string {
  return Object.entries(candidate.bindings)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export async function runEventOpportunity(
  opportunity: EventOpportunity,
  adapter: EventDirectorModelAdapter
): Promise<EventInstance | undefined> {
  const filtered = filterOpportunity(opportunity);

  if (filtered.candidates.length === 0) {
    appendDirectorTrace({
      activationReason: opportunity.reason,
      opportunityId: opportunity.id,
      eligibleEventCount: 0,
      validatorStatus: "NOT_RUN",
      playerKnowledge: "No event selected; no knowledge generated.",
    });
    return undefined;
  }

  if (!passEventOpportunityGate(filtered)) {
    appendDirectorTrace({
      activationReason: opportunity.reason,
      opportunityId: opportunity.id,
      eligibleEventCount: filtered.candidates.length,
      validatorStatus: "NOT_RUN",
      playerKnowledge: "Chance gate closed; no event occurred.",
    });
    return undefined;
  }

  const context = buildEventDirectorContext(filtered);
  const response = await adapter.selectEvent(context);

  if (!response.selectedCandidateId) {
    appendDirectorTrace({
      activationReason: opportunity.reason,
      opportunityId: opportunity.id,
      eligibleEventCount: filtered.candidates.length,
      validatorStatus: "NOT_RUN",
      playerKnowledge: "Director declined to select an event.",
      decisionSummary: response.decisionSummary,
    });
    return undefined;
  }

  const selected = filtered.candidates.find(
    (candidate) => candidate.candidateId === response.selectedCandidateId
  );

  if (!selected) {
    appendDirectorTrace({
      activationReason: opportunity.reason,
      opportunityId: opportunity.id,
      eligibleEventCount: filtered.candidates.length,
      validatorStatus: "REJECTED",
      playerKnowledge: "Invalid model selection produced no player knowledge.",
      decisionSummary: response.decisionSummary,
    });
    return undefined;
  }

  const instance = createSelectedEventInstance(
    selected,
    response.decisionSummary
  );

  const applied = await applyEventInstance(instance.id);

  if (!applied) {
    return undefined;
  }

  if (["RESOLVED", "WAITING_PLAYER"].includes(applied.status)) {
    spendEventBudget(selected);
    setEventCooldown(selected);
  }

  appendDirectorTrace({
    activationReason: opportunity.reason,
    opportunityId: opportunity.id,
    eligibleEventCount: filtered.candidates.length,
    selectedDefinitionId: selected.definitionId,
    targetSummary: candidateTargetSummary(selected),
    validatorStatus:
      applied.status === "CANCELLED" || applied.status === "FAILED"
        ? "REJECTED"
        : "PASS",
    canonicalResult: applied.resultSummary,
    playerKnowledge:
      applied.resultSummary?.includes("Knowledge ")
        ? "Knowledge delivered only through explicit entitled knowledge effect."
        : "Event occurrence itself was not broadcast to players.",
    decisionSummary: response.decisionSummary,
  });

  return applied;
}

export async function runDueDirectorEvents(
  adapter: EventDirectorModelAdapter
): Promise<EventInstance[]> {
  const all = buildEventOpportunities();
  const resolved: EventInstance[] = [];

  for (const category of CATEGORY_ORDER) {
    if (!categoryDue(category)) {
      continue;
    }

    markCategoryChecked(category);

    const opportunities = all.filter(
      (opportunity) => opportunity.category === category
    );

    for (const opportunity of opportunities) {
      if (
        getRuntimeWorldState().session.director.events.dailyBudget.globalCount >= 4
      ) {
        return resolved;
      }

      const event = await runEventOpportunity(opportunity, adapter);

      if (event) {
        resolved.push(event);
        break;
      }
    }
  }

  return resolved;
}

export const deterministicFirstEligibleEventAdapter: EventDirectorModelAdapter = {
  async selectEvent(context) {
    return {
      decisionSummary: "Deterministic demo adapter selected the first eligible predefined event.",
      selectedCandidateId: context.candidates[0]?.candidateId ?? null,
    };
  },
};

export function inspectEventHistory(): EventInstance[] {
  return Object.values(
    getRuntimeWorldState().session.director.events.instances
  ).sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)
  );
}

export function eventDefinitionName(event: EventInstance): string {
  return EVENT_DEFINITION_BY_ID[event.definitionId]?.name ?? event.definitionId;
}
