import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  retrieveRelevantMemories,
} from "@/lib/conversation/memory";

import {
  adjustRelationship,
  getRelationship,
} from "@/lib/politics/relationships";

import type {
  DefectionEvaluation,
} from "@/types/politics";

/*
 * A rival kingdom's ruler is treated as having a live "foreign offer"
 * out to a lord once their (character-level) relationship with that
 * lord has been cultivated past this threshold. This reuses the
 * existing relationships store instead of inventing a separate offer
 * system -- a rival ruler who has been building ties with someone
 * else's lord is, functionally, the one making the overture.
 */
const FOREIGN_OFFER_RELATIONSHIP_THRESHOLD = 40;

function hasForeignOffer(
  lordCharacterId: string,
  homeKingdomId: string
): boolean {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.kingdoms
  ).some(
    (kingdom) =>
      kingdom.id !==
        homeKingdomId &&
      Boolean(
        kingdom.rulerId
      ) &&
      getRelationship(
        kingdom.rulerId as string,
        lordCharacterId
      ).value >=
        FOREIGN_OFFER_RELATIONSHIP_THRESHOLD
  );
}

/*
 * Daily defection sweep. evaluateLordDefection() was fully built but had
 * no caller anywhere in the app, so no lord could ever actually defect
 * or even be evaluated for it. This runs once per in-game day (called
 * from processDailyBoundary, alongside the existing daily audience-
 * request refresh) and applies a bounded, real consequence for every
 * eligible lord rather than leaving the evaluation inert:
 *  - DEFECT / ACCEPT_SECRETLY: loyalty and ruler relationship collapse
 *    (the lord is functionally gone as a reliable subordinate --
 *    downstream systems such as lib/lords/military-politics.ts already
 *    key order compliance off loyalty).
 *  - NEGOTIATE: loyalty erodes further while political power grows --
 *    the lord is extracting leverage rather than leaving outright.
 *  - INFORM_RULER: the lord reports the approach; relationship to the
 *    ruler improves slightly as a loyalty reward.
 *  - REJECT_OFFER / ineligible: no change.
 */
export function runDailyLordDefectionSweep():
  void {
  const world =
    getRuntimeWorldState();

  for (
    const profile of Object.values(
      world.session.lords
        .profiles
    )
  ) {
    const foreignOffer =
      hasForeignOffer(
        profile.characterId,
        profile.kingdomId
      );

    const evaluation =
      evaluateLordDefection(
        profile.characterId,
        foreignOffer
      );

    if (
      !evaluation.eligible &&
      evaluation.decision !==
        "INFORM_RULER"
    ) {
      continue;
    }

    const rulerId =
      world.kingdoms[
        profile.kingdomId
      ]?.rulerId;

    updateRuntimeWorldState(
      (current) => {
        const currentProfile =
          current.session.lords
            .profiles[
              profile
                .characterId
            ];

        if (!currentProfile) {
          return current;
        }

        let loyalty =
          currentProfile.loyalty;

        let politicalPower =
          currentProfile
            .politicalPower;

        if (
          evaluation.decision ===
            "DEFECT" ||
          evaluation.decision ===
            "ACCEPT_SECRETLY"
        ) {
          loyalty = Math.max(
            0,
            loyalty - 40
          );
        } else if (
          evaluation.decision ===
          "NEGOTIATE"
        ) {
          loyalty = Math.max(
            0,
            loyalty - 10
          );
          politicalPower =
            Math.min(
              100,
              politicalPower +
                8
            );
        }

        return {
          ...current,
          session: {
            ...current.session,
            lords: {
              ...current.session
                .lords,
              profiles: {
                ...current.session
                  .lords
                  .profiles,
                [profile
                  .characterId]: {
                  ...currentProfile,
                  loyalty,
                  politicalPower,
                },
              },
            },
          },
        };
      }
    );

    if (
      rulerId &&
      evaluation.decision ===
        "INFORM_RULER"
    ) {
      adjustRelationship(
        profile.characterId,
        rulerId,
        5
      );
    } else if (
      rulerId &&
      (evaluation.decision ===
        "DEFECT" ||
        evaluation.decision ===
          "ACCEPT_SECRETLY")
    ) {
      adjustRelationship(
        profile.characterId,
        rulerId,
        -25
      );
    }
  }
}

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
