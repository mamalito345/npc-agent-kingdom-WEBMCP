import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  War,
} from "@/types/military";

export type StartWarError =
  | "REALM_NOT_FOUND"
  | "SAME_REALM";

export type StartWarResult =
  | {
      ok: true;
      war: War;
      created: boolean;
    }
  | {
      ok: false;
      error: StartWarError;
    };

export function getWar(
  warId: string
): War | undefined {
  return getRuntimeWorldState()
    .wars[
      warId
    ];
}

export function getActiveWars():
  War[] {
  return Object.values(
    getRuntimeWorldState()
      .wars
  )
    .filter(
      (war) =>
        war.status ===
        "active"
    )
    .sort(
      (a, b) =>
        a.startedAt -
          b.startedAt ||
        a.id.localeCompare(
          b.id
        )
    );
}

export function findActiveWarBetweenRealms(
  realmAId: string,
  realmBId: string
): War | undefined {
  return getActiveWars().find(
    (war) => {
      const aAttacker =
        war.attackerRealmIds.includes(
          realmAId
        );

      const aDefender =
        war.defenderRealmIds.includes(
          realmAId
        );

      const bAttacker =
        war.attackerRealmIds.includes(
          realmBId
        );

      const bDefender =
        war.defenderRealmIds.includes(
          realmBId
        );

      return (
        (
          aAttacker &&
          bDefender
        ) ||
        (
          aDefender &&
          bAttacker
        )
      );
    }
  );
}

export function startWar(
  attackerRealmId: string,
  defenderRealmId: string
): StartWarResult {
  if (
    attackerRealmId ===
    defenderRealmId
  ) {
    return {
      ok: false,
      error: "SAME_REALM",
    };
  }

  const world =
    getRuntimeWorldState();

  if (
    !world.kingdoms[
      attackerRealmId
    ] ||
    !world.kingdoms[
      defenderRealmId
    ]
  ) {
    return {
      ok: false,
      error:
        "REALM_NOT_FOUND",
    };
  }

  const existing =
    findActiveWarBetweenRealms(
      attackerRealmId,
      defenderRealmId
    );

  if (existing) {
    return {
      ok: true,
      war: existing,
      created: false,
    };
  }

  const sequence =
    allocateSimulationSequence();

  const current =
    getRuntimeWorldState();

  const war: War = {
    id:
      `war-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    attackerRealmIds: [
      attackerRealmId,
    ],

    defenderRealmIds: [
      defenderRealmId,
    ],

    startedAt:
      current.simulation
        .worldTimeMinutes,

    status:
      "active",
  };

  updateRuntimeWorldState(
    (state) => ({
      ...state,

      wars: {
        ...state.wars,

        [war.id]:
          war,
      },
    })
  );

  return {
    ok: true,
    war,
    created: true,
  };
}

export function ensureActiveWarBetweenRealms(
  attackerRealmId: string,
  defenderRealmId: string
): War {
  const existing =
    findActiveWarBetweenRealms(
      attackerRealmId,
      defenderRealmId
    );

  if (existing) {
    return existing;
  }

  const result =
    startWar(
      attackerRealmId,
      defenderRealmId
    );

  if (!result.ok) {
    throw new Error(
      `Could not create war: ${result.error}`
    );
  }

  return result.war;
}