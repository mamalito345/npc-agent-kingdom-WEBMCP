import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  validatePlayerAccess,
  validatePlayerCommandAccess,
} from "@/lib/session/access";

import {
  spawnCourier,
} from "@/lib/world/couriers";

import {
  findActiveWarBetweenRealms,
  endWar,
} from "@/lib/military/war";

import {
  adjustRelationship,
} from "@/lib/politics/relationships";

import type {
  Agreement,
  AgreementType,
  PoliticalPromise,
  PromiseStatus,
} from "@/types/politics";

function findPlayerForKingdom(
  kingdomId: string
) {
  return Object.values(
    getRuntimeWorldState()
      .session.players
  ).find(
    (player) =>
      player.active &&
      player.kingdomId ===
        kingdomId
  );
}

function proposalDelivered(
  agreement: Agreement
): boolean {
  if (
    agreement.deliveredAt !==
    undefined
  ) {
    return true;
  }

  if (
    !agreement.proposalMessageId
  ) {
    return false;
  }

  const message =
    getRuntimeWorldState()
      .messages[
        agreement
          .proposalMessageId
      ];

  return (
    message?.deliveredAt !==
    undefined
  );
}

export function inspectRelationships(
  sessionId: string,
  playerId: string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const characterId =
    access.player.characterId;

  const relationships =
    Object.values(
      getRuntimeWorldState()
        .session.politics
        .relationships
    )
      .filter(
        (relationship) =>
          relationship
            .fromCharacterId ===
            characterId ||
          relationship
            .toCharacterId ===
            characterId
      )
      .sort(
        (a, b) =>
          a.fromCharacterId
            .localeCompare(
              b.fromCharacterId
            ) ||
          a.toCharacterId
            .localeCompare(
              b.toCharacterId
            )
      );

  return {
    ok: true as const,
    relationships,
  };
}

export function inspectAgreements(
  sessionId: string,
  playerId: string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const agreements =
    Object.values(
      getRuntimeWorldState()
        .session.politics
        .agreements
    )
      .filter(
        (agreement) =>
          agreement
            .partyKingdomIds
            .includes(
              access.player
                .kingdomId
            )
      )
      .filter(
        (agreement) => {
          if (
            agreement.status !==
            "PROPOSED"
          ) {
            return true;
          }

          if (
            agreement
              .proposedByPlayerId ===
            playerId
          ) {
            return true;
          }

          return (
            agreement
              .proposedToPlayerId ===
              playerId &&
            proposalDelivered(
              agreement
            )
          );
        }
      );

  return {
    ok: true as const,
    agreements,
  };
}

export function inspectDiplomaticProposals(
  sessionId: string,
  playerId: string
) {
  const result =
    inspectAgreements(
      sessionId,
      playerId
    );

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    proposals:
      result.agreements.filter(
        (agreement) =>
          agreement.status ===
          "PROPOSED"
      ),
  };
}

export function inspectPromises(
  sessionId: string,
  playerId: string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const characterId =
    access.player.characterId;

  return {
    ok: true as const,
    promises:
      Object.values(
        getRuntimeWorldState()
          .session.politics
          .promises
      ).filter(
        (promise) =>
          promise
            .promisorCharacterId ===
            characterId ||
          promise
            .promiseeCharacterId ===
            characterId
      ),
  };
}

export function proposeAgreement(
  sessionId: string,
  playerId: string,
  type: AgreementType,
  targetKingdomId: string,
  options?: {
    terms?: string;
    expiresAt?: number;
    secret?: boolean;
  }
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  if (
    targetKingdomId ===
    access.player.kingdomId
  ) {
    return {
      ok: false as const,
      error:
        "SAME_KINGDOM",
    };
  }

  const targetPlayer =
    findPlayerForKingdom(
      targetKingdomId
    );

  if (!targetPlayer) {
    return {
      ok: false as const,
      error:
        "TARGET_PLAYER_NOT_FOUND",
    };
  }

  const world =
    getRuntimeWorldState();

  const senderPosition =
    world.simulation
      .entityPositions[
        access.player
          .characterId
      ];

  const targetPosition =
    world.simulation
      .entityPositions[
        targetPlayer
          .characterId
      ];

  if (
    !senderPosition ||
    senderPosition.kind !==
      "node" ||
    !targetPosition ||
    targetPosition.kind !==
      "node"
  ) {
    return {
      ok: false as const,
      error:
        "DIPLOMATIC_PARTY_NOT_AT_NODE",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const agreementId =
    `agreement-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const dispatch =
    spawnCourier(
      access.player
        .characterId,
      targetPlayer
        .characterId,
      `[DIPLOMATIC_PROPOSAL:${agreementId}] ${type}${options?.terms ? ` — ${options.terms}` : ""}`,
      senderPosition.nodeId,
      targetPosition.nodeId
    );

  if (!dispatch.ok) {
    return {
      ok: false as const,
      error:
        dispatch.error,
    };
  }

  const agreement:
    Agreement = {
    id: agreementId,
    type,
    partyKingdomIds: [
      access.player
        .kingdomId,
      targetKingdomId,
    ],
    proposedByPlayerId:
      playerId,
    proposedToPlayerId:
      targetPlayer.id,
    createdAt:
      now,
    status:
      "PROPOSED",
    terms:
      options?.terms,
    expiresAt:
      options?.expiresAt,
    secret:
      options?.secret,
    proposalMessageId:
      dispatch.message.id,
  };

  if (
    type === "PEACE"
  ) {
    agreement.linkedWarId =
      findActiveWarBetweenRealms(
        access.player
          .kingdomId,
        targetKingdomId
      )?.id;
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        politics: {
          ...current.session
            .politics,
          agreements: {
            ...current.session
              .politics
              .agreements,
            [agreement.id]:
              agreement,
          },
        },
      },
    })
  );

  return {
    ok: true as const,
    agreement,
    courier:
      dispatch.courier,
    message:
      dispatch.message,
  };
}

export function respondToAgreement(
  sessionId: string,
  playerId: string,
  agreementId: string,
  accept: boolean
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const agreement =
    world.session.politics
      .agreements[
        agreementId
      ];

  if (!agreement) {
    return {
      ok: false as const,
      error:
        "AGREEMENT_NOT_FOUND",
    };
  }

  if (
    agreement.status !==
    "PROPOSED"
  ) {
    return {
      ok: false as const,
      error:
        "AGREEMENT_NOT_PROPOSED",
    };
  }

  if (
    agreement
      .proposedToPlayerId !==
    playerId
  ) {
    return {
      ok: false as const,
      error:
        "NOT_AUTHORIZED",
    };
  }

  if (
    !proposalDelivered(
      agreement
    )
  ) {
    return {
      ok: false as const,
      error:
        "PROPOSAL_NOT_DELIVERED",
    };
  }

  const now =
    world.simulation
      .worldTimeMinutes;

  let linkedWarId =
    agreement.linkedWarId;

  if (
    accept &&
    agreement.type ===
      "PEACE"
  ) {
    const war =
      linkedWarId
        ? world.wars[
            linkedWarId
          ]
        : findActiveWarBetweenRealms(
            agreement
              .partyKingdomIds[0],
            agreement
              .partyKingdomIds[1]
          );

    if (
      war &&
      war.status ===
        "active"
    ) {
      const ended =
        endWar(
          war.id
        );

      if (!ended.ok) {
        return ended;
      }

      linkedWarId =
        war.id;
    }
  }

  const updated:
    Agreement = {
    ...agreement,
    status:
      accept
        ? "ACTIVE"
        : "REJECTED",
    deliveredAt:
      agreement.deliveredAt ??
      world.messages[
        agreement
          .proposalMessageId ??
          ""
      ]?.deliveredAt,
    respondedAt:
      now,
    responsePlayerId:
      playerId,
    linkedWarId,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        politics: {
          ...current.session
            .politics,
          agreements: {
            ...current.session
              .politics
              .agreements,
            [agreementId]:
              updated,
          },
        },
      },
    })
  );

  return {
    ok: true as const,
    agreement:
      updated,
  };
}

export function breakAgreement(
  sessionId: string,
  playerId: string,
  agreementId: string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const agreement =
    getRuntimeWorldState()
      .session.politics
      .agreements[
        agreementId
      ];

  if (
    !agreement ||
    !agreement
      .partyKingdomIds
      .includes(
        access.player
          .kingdomId
      )
  ) {
    return {
      ok: false as const,
      error:
        "NOT_AUTHORIZED",
    };
  }

  if (
    agreement.status !==
    "ACTIVE"
  ) {
    return {
      ok: false as const,
      error:
        "AGREEMENT_NOT_ACTIVE",
    };
  }

  const broken: Agreement = {
    ...agreement,
    status:
      "BROKEN",
  };

  const breakingKingdomId =
    access.player
      .kingdomId;

  /*
   * Breaking a treaty used to be purely a status flip -- no relations
   * consequence at all, which made "breaking" an agreement free. Every
   * other party's kingdom now takes a real, symmetric relations hit
   * against the kingdom that broke it, the same way declaring war does
   * in lib/politics/war.ts.
   */
  const AGREEMENT_BREAK_RELATION_PENALTY = 20;

  updateRuntimeWorldState(
    (current) => {
      const kingdoms = {
        ...current.kingdoms,
      };

      for (
        const otherKingdomId of agreement.partyKingdomIds
      ) {
        if (
          otherKingdomId ===
          breakingKingdomId
        ) {
          continue;
        }

        const breaker =
          kingdoms[
            breakingKingdomId
          ];

        const other =
          kingdoms[
            otherKingdomId
          ];

        if (
          !breaker ||
          !other
        ) {
          continue;
        }

        kingdoms[
          breakingKingdomId
        ] = {
          ...breaker,
          relations: {
            ...breaker.relations,
            [otherKingdomId]:
              Math.max(
                -100,
                (
                  breaker
                    .relations[
                      otherKingdomId
                    ] ?? 0
                ) -
                  AGREEMENT_BREAK_RELATION_PENALTY
              ),
          },
        };

        kingdoms[
          otherKingdomId
        ] = {
          ...other,
          relations: {
            ...other.relations,
            [breakingKingdomId]:
              Math.max(
                -100,
                (
                  other
                    .relations[
                      breakingKingdomId
                    ] ?? 0
                ) -
                  AGREEMENT_BREAK_RELATION_PENALTY
              ),
          },
        };
      }

      return {
        ...current,
        kingdoms,
        session: {
          ...current.session,
          politics: {
            ...current.session
              .politics,
            agreements: {
              ...current.session
                .politics
                .agreements,
              [agreementId]:
                broken,
            },
          },
        },
      };
    }
  );

  return {
    ok: true as const,
    agreement:
      broken,
  };
}

export function createPromise(
  sessionId: string,
  playerId: string,
  promiseeCharacterId: string,
  summary: string,
  targetId?: string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  if (
    !getRuntimeWorldState()
      .characters[
        promiseeCharacterId
      ]
  ) {
    return {
      ok: false as const,
      error:
        "PROMISEE_NOT_FOUND",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const promise:
    PoliticalPromise = {
    id:
      `promise-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,
    promisorCharacterId:
      access.player
        .characterId,
    promiseeCharacterId,
    summary,
    targetId,
    createdAt:
      getRuntimeWorldState()
        .simulation
        .worldTimeMinutes,
    status:
      "ACTIVE",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        politics: {
          ...current.session
            .politics,
          promises: {
            ...current.session
              .politics
              .promises,
            [promise.id]:
              promise,
          },
        },
      },
    })
  );

  return {
    ok: true as const,
    promise,
  };
}

function adjustLordLoyaltyForPromise(
  promise:
    PoliticalPromise,
  delta: number
): void {
  updateRuntimeWorldState(
    (current) => {
      const profile =
        current.session
          .lords
          .profiles[
            promise
              .promiseeCharacterId
          ];

      if (!profile) {
        return current;
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
                ...profile,
                loyalty:
                  Math.max(
                    0,
                    Math.min(
                      100,
                      profile
                        .loyalty +
                        delta
                    )
                  ),
              },
            },
          },
        },
      };
    }
  );
}

export function resolvePromise(
  sessionId: string,
  playerId: string,
  promiseId: string,
  status:
    Exclude<
      PromiseStatus,
      "ACTIVE"
    >
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const promise =
    getRuntimeWorldState()
      .session.politics
      .promises[
        promiseId
      ];

  if (!promise) {
    return {
      ok: false as const,
      error:
        "PROMISE_NOT_FOUND",
    };
  }

  if (
    promise
      .promisorCharacterId !==
    access.player
      .characterId
  ) {
    return {
      ok: false as const,
      error:
        "NOT_AUTHORIZED",
    };
  }

  if (
    promise.status !==
    "ACTIVE"
  ) {
    return {
      ok: false as const,
      error:
        "PROMISE_NOT_ACTIVE",
    };
  }

  const resolved:
    PoliticalPromise = {
    ...promise,
    status,
    resolvedAt:
      getRuntimeWorldState()
        .simulation
        .worldTimeMinutes,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        politics: {
          ...current.session
            .politics,
          promises: {
            ...current.session
              .politics
              .promises,
            [promiseId]:
              resolved,
          },
        },
      },
    })
  );

  if (
    status ===
    "FULFILLED"
  ) {
    adjustRelationship(
      promise.promiseeCharacterId,
      promise.promisorCharacterId,
      15
    );
    adjustLordLoyaltyForPromise(
      promise,
      8
    );
  } else if (
    status ===
    "BROKEN"
  ) {
    adjustRelationship(
      promise.promiseeCharacterId,
      promise.promisorCharacterId,
      -15
    );
    adjustLordLoyaltyForPromise(
      promise,
      -10
    );
  }

  return {
    ok: true as const,
    promise:
      resolved,
  };
}

export function hasActiveAgreementBetween(
  type: AgreementType,
  kingdomAId: string,
  kingdomBId: string
): boolean {
  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  return Object.values(
    getRuntimeWorldState()
      .session.politics
      .agreements
  ).some(
    (agreement) =>
      agreement.type ===
        type &&
      agreement.status ===
        "ACTIVE" &&
      agreement
        .partyKingdomIds
        .includes(
          kingdomAId
        ) &&
      agreement
        .partyKingdomIds
        .includes(
          kingdomBId
        ) &&
      (
        agreement.expiresAt ===
          undefined ||
        agreement.expiresAt >
          now
      )
  );
}

export function exportPoliticsRuntimeState(): string {
  return JSON.stringify(
    getRuntimeWorldState()
      .session.politics
  );
}

export function importPoliticsRuntimeState(
  serialized: string
): void {
  const parsed =
    JSON.parse(
      serialized
    );

  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    !parsed.relationships ||
    !parsed.agreements ||
    !parsed.promises
  ) {
    throw new Error(
      "INVALID_POLITICS_RUNTIME_STATE"
    );
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        politics:
          parsed,
      },
    })
  );
}
