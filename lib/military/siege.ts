import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  findActiveWarBetweenRealms,
} from "@/lib/military/war";

import type {
  PersistentSiege,
  SiegePhase,
} from "@/types/military";

import type {
  WorldMinute,
} from "@/types/simulation";

const SIEGE_PHASE_DURATION: Record<
  Exclude<
    SiegePhase,
    "ended"
  >,
  number
> = {
  encirclement: 360,
  bombardment: 720,
  breach: 360,
};

export interface StartSiegeInput {
  armyId: string;

  settlementId: string;
}

export type StartSiegeError =
  | "ARMY_NOT_FOUND"
  | "SETTLEMENT_NOT_FOUND"
  | "ARMY_DESTROYED"
  | "ARMY_NOT_AT_SETTLEMENT"
  | "FRIENDLY_SETTLEMENT"
  | "NO_FORTIFICATION"
  | "NO_ACTIVE_WAR"
  | "ARMY_ALREADY_BUSY"
  | "SIEGE_ALREADY_ACTIVE";

export type StartSiegeResult =
  | {
      ok: true;
      siege:
        PersistentSiege;
    }
  | {
      ok: false;
      error:
        StartSiegeError;
    };

function getSettlementController(
  settlementId: string
): string | undefined {
  const settlement =
    getRuntimeWorldState()
      .settlements[
        settlementId
      ];

  if (!settlement) {
    return undefined;
  }

  return (
    settlement
      .controllerKingdomId ??
    settlement.kingdomId
  );
}

function getFortificationIntegrity(
  settlementId: string
): number {
  const settlement =
    getRuntimeWorldState()
      .settlements[
        settlementId
      ];

  if (!settlement) {
    return 0;
  }

  const level =
    settlement
      .fortificationLevel ??
    0;

  if (level <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      settlement
        .fortificationIntegrity ??
        100
    )
  );
}

function armyAlreadyInActiveSiege(
  armyId: string
): boolean {
  return Object.values(
    getRuntimeWorldState()
      .sieges
  ).some(
    (siege) =>
      siege.status ===
        "active" &&
      siege.attackerArmyIds.includes(
        armyId
      )
  );
}

function getActiveSiegeAtSettlement(
  settlementId: string
): PersistentSiege | undefined {
  return Object.values(
    getRuntimeWorldState()
      .sieges
  )
    .filter(
      (siege) =>
        siege.status ===
          "active" &&
        siege.settlementId ===
          settlementId
    )
    .sort(
      (a, b) =>
        a.startedAt -
          b.startedAt ||
        a.id.localeCompare(
          b.id
        )
    )[0];
}

function getSiegeUnitCount(
  siege:
    PersistentSiege
): number {
  const world =
    getRuntimeWorldState();

  let count = 0;

  for (
    const armyId
    of siege.attackerArmyIds
  ) {
    const army =
      world.armies[
        armyId
      ];

    if (!army) {
      continue;
    }

    for (
      const unitId
      of army.unitIds
    ) {
      const unit =
        world.unitBlocks[
          unitId
        ];

      if (
        unit &&
        unit.type ===
          "siege" &&
        unit.currentSoldiers >
          0
      ) {
        count += 1;
      }
    }
  }

  return count;
}

function calculateFortificationDamage(
  siege:
    PersistentSiege,
  phase:
    "bombardment" |
    "breach"
): number {
  const siegeUnits =
    getSiegeUnitCount(
      siege
    );

  if (
    phase ===
    "bombardment"
  ) {
    return Math.min(
      45,
      5 +
        siegeUnits *
          20
    );
  }

  return Math.min(
    60,
    10 +
      siegeUnits *
        25
  );
}

function appendSiegeHistory(
  siegeId: string,
  worldTime:
    WorldMinute,
  type:
    PersistentSiege[
      "history"
    ][number]["type"],
  summary: string
): void {
  updateRuntimeWorldState(
    (current) => {
      const siege =
        current.sieges[
          siegeId
        ];

      if (!siege) {
        return current;
      }

      return {
        ...current,

        sieges: {
          ...current.sieges,

          [siegeId]: {
            ...siege,

            history: [
              ...siege.history,

              {
                id:
                  `${siegeId}-history-${(
                    siege
                      .history
                      .length +
                    1
                  )
                    .toString()
                    .padStart(
                      3,
                      "0"
                    )}`,

                timestamp:
                  worldTime,

                type,

                summary,
              },
            ],
          },
        },
      };
    }
  );
}

function damageFortification(
  siegeId: string,
  phase:
    "bombardment" |
    "breach",
  worldTime:
    WorldMinute
): number {
  const world =
    getRuntimeWorldState();

  const siege =
    world.sieges[
      siegeId
    ];

  if (!siege) {
    return 0;
  }

  const settlement =
    world.settlements[
      siege.settlementId
    ];

  if (!settlement) {
    return 0;
  }

  const before =
    getFortificationIntegrity(
      siege.settlementId
    );

  const damage =
    calculateFortificationDamage(
      siege,
      phase
    );

  const after =
    Math.max(
      0,
      before -
        damage
    );

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      settlements: {
        ...current.settlements,

        [siege.settlementId]: {
          ...current.settlements[
            siege.settlementId
          ],

          fortificationIntegrity:
            after,
        },
      },
    })
  );

  appendSiegeHistory(
    siegeId,
    worldTime,
    "fortification_damaged",
    `Fortification damaged during ${phase}. Integrity ${before} -> ${after}.`
  );

  return after;
}

function endSiegeBreached(
  siegeId: string,
  worldTime:
    WorldMinute
): void {
  updateRuntimeWorldState(
    (current) => {
      const siege =
        current.sieges[
          siegeId
        ];

      if (!siege) {
        return current;
      }

      const armies = {
        ...current.armies,
      };

      for (
        const armyId
        of siege.attackerArmyIds
      ) {
        const army =
          armies[
            armyId
          ];

        if (
          army &&
          army.status ===
            "siege"
        ) {
          armies[
            armyId
          ] = {
            ...army,

            status:
              "field",
          };
        }
      }

      return {
        ...current,

        armies,

        sieges: {
          ...current.sieges,

          [siegeId]: {
            ...siege,

            currentPhase:
              "ended",

            nextPhaseAt:
              undefined,

            status:
              "ended",

            outcome:
              "breached",

            history: [
              ...siege.history,

              {
                id:
                  `${siegeId}-history-${(
                    siege
                      .history
                      .length +
                    1
                  )
                    .toString()
                    .padStart(
                      3,
                      "0"
                    )}`,

                timestamp:
                  worldTime,

                type:
                  "siege_ended",

                summary:
                  "Siege ended after the fortification was breached.",
              },
            ],
          },
        },
      };
    }
  );
}

export function liftSiege(
  siegeId: string
):
  | {
      ok: true;
    }
  | {
      ok: false;
      error:
        "SIEGE_NOT_FOUND" |
        "SIEGE_NOT_ACTIVE";
    } {
  const world =
    getRuntimeWorldState();

  const siege =
    world.sieges[
      siegeId
    ];

  if (!siege) {
    return {
      ok: false,
      error:
        "SIEGE_NOT_FOUND",
    };
  }

  if (
    siege.status !==
    "active"
  ) {
    return {
      ok: false,
      error:
        "SIEGE_NOT_ACTIVE",
    };
  }

  const now =
    world.simulation
      .worldTimeMinutes;

  updateRuntimeWorldState(
    (current) => {
      const latest =
        current.sieges[
          siegeId
        ];

      if (!latest) {
        return current;
      }

      const armies = {
        ...current.armies,
      };

      for (
        const armyId
        of latest.attackerArmyIds
      ) {
        const army =
          armies[
            armyId
          ];

        if (
          army &&
          army.status ===
            "siege"
        ) {
          armies[
            armyId
          ] = {
            ...army,

            status:
              "field",
          };
        }
      }

      return {
        ...current,

        armies,

        sieges: {
          ...current.sieges,

          [siegeId]: {
            ...latest,

            currentPhase:
              "ended",

            nextPhaseAt:
              undefined,

            status:
              "ended",

            outcome:
              "lifted",

            history: [
              ...latest.history,

              {
                id:
                  `${siegeId}-history-${(
                    latest
                      .history
                      .length +
                    1
                  )
                    .toString()
                    .padStart(
                      3,
                      "0"
                    )}`,

                timestamp:
                  now,

                type:
                  "siege_ended",

                summary:
                  "Siege was lifted.",
              },
            ],
          },
        },
      };
    }
  );

  return {
    ok: true,
  };
}

export function startSiege(
  input:
    StartSiegeInput
): StartSiegeResult {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      input.armyId
    ];

  if (!army) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  const settlement =
    world.settlements[
      input.settlementId
    ];

  if (!settlement) {
    return {
      ok: false,
      error:
        "SETTLEMENT_NOT_FOUND",
    };
  }

  if (
    army.status ===
    "destroyed"
  ) {
    return {
      ok: false,
      error:
        "ARMY_DESTROYED",
    };
  }

  if (
    army.status ===
      "battle" ||
    army.status ===
      "siege"
  ) {
    return {
      ok: false,
      error:
        "ARMY_ALREADY_BUSY",
    };
  }

  if (
    armyAlreadyInActiveSiege(
      army.id
    )
  ) {
    return {
      ok: false,
      error:
        "ARMY_ALREADY_BUSY",
    };
  }

  if (
    getActiveSiegeAtSettlement(
      settlement.id
    )
  ) {
    return {
      ok: false,
      error:
        "SIEGE_ALREADY_ACTIVE",
    };
  }

  const position =
    world.simulation
      .entityPositions[
        army.id
      ];

  if (
    !position ||
    position.kind !==
      "node" ||
    position.nodeId !==
      settlement.locationId
  ) {
    return {
      ok: false,
      error:
        "ARMY_NOT_AT_SETTLEMENT",
    };
  }

  const defenderRealmId =
    getSettlementController(
      settlement.id
    );

  if (
    !defenderRealmId ||
    defenderRealmId ===
      army.ownerId
  ) {
    return {
      ok: false,
      error:
        "FRIENDLY_SETTLEMENT",
    };
  }

  const level =
    settlement
      .fortificationLevel ??
    0;

  const integrity =
    getFortificationIntegrity(
      settlement.id
    );

  if (
    level <= 0 ||
    integrity <= 0
  ) {
    return {
      ok: false,
      error:
        "NO_FORTIFICATION",
    };
  }

  const war =
    findActiveWarBetweenRealms(
      army.ownerId,
      defenderRealmId
    );

  if (!war) {
    return {
      ok: false,
      error:
        "NO_ACTIVE_WAR",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const current =
    getRuntimeWorldState();

  const now =
    current.simulation
      .worldTimeMinutes;

  const siege:
    PersistentSiege = {
    id:
      `siege-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    warId:
      war.id,

    settlementId:
      settlement.id,

    attackerArmyIds: [
      army.id,
    ],

    defenderRealmId,

    startedAt:
      now,

    currentPhase:
      "encirclement",

    nextPhaseAt:
      now +
      SIEGE_PHASE_DURATION
        .encirclement,

    status:
      "active",

    fortificationIntegrityAtStart:
      integrity,

    history: [
      {
        id:
          `siege-history-${sequence
            .toString()
            .padStart(
              6,
              "0"
            )}-001`,

        timestamp:
          now,

        type:
          "siege_started",

        summary:
          `Siege started against ${settlement.id} during war ${war.id}.`,
      },
    ],
  };

  updateRuntimeWorldState(
    (state) => ({
      ...state,

      armies: {
        ...state.armies,

        [army.id]: {
          ...state.armies[
            army.id
          ],

          status:
            "siege",
        },
      },

      sieges: {
        ...state.sieges,

        [siege.id]:
          siege,
      },
    })
  );

  return {
    ok: true,
    siege,
  };
}

export function getNextSiegeBoundary():
  WorldMinute | undefined {
  return Object.values(
    getRuntimeWorldState()
      .sieges
  )
    .filter(
      (siege) =>
        siege.status ===
          "active" &&
        siege.nextPhaseAt !==
          undefined
    )
    .sort(
      (a, b) =>
        (
          a.nextPhaseAt ??
          Infinity
        ) -
          (
            b.nextPhaseAt ??
            Infinity
          ) ||
        a.id.localeCompare(
          b.id
        )
    )[0]
    ?.nextPhaseAt;
}

function moveSiegeToPhase(
  siegeId: string,
  phase:
    SiegePhase,
  worldTime:
    WorldMinute
): void {
  updateRuntimeWorldState(
    (current) => {
      const siege =
        current.sieges[
          siegeId
        ];

      if (!siege) {
        return current;
      }

      return {
        ...current,

        sieges: {
          ...current.sieges,

          [siegeId]: {
            ...siege,

            currentPhase:
              phase,

            nextPhaseAt:
              phase ===
                "ended"
                ? undefined
                : worldTime +
                  SIEGE_PHASE_DURATION[
                    phase
                  ],

            history: [
              ...siege.history,

              {
                id:
                  `${siegeId}-history-${(
                    siege
                      .history
                      .length +
                    1
                  )
                    .toString()
                    .padStart(
                      3,
                      "0"
                    )}`,

                timestamp:
                  worldTime,

                type:
                  "phase_changed",

                summary:
                  `Siege phase changed to ${phase}.`,
              },
            ],
          },
        },
      };
    }
  );
}

export function processSieges(
  worldTime:
    WorldMinute
): void {
  const due =
    Object.values(
      getRuntimeWorldState()
        .sieges
    )
      .filter(
        (siege) =>
          siege.status ===
            "active" &&
          siege.nextPhaseAt !==
            undefined &&
          siege.nextPhaseAt <=
            worldTime
      )
      .sort(
        (a, b) =>
          (
            a.nextPhaseAt ??
            Infinity
          ) -
            (
              b.nextPhaseAt ??
              Infinity
            ) ||
          a.id.localeCompare(
            b.id
          )
      );

  for (
    const snapshot
    of due
  ) {
    const siege =
      getRuntimeWorldState()
        .sieges[
          snapshot.id
        ];

    if (
      !siege ||
      siege.status !==
        "active"
    ) {
      continue;
    }

    if (
      siege.currentPhase ===
      "encirclement"
    ) {
      moveSiegeToPhase(
        siege.id,
        "bombardment",
        worldTime
      );

      const integrity =
        damageFortification(
          siege.id,
          "bombardment",
          worldTime
        );

      if (
        integrity <= 0
      ) {
        endSiegeBreached(
          siege.id,
          worldTime
        );
      }

      continue;
    }

    if (
      siege.currentPhase ===
      "bombardment"
    ) {
      moveSiegeToPhase(
        siege.id,
        "breach",
        worldTime
      );

      const integrity =
        damageFortification(
          siege.id,
          "breach",
          worldTime
        );

      if (
        integrity <= 0
      ) {
        endSiegeBreached(
          siege.id,
          worldTime
        );
      }

      continue;
    }

    if (
      siege.currentPhase ===
      "breach"
    ) {
      //
      // The fortification survived
      // the current siege cycle.
      //
      // We cycle back to bombardment
      // instead of resolving instantly.
      //
      moveSiegeToPhase(
        siege.id,
        "bombardment",
        worldTime
      );

      const integrity =
        damageFortification(
          siege.id,
          "bombardment",
          worldTime
        );

      if (
        integrity <= 0
      ) {
        endSiegeBreached(
          siege.id,
          worldTime
        );
      }
    }
  }
}