import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  Agreement,
  AgreementType,
} from "@/types/politics";

export const DEFAULT_PEACE_TRUCE_MINUTES =
  7 *
  24 *
  60;

export interface DiplomaticPairStatus {
  kingdomAId: string;
  kingdomBId: string;
  atWar: boolean;
  activeAgreementTypes:
    AgreementType[];
  militaryAccess: boolean;
  nonAggression: boolean;
  alliance: boolean;
  militarySupport: boolean;
  peaceProtected: boolean;
  peaceProtectedUntil?:
    number;
  canDeclareWar: boolean;
  declarationBlockReason?:
    "ACTIVE_PEACE_TRUCE";
}

function pairMatches(
  agreement:
    Agreement,
  kingdomAId:
    string,
  kingdomBId:
    string
): boolean {
  return (
    agreement
      .partyKingdomIds
      .includes(
        kingdomAId
      ) &&
    agreement
      .partyKingdomIds
      .includes(
        kingdomBId
      )
  );
}

export function getAgreementEffectiveExpiry(
  agreement:
    Agreement
): number | undefined {
  if (
    agreement.expiresAt !==
    undefined
  ) {
    return agreement
      .expiresAt;
  }

  if (
    agreement.type !==
    "PEACE"
  ) {
    return undefined;
  }

  return (
    agreement.respondedAt ??
    agreement.createdAt
  ) +
    DEFAULT_PEACE_TRUCE_MINUTES;
}

export function isAgreementEffectivelyActive(
  agreement:
    Agreement,
  now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes
): boolean {
  if (
    agreement.status !==
    "ACTIVE"
  ) {
    return false;
  }

  const expiresAt =
    getAgreementEffectiveExpiry(
      agreement
    );

  return (
    expiresAt ===
      undefined ||
    now <
      expiresAt
  );
}

export function getActiveAgreementsBetween(
  kingdomAId:
    string,
  kingdomBId:
    string
): Agreement[] {
  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  return Object.values(
    getRuntimeWorldState()
      .session
      .politics
      .agreements
  )
    .filter(
      (agreement) =>
        pairMatches(
          agreement,
          kingdomAId,
          kingdomBId
        ) &&
        isAgreementEffectivelyActive(
          agreement,
          now
        )
    )
    .sort(
      (a, b) =>
        a.createdAt -
          b.createdAt ||
        a.id.localeCompare(
          b.id
        )
    );
}

export function areRealmsAtWar(
  kingdomAId:
    string,
  kingdomBId:
    string
): boolean {
  return Object.values(
    getRuntimeWorldState()
      .wars
  ).some(
    (war) =>
      war.status ===
        "active" &&
      (
        (
          war
            .attackerRealmIds
            .includes(
              kingdomAId
            ) &&
          war
            .defenderRealmIds
            .includes(
              kingdomBId
            )
        ) ||
        (
          war
            .attackerRealmIds
            .includes(
              kingdomBId
            ) &&
          war
            .defenderRealmIds
            .includes(
              kingdomAId
            )
        )
      )
  );
}

export function hasDiplomaticMilitaryAccess(
  movingKingdomId:
    string,
  foreignKingdomId:
    string
): boolean {
  if (
    movingKingdomId ===
    foreignKingdomId
  ) {
    return true;
  }

  if (
    areRealmsAtWar(
      movingKingdomId,
      foreignKingdomId
    )
  ) {
    return true;
  }

  return getActiveAgreementsBetween(
    movingKingdomId,
    foreignKingdomId
  ).some(
    (agreement) =>
      agreement.type ===
        "MILITARY_ACCESS" ||
      agreement.type ===
        "ALLIANCE" ||
      agreement.type ===
        "MILITARY_SUPPORT"
  );
}

export function getPeaceProtectionUntil(
  kingdomAId:
    string,
  kingdomBId:
    string
): number | undefined {
  const peace =
    getActiveAgreementsBetween(
      kingdomAId,
      kingdomBId
    )
      .filter(
        (agreement) =>
          agreement.type ===
          "PEACE"
      )
      .map(
        getAgreementEffectiveExpiry
      )
      .filter(
        (
          value
        ): value is number =>
          value !==
          undefined
      )
      .sort(
        (a, b) =>
          b -
          a
      )[0];

  return peace;
}

export function getDiplomaticPairStatus(
  kingdomAId:
    string,
  kingdomBId:
    string
): DiplomaticPairStatus {
  const active =
    getActiveAgreementsBetween(
      kingdomAId,
      kingdomBId
    );

  const types =
    [
      ...new Set(
        active.map(
          (agreement) =>
            agreement.type
        )
      ),
    ];

  const peaceProtectedUntil =
    getPeaceProtectionUntil(
      kingdomAId,
      kingdomBId
    );

  const peaceProtected =
    peaceProtectedUntil !==
      undefined &&
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes <
      peaceProtectedUntil;

  return {
    kingdomAId,
    kingdomBId,
    atWar:
      areRealmsAtWar(
        kingdomAId,
        kingdomBId
      ),
    activeAgreementTypes:
      types,
    militaryAccess:
      hasDiplomaticMilitaryAccess(
        kingdomAId,
        kingdomBId
      ),
    nonAggression:
      types.includes(
        "NON_AGGRESSION"
      ),
    alliance:
      types.includes(
        "ALLIANCE"
      ),
    militarySupport:
      types.includes(
        "MILITARY_SUPPORT"
      ),
    peaceProtected,
    peaceProtectedUntil,
    canDeclareWar:
      !peaceProtected &&
      !areRealmsAtWar(
        kingdomAId,
        kingdomBId
      ),
    declarationBlockReason:
      peaceProtected
        ? "ACTIVE_PEACE_TRUCE"
        : undefined,
  };
}
