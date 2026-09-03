import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getDiplomaticPairStatus,
  getActiveAgreementsBetween,
} from "@/lib/politics/diplomatic-law";

export type WarReason =
  | "BORDER_VIOLATION"
  | "DEFENSE_OF_ALLY"
  | "CLAIM"
  | "RETALIATION"
  | "AGGRESSION";

export type DeclareWarResult =
  | {
      ok: true;
      warId: string;
      attackerKingdomId: string;
      defenderKingdomId: string;
      reason: WarReason;
      brokenAgreementIds: string[];
      nonAggressionBreach:
        boolean;
    }
  | {
      ok: false;
      error:
        | "KINGDOM_NOT_FOUND"
        | "CANNOT_DECLARE_WAR_ON_SELF"
        | "ALREADY_AT_WAR"
        | "ACTIVE_PEACE_TRUCE";
      truceExpiresAt?:
        number;
    };

export function areKingdomsAtWar(
  kingdomAId: string,
  kingdomBId: string
): boolean {
  return getDiplomaticPairStatus(
    kingdomAId,
    kingdomBId
  ).atWar;
}

/*
 * How many separate active wars this kingdom is currently fighting.
 * Used to give war a real, immediate economic cost (trade income)
 * rather than only mattering where armies physically clash.
 */
export function getActiveWarCount(
  kingdomId: string
): number {
  const world = getRuntimeWorldState();

  return Object.keys(world.kingdoms).filter(
    (otherKingdomId) =>
      otherKingdomId !== kingdomId &&
      areKingdomsAtWar(kingdomId, otherKingdomId)
  ).length;
}

export function declareWar(
  attackerKingdomId: string,
  defenderKingdomId: string,
  reason:
    WarReason =
      "AGGRESSION"
):
  DeclareWarResult {
  const world =
    getRuntimeWorldState();

  if (
    !world.kingdoms[
      attackerKingdomId
    ] ||
    !world.kingdoms[
      defenderKingdomId
    ]
  ) {
    return {
      ok: false,
      error:
        "KINGDOM_NOT_FOUND",
    };
  }

  if (
    attackerKingdomId ===
    defenderKingdomId
  ) {
    return {
      ok: false,
      error:
        "CANNOT_DECLARE_WAR_ON_SELF",
    };
  }

  const pair =
    getDiplomaticPairStatus(
      attackerKingdomId,
      defenderKingdomId
    );

  if (
    pair.atWar
  ) {
    return {
      ok: false,
      error:
        "ALREADY_AT_WAR",
    };
  }

  if (
    pair.peaceProtected
  ) {
    return {
      ok: false,
      error:
        "ACTIVE_PEACE_TRUCE",
      truceExpiresAt:
        pair
          .peaceProtectedUntil,
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const warId =
    `war-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const activeAgreements =
    getActiveAgreementsBetween(
      attackerKingdomId,
      defenderKingdomId
    );

  const nonAggressionBreach =
    activeAgreements.some(
      (agreement) =>
        agreement.type ===
        "NON_AGGRESSION"
    );

  const brokenAgreementIds =
    activeAgreements
      .filter(
        (agreement) =>
          agreement.type ===
            "NON_AGGRESSION" ||
          agreement.type ===
            "ALLIANCE" ||
          agreement.type ===
            "MILITARY_ACCESS" ||
          agreement.type ===
            "MILITARY_SUPPORT"
      )
      .map(
        (agreement) =>
          agreement.id
      );

  updateRuntimeWorldState(
    (current) => {
      const attacker =
        current.kingdoms[
          attackerKingdomId
        ];

      const defender =
        current.kingdoms[
          defenderKingdomId
        ];

      const updatedAgreements = {
        ...current.session
          .politics
          .agreements,
      };

      for (
        const agreementId
        of brokenAgreementIds
      ) {
        const agreement =
          updatedAgreements[
            agreementId
          ];

        if (!agreement) {
          continue;
        }

        updatedAgreements[
          agreementId
        ] = {
          ...agreement,
          status:
            "BROKEN",
        };
      }

      const attackerPenalty =
        nonAggressionBreach
          ? 50
          : 35;

      const defenderPenalty =
        nonAggressionBreach
          ? 65
          : 45;

      return {
        ...current,

        wars: {
          ...current.wars,

          [warId]: {
            id:
              warId,
            attackerRealmIds: [
              attackerKingdomId,
            ],
            defenderRealmIds: [
              defenderKingdomId,
            ],
            startedAt:
              now,
            status:
              "active",
          },
        },

        kingdoms: {
          ...current.kingdoms,

          [attackerKingdomId]: {
            ...attacker,
            relations: {
              ...attacker
                .relations,
              [defenderKingdomId]:
                Math.max(
                  -100,
                  (
                    attacker
                      .relations[
                        defenderKingdomId
                      ] ??
                    0
                  ) -
                    attackerPenalty
                ),
            },
          },

          [defenderKingdomId]: {
            ...defender,
            relations: {
              ...defender
                .relations,
              [attackerKingdomId]:
                Math.max(
                  -100,
                  (
                    defender
                      .relations[
                        attackerKingdomId
                      ] ??
                    0
                  ) -
                    defenderPenalty
                ),
            },
          },
        },

        session: {
          ...current.session,
          politics: {
            ...current.session
              .politics,
            agreements:
              updatedAgreements,
          },
        },
      };
    }
  );

  return {
    ok: true,
    warId,
    attackerKingdomId,
    defenderKingdomId,
    reason,
    brokenAgreementIds,
    nonAggressionBreach,
  };
}
