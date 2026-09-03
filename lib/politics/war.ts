import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

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
    }
  | {
      ok: false;
      error:
        | "KINGDOM_NOT_FOUND"
        | "CANNOT_DECLARE_WAR_ON_SELF"
        | "ALREADY_AT_WAR";
    };

export function areKingdomsAtWar(
  kingdomAId: string,
  kingdomBId: string
): boolean {
  return Object.values(
    getRuntimeWorldState()
      .wars
  ).some(
    (war) => {
      if (
        war.status !==
        "active"
      ) {
        return false;
      }

      const aAttacksB =
        war.attackerRealmIds
          .includes(
            kingdomAId
          ) &&
        war.defenderRealmIds
          .includes(
            kingdomBId
          );

      const bAttacksA =
        war.attackerRealmIds
          .includes(
            kingdomBId
          ) &&
        war.defenderRealmIds
          .includes(
            kingdomAId
          );

      return (
        aAttacksB ||
        bAttacksA
      );
    }
  );
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

  if (
    areKingdomsAtWar(
      attackerKingdomId,
      defenderKingdomId
    )
  ) {
    return {
      ok: false,
      error:
        "ALREADY_AT_WAR",
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

  const latest =
    getRuntimeWorldState();

  const agreements =
    latest.session
      .politics
      .agreements;

  const brokenAgreementIds =
    Object.values(
      agreements
    )
      .filter(
        (agreement) =>
          agreement.status ===
            "ACTIVE" &&
          agreement
            .partyKingdomIds
            .includes(
              attackerKingdomId
            ) &&
          agreement
            .partyKingdomIds
            .includes(
              defenderKingdomId
            ) &&
          (
            agreement.type ===
              "NON_AGGRESSION" ||
            agreement.type ===
              "PEACE" ||
            agreement.type ===
              "ALLIANCE" ||
            agreement.type ===
              "MILITARY_SUPPORT"
          )
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

      const updatedAgreements =
        {
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
                    35
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
                    45
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
  };
}
