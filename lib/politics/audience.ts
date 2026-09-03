import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  MINUTES_PER_DAY,
} from "@/lib/world/time";

import {
  validatePlayerAccess,
  validatePlayerCommandAccess,
} from "@/lib/session/access";

import {
  adjustRelationship,
} from "@/lib/politics/relationships";

import type {
  AudienceRequest,
  AudienceRequestKind,
  AudienceResponse,
  CouncilRecommendation,
} from "@/types/politics";

const REQUEST_TITLES:
  Record<
    AudienceRequestKind,
    string
  > = {
  TAX_RELIEF:
    "Petition for Tax Relief",

  MILITARY_LEVY:
    "Request for Emergency Levies",

  LAND_DISPUTE:
    "Dispute Over Crown Lands",

  COURT_OFFICE:
    "Petition for Court Office",
};

const REQUEST_TEXT:
  Record<
    AudienceRequestKind,
    string
  > = {
  TAX_RELIEF:
    "The petitioner asks the Crown to reduce immediate burdens on local estates and villages.",

  MILITARY_LEVY:
    "The petitioner asks for authority and support to raise additional men for the realm's defense.",

  LAND_DISPUTE:
    "The petitioner asks the Crown to settle a contested claim over land and local rights.",

  COURT_OFFICE:
    "The petitioner asks for a greater place in the royal court and the honors that come with it.",
};

function requestStore() {
  return (
    getRuntimeWorldState()
      .session
      .politics
      .audienceRequests ??
    {}
  );
}

function clamp(
  value:
    number,
  min:
    number,
  max:
    number
): number {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function updateLordPoliticalState(
  characterId:
    string,
  loyaltyDelta:
    number,
  relationDelta:
    number
): void {
  const world =
    getRuntimeWorldState();

  const profile =
    world.session
      .lords
      .profiles[
        characterId
      ];

  if (profile) {
    updateRuntimeWorldState(
      (current) => ({
        ...current,

        session: {
          ...current.session,

          lords: {
            ...current
              .session
              .lords,

            profiles: {
              ...current
                .session
                .lords
                .profiles,

              [characterId]: {
                ...current
                  .session
                  .lords
                  .profiles[
                    characterId
                  ],

                loyalty:
                  clamp(
                    current
                      .session
                      .lords
                      .profiles[
                        characterId
                      ]
                      .loyalty +
                      loyaltyDelta,
                    0,
                    100
                  ),

                relationshipToRuler:
                  clamp(
                    current
                      .session
                      .lords
                      .profiles[
                        characterId
                      ]
                      .relationshipToRuler +
                      relationDelta,
                    -100,
                    100
                  ),
              },
            },
          },
        },
      })
    );
  }

  const rulerId =
    Object.values(
      getRuntimeWorldState()
        .session
        .players
    ).find(
      (player) =>
        player.kingdomId ===
        getRuntimeWorldState()
          .characters[
            characterId
          ]?.kingdomId
    )?.characterId;

  if (rulerId) {
    adjustRelationship(
      characterId,
      rulerId,
      relationDelta
    );
  }
}

function adjustRealm(
  kingdomId:
    string,
  input: {
    treasuryDelta?:
      number;
    stabilityDelta?:
      number;
  }
): void {
  updateRuntimeWorldState(
    (current) => {
      const kingdom =
        current.kingdoms[
          kingdomId
        ];

      if (!kingdom) {
        return current;
      }

      return {
        ...current,

        kingdoms: {
          ...current.kingdoms,

          [kingdomId]: {
            ...kingdom,

            treasury:
              kingdom.treasury +
              (
                input
                  .treasuryDelta ??
                0
              ),

            stability:
              clamp(
                kingdom.stability +
                  (
                    input
                      .stabilityDelta ??
                    0
                  ),
                0,
                100
              ),
          },
        },
      };
    }
  );
}

function applyAudienceConsequence(
  request:
    AudienceRequest,
  response:
    AudienceResponse
): string {
  if (
    response ===
    "DEFER"
  ) {
    updateLordPoliticalState(
      request
        .petitionerCharacterId,
      -1,
      -1
    );

    return "The decision was deferred. The petitioner is mildly dissatisfied, but no major realm effect was applied.";
  }

  const accepted =
    response ===
    "ACCEPT";

  switch (
    request.kind
  ) {
    case "TAX_RELIEF":
      updateLordPoliticalState(
        request
          .petitionerCharacterId,
        accepted
          ? 4
          : -3,
        accepted
          ? 5
          : -3
      );

      adjustRealm(
        request.kingdomId,
        accepted
          ? {
              treasuryDelta:
                -60,
              stabilityDelta:
                4,
            }
          : {
              stabilityDelta:
                -2,
            }
      );

      return accepted
        ? "Tax relief granted: treasury -60, stability +4, petitioner loyalty improved."
        : "Tax relief refused: stability -2 and the petitioner's loyalty declined.";

    case "MILITARY_LEVY":
      updateLordPoliticalState(
        request
          .petitionerCharacterId,
        accepted
          ? 6
          : -3,
        accepted
          ? 4
          : -3
      );

      adjustRealm(
        request.kingdomId,
        accepted
          ? {
              treasuryDelta:
                -80,
              stabilityDelta:
                -1,
            }
          : {
              stabilityDelta:
                -1,
            }
      );

      return accepted
        ? "Emergency levy support granted: treasury -80, stability -1, petitioner loyalty improved."
        : "Levy request refused: petitioner loyalty declined and stability slipped by 1.";

    case "LAND_DISPUTE":
      updateLordPoliticalState(
        request
          .petitionerCharacterId,
        accepted
          ? 4
          : -3,
        accepted
          ? 6
          : -3
      );

      adjustRealm(
        request.kingdomId,
        accepted
          ? {
              stabilityDelta:
                -1,
            }
          : {
              stabilityDelta:
                1,
            }
      );

      return accepted
        ? "The Crown ruled for the petitioner: relationship improved, but the settlement caused minor realm friction."
        : "The claim was denied: the petitioner is angered, though Crown stability improved slightly.";

    case "COURT_OFFICE":
      updateLordPoliticalState(
        request
          .petitionerCharacterId,
        accepted
          ? 8
          : -5,
        accepted
          ? 8
          : -4
      );

      adjustRealm(
        request.kingdomId,
        accepted
          ? {
              treasuryDelta:
                -40,
            }
          : {}
      );

      return accepted
        ? "Court office granted: treasury -40 and the petitioner's loyalty and relationship improved."
        : "Court office refused: the petitioner's loyalty and relationship declined.";
  }
}

function pickRequestKind(
  index:
    number,
  loyalty:
    number,
  ambition:
    number
): AudienceRequestKind {
  if (
    loyalty <
    40
  ) {
    return "LAND_DISPUTE";
  }

  if (
    ambition >
    70
  ) {
    return "COURT_OFFICE";
  }

  const kinds:
    AudienceRequestKind[] = [
    "TAX_RELIEF",
    "MILITARY_LEVY",
    "LAND_DISPUTE",
    "COURT_OFFICE",
  ];

  return (
    kinds[
      index %
        kinds.length
    ] ??
    "TAX_RELIEF"
  );
}

export function createAudienceRequest(
  playerId:
    string,
  petitionerCharacterId:
    string,
  kind:
    AudienceRequestKind
) {
  const world =
    getRuntimeWorldState();

  const player =
    world.session
      .players[
        playerId
      ];

  const petitioner =
    world.characters[
      petitionerCharacterId
    ];

  if (
    !player ||
    !petitioner
  ) {
    return {
      ok:
        false as const,

      error:
        "AUDIENCE_PARTY_NOT_FOUND" as const,
    };
  }

  if (
    petitioner.kingdomId !==
    player.kingdomId
  ) {
    return {
      ok:
        false as const,

      error:
        "FOREIGN_PETITIONER" as const,
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const request:
    AudienceRequest = {
    id:
      `audience-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    playerId,

    petitionerCharacterId,

    kingdomId:
      player.kingdomId,

    kind,

    title:
      REQUEST_TITLES[
        kind
      ],

    petition:
      REQUEST_TEXT[
        kind
      ],

    createdAt:
      now,

    status:
      "REQUESTED",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        politics: {
          ...current
            .session
            .politics,

          audienceRequests: {
            ...(
              current
                .session
                .politics
                .audienceRequests ??
              {}
            ),

            [request.id]:
              request,
          },
        },
      },
    })
  );

  return {
    ok:
      true as const,

    request,
  };
}

export function seedInitialAudienceRequests():
  void {
  const world =
    getRuntimeWorldState();

  const existing =
    world.session
      .politics
      .audienceRequests ??
    {};

  for (
    const player
    of Object.values(
      world.session.players
    )
  ) {
    if (
      !player.active
    ) {
      continue;
    }

    if (
      Object.values(
        existing
      ).some(
        (request) =>
          request.playerId ===
          player.id &&
          (
            request.status ===
              "REQUESTED" ||
            request.status ===
              "PRESENTED" ||
            request.status ===
              "DEFERRED"
          )
      )
    ) {
      continue;
    }

    const lords =
      Object.values(
        getRuntimeWorldState()
          .session
          .lords
          .profiles
      )
        .filter(
          (profile) =>
            profile.kingdomId ===
            player.kingdomId
        )
        .sort(
          (a, b) =>
            a.loyalty -
              b.loyalty ||
            b.basicTraits
              .ambition -
              a.basicTraits
                .ambition ||
            a.characterId
              .localeCompare(
                b.characterId
              )
        );

    const petitioner =
      lords[0];

    if (!petitioner) {
      continue;
    }

    createAudienceRequest(
      player.id,
      petitioner
        .characterId,
      pickRequestKind(
        Object.keys(
          existing
        ).length,
        petitioner.loyalty,
        petitioner
          .basicTraits
          .ambition
      )
    );
  }
}

/*
 * Minimum in-game days a kingdom's lords wait between resolved audience
 * requests before the next one is allowed to surface. Without this, a
 * kingdom whose lowest-loyalty lord stays dissatisfied would generate a
 * brand-new petition the instant the previous one is resolved, which is
 * what actually produced the "lords constantly demanding things" feel --
 * not the cost of any single request. This throttles cadence instead of
 * silencing the mechanic outright: content courts petition rarely, and a
 * genuinely troubled court still petitions, just not every tick.
 */
const MIN_DAYS_BETWEEN_AUDIENCE_REQUESTS = 5;

/*
 * A lord who is neither dissatisfied nor ambitious has nothing pressing to
 * bring to court. Gating on this means loyalty is what actually drives
 * whether petitions happen at all -- a well-governed kingdom with content,
 * loyal lords can go long stretches with no petitions, while a kingdom that
 * lets loyalty rot will see its court petition often. This is the "better
 * loyalty system" lever: loyalty now has a direct, visible consequence on
 * how often the Crown is asked for something.
 */
const AUDIENCE_DISCONTENT_LOYALTY_THRESHOLD = 65;
const AUDIENCE_AMBITION_THRESHOLD = 75;

/**
 * Recurring, throttled counterpart to seedInitialAudienceRequests().
 *
 * Called once per in-game day (see processDailyBoundary) for every active
 * player -- HUMAN, ACTOR_LLM, and GM alike, since it only reads canonical
 * lord/request state -- so the audience-request mechanic keeps producing
 * genuine political pressure over the course of a long campaign instead of
 * firing exactly once at campaign start and then falling silent forever.
 */
export function refreshDailyAudienceRequests():
  void {
  const world =
    getRuntimeWorldState();

  const now =
    world.simulation
      .worldTimeMinutes;

  const existing =
    world.session
      .politics
      .audienceRequests ??
    {};

  for (
    const player
    of Object.values(
      world.session.players
    )
  ) {
    if (
      !player.active
    ) {
      continue;
    }

    const playerRequests =
      Object.values(
        existing
      ).filter(
        (request) =>
          request.playerId ===
          player.id
      );

    const hasActiveRequest =
      playerRequests.some(
        (request) =>
          request.status ===
            "REQUESTED" ||
          request.status ===
            "PRESENTED" ||
          request.status ===
            "DEFERRED"
      );

    if (hasActiveRequest) {
      continue;
    }

    const lastResolvedAt =
      playerRequests.reduce(
        (latest, request) => {
          const resolvedAt =
            request
              .consequenceAppliedAt ??
            request.respondedAt;

          if (
            resolvedAt ===
              undefined
          ) {
            return latest;
          }

          return Math.max(
            latest,
            resolvedAt
          );
        },
        -Infinity
      );

    if (
      lastResolvedAt !==
        -Infinity &&
      now -
        lastResolvedAt <
        MIN_DAYS_BETWEEN_AUDIENCE_REQUESTS *
          MINUTES_PER_DAY
    ) {
      continue;
    }

    const lords =
      Object.values(
        world.session
          .lords
          .profiles
      )
        .filter(
          (profile) =>
            profile.kingdomId ===
            player.kingdomId
        )
        .sort(
          (a, b) =>
            a.loyalty -
              b.loyalty ||
            b.basicTraits
              .ambition -
              a.basicTraits
                .ambition ||
            a.characterId
              .localeCompare(
                b.characterId
              )
        );

    const petitioner =
      lords[0];

    if (!petitioner) {
      continue;
    }

    const isDiscontented =
      petitioner.loyalty <
      AUDIENCE_DISCONTENT_LOYALTY_THRESHOLD;

    const isAmbitious =
      petitioner
        .basicTraits
        .ambition >
      AUDIENCE_AMBITION_THRESHOLD;

    if (
      !isDiscontented &&
      !isAmbitious
    ) {
      continue;
    }

    createAudienceRequest(
      player.id,
      petitioner
        .characterId,
      pickRequestKind(
        playerRequests.length,
        petitioner.loyalty,
        petitioner
          .basicTraits
          .ambition
      )
    );
  }
}

export function inspectAudienceRequests(
  sessionId:
    string,
  playerId:
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

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const requests =
    Object.values(
      requestStore()
    )
      .filter(
        (request) =>
          request.playerId ===
          playerId
      )
      .filter(
        (request) =>
          request.status !==
            "DEFERRED" ||
          request
            .deferredUntil ===
            undefined ||
          request
            .deferredUntil <=
            now
      )
      .sort(
        (a, b) =>
          b.createdAt -
            a.createdAt ||
          a.id.localeCompare(
            b.id
          )
      );

  return {
    ok:
      true as const,

    requests,
  };
}

export function presentAudienceRequest(
  sessionId:
    string,
  playerId:
    string,
  requestId:
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

  const request =
    requestStore()[
      requestId
    ];

  if (
    !request ||
    request.playerId !==
      playerId
  ) {
    return {
      ok:
        false as const,

      error:
        "AUDIENCE_REQUEST_NOT_FOUND" as const,
    };
  }

  if (
    request.status !==
      "REQUESTED" &&
    request.status !==
      "DEFERRED"
  ) {
    return {
      ok:
        false as const,

      error:
        "AUDIENCE_REQUEST_NOT_PRESENTABLE" as const,
    };
  }

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const presented: AudienceRequest = {
    ...request,

    status:
      "PRESENTED",

    presentedAt:
      now,

    deferredUntil:
      undefined,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        politics: {
          ...current
            .session
            .politics,

          audienceRequests: {
            ...(
              current
                .session
                .politics
                .audienceRequests ??
              {}
            ),

            [requestId]:
              presented,
          },
        },
      },
    })
  );

  return {
    ok:
      true as const,

    request:
      presented,
  };
}

export function conveneCouncilForAudienceRequest(
  sessionId:
    string,
  playerId:
    string,
  requestId:
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

  const request =
    requestStore()[
      requestId
    ];

  if (
    !request ||
    request.playerId !==
      playerId
  ) {
    return {
      ok:
        false as const,

      error:
        "AUDIENCE_REQUEST_NOT_FOUND" as const,
    };
  }

  const lords =
    Object.values(
      getRuntimeWorldState()
        .session
        .lords
        .profiles
    )
      .filter(
        (profile) =>
          profile.kingdomId ===
          access.player
            .kingdomId
      )
      .sort(
        (a, b) =>
          a.characterId
            .localeCompare(
              b.characterId
            )
      );

  let support =
    0;

  let oppose =
    0;

  let abstain =
    0;

  for (
    const lord
    of lords
  ) {
    let score =
      lord.loyalty -
      50;

    score +=
      lord
        .relationshipToRuler /
      4;

    if (
      lord.characterId ===
      request
        .petitionerCharacterId
    ) {
      score +=
        30;
    }

    if (
      request.kind ===
      "MILITARY_LEVY"
    ) {
      score +=
        lord
          .basicTraits
          .aggression /
        5;
    }

    if (
      request.kind ===
      "COURT_OFFICE"
    ) {
      score -=
        lord
          .basicTraits
          .ambition /
        8;
    }

    if (
      request.kind ===
      "TAX_RELIEF"
    ) {
      score +=
        lord
          .basicTraits
          .honor /
        10;
    }

    if (
      score >=
      8
    ) {
      support +=
        1;
    } else if (
      score <=
      -8
    ) {
      oppose +=
        1;
    } else {
      abstain +=
        1;
    }
  }

  const recommendation:
    CouncilRecommendation =
    support >
      oppose
      ? "SUPPORT"
      : oppose >
          support
        ? "OPPOSE"
        : "DIVIDED";

  const advice = {
    convenedAt:
      getRuntimeWorldState()
        .simulation
        .worldTimeMinutes,

    support,

    oppose,

    abstain,

    recommendation,

    summary:
      `${support} support, ${oppose} oppose, ${abstain} abstain.`,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        politics: {
          ...current
            .session
            .politics,

          audienceRequests: {
            ...(
              current
                .session
                .politics
                .audienceRequests ??
              {}
            ),

            [requestId]: {
              ...current
                .session
                .politics
                .audienceRequests?.[
                  requestId
                ] ??
              request,

              councilAdvice:
                advice,
            },
          },
        },
      },
    })
  );

  return {
    ok:
      true as const,

    advice,
  };
}

export function respondToAudienceRequest(
  sessionId:
    string,
  playerId:
    string,
  requestId:
    string,
  response:
    AudienceResponse
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

  const request =
    requestStore()[
      requestId
    ];

  if (
    !request ||
    request.playerId !==
      playerId
  ) {
    return {
      ok:
        false as const,

      error:
        "AUDIENCE_REQUEST_NOT_FOUND" as const,
    };
  }

  if (
    request.status !==
    "PRESENTED"
  ) {
    return {
      ok:
        false as const,

      error:
        "AUDIENCE_REQUEST_NOT_PRESENTED" as const,
    };
  }

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const consequenceSummary =
    applyAudienceConsequence(
      request,
      response
    );

  const status =
    response ===
      "ACCEPT"
      ? "ACCEPTED"
      : response ===
          "REFUSE"
        ? "REFUSED"
        : "DEFERRED";

  const resolved:
    AudienceRequest = {
    ...request,

    status,

    respondedAt:
      now,

    deferredUntil:
      response ===
        "DEFER"
        ? now +
          1440
        : undefined,

    consequenceSummary,

    consequenceAppliedAt:
      now,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        politics: {
          ...current
            .session
            .politics,

          audienceRequests: {
            ...(
              current
                .session
                .politics
                .audienceRequests ??
              {}
            ),

            [requestId]:
              resolved,
          },
        },
      },
    })
  );

  return {
    ok:
      true as const,

    request:
      resolved,

    consequenceSummary,
  };
}
