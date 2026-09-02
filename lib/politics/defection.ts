import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  retrieveRelevantMemories,
} from "@/lib/conversation/memory";

import type {
  DefectionEvaluation,
} from "@/types/politics";

export function evaluateLordDefection(
  lordCharacterId: string,
  foreignOffer: boolean
): DefectionEvaluation {
  const world =
    getRuntimeWorldState();

  const profile =
    world.session.lords
      .profiles[
        lordCharacterId
      ];

  if (!profile) {
    return {
      eligible: false,
      decision:
        "REJECT_OFFER",
      reasons: [
        "lord profile missing",
      ],
    };
  }

  const rulerId =
    world.kingdoms[
      profile.kingdomId
    ]?.rulerId;

  const relationship =
    rulerId
      ? world.session
          .politics
          .relationships[
            `${lordCharacterId}->${rulerId}`
          ]?.value ??
        profile
          .relationshipToRuler
      : profile
          .relationshipToRuler;

  const grievances =
    retrieveRelevantMemories(
      lordCharacterId,
      "grievance insult betrayal refused broken promise political",
      rulerId
        ? [rulerId]
        : [],
      10
    ).filter(
      (memory) =>
        memory.importance >=
        60
    );

  const reasons:
    string[] = [];

  if (
    profile.loyalty <=
    35
  ) {
    reasons.push(
      "low loyalty"
    );
  }

  if (
    relationship <=
    0
  ) {
    reasons.push(
      "poor ruler relationship"
    );
  }

  if (
    grievances.length >
    0
  ) {
    reasons.push(
      "important grievance"
    );
  }

  if (foreignOffer) {
    reasons.push(
      "meaningful foreign offer"
    );
  }

  const eligible =
    profile.loyalty <=
      35 &&
    relationship <=
      0 &&
    grievances.length >
      0 &&
    foreignOffer;

  if (!eligible) {
    return {
      eligible: false,
      decision:
        profile.loyalty >=
        70
          ? "INFORM_RULER"
          : "REJECT_OFFER",
      reasons,
    };
  }

  const intrigue =
    profile.basicTraits
      .intrigue;

  const ambition =
    profile.basicTraits
      .ambition;

  if (
    intrigue >= 80 &&
    ambition >= 75
  ) {
    return {
      eligible: true,
      decision:
        "ACCEPT_SECRETLY",
      reasons,
    };
  }

  if (
    ambition >= 60
  ) {
    return {
      eligible: true,
      decision:
        "NEGOTIATE",
      reasons,
    };
  }

  return {
    eligible: true,
    decision:
      "DEFECT",
    reasons,
  };
}
