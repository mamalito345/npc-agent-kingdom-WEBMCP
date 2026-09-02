import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  Army,
} from "@/types/military";

export type SplitArmyError =
  | "ARMY_NOT_FOUND"
  | "ARMY_NOT_AT_NODE"
  | "ARMY_MOVING"
  | "ARMY_IN_BATTLE"
  | "INVALID_UNIT_SELECTION"
  | "CANNOT_SPLIT_ALL_UNITS";

export type SplitArmyResult =
  | {
      ok: false;
      error:
        SplitArmyError;
    }
  | {
      ok: true;
      newArmyId: string;
    };

export function splitArmy(
  armyId: string,
  unitIds: string[]
): SplitArmyResult {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  if (
    world.simulation
      .activeMovements[
        armyId
      ]
  ) {
    return {
      ok: false,
      error:
        "ARMY_MOVING",
    };
  }

  const position =
    world.simulation
      .entityPositions[
        armyId
      ];

  if (
    !position ||
    position.kind !==
      "node"
  ) {
    return {
      ok: false,
      error:
        "ARMY_NOT_AT_NODE",
    };
  }

  if (
    army.status ===
    "battle"
  ) {
    return {
      ok: false,
      error:
        "ARMY_IN_BATTLE",
    };
  }

  const uniqueIds =
    [...new Set(
      unitIds
    )];

  if (
    uniqueIds.length ===
      0 ||
    uniqueIds.some(
      (unitId) =>
        !army.unitIds
          .includes(
            unitId
          )
    )
  ) {
    return {
      ok: false,
      error:
        "INVALID_UNIT_SELECTION",
    };
  }

  if (
    uniqueIds.length >=
    army.unitIds.length
  ) {
    return {
      ok: false,
      error:
        "CANNOT_SPLIT_ALL_UNITS",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const newArmyId =
    `army-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const newArmy:
    Army = {
    id:
      newArmyId,

    ownerId:
      army.ownerId,

    commanderId:
      army.commanderId,

    unitIds:
      uniqueIds,

    morale:
      army.morale,

    supply: {
      foodSupply: 0,

      state:
        army.supply.state,
    },

    funding: {
      unpaidDays:
        army.funding
          .unpaidDays,

      state:
        army.funding.state,
    },

    status:
      army.status,
  };

  updateRuntimeWorldState(
    (current) => {
      const source =
        current.armies[
          armyId
        ];

      const kingdom =
        current.kingdoms[
          army.ownerId
        ];

      return {
        ...current,

        armies: {
          ...current.armies,

          [armyId]: {
            ...source,

            unitIds:
              source.unitIds
                .filter(
                  (unitId) =>
                    !uniqueIds
                      .includes(
                        unitId
                      )
                ),
          },

          [newArmyId]:
            newArmy,
        },

        kingdoms: {
          ...current.kingdoms,

          [army.ownerId]: {
            ...kingdom,

            armyIds: [
              ...kingdom
                .armyIds,

              newArmyId,
            ],
          },
        },

        simulation: {
          ...current.simulation,

          entityPositions: {
            ...current
              .simulation
              .entityPositions,

            [newArmyId]: {
              kind:
                "node",

              nodeId:
                position.nodeId,
            },
          },
        },
      };
    }
  );

  return {
    ok: true,

    newArmyId,
  };
}

export type MergeArmiesError =
  | "ARMY_NOT_FOUND"
  | "SAME_ARMY"
  | "ARMY_MOVING"
  | "ARMY_IN_BATTLE"
  | "NOT_SAME_OWNER"
  | "NOT_SAME_NODE";

export type MergeArmiesResult =
  | {
      ok: false;
      error:
        MergeArmiesError;
    }
  | {
      ok: true;
      armyId: string;
    };

export function mergeArmies(
  targetArmyId: string,
  sourceArmyId: string
): MergeArmiesResult {
  if (
    targetArmyId ===
    sourceArmyId
  ) {
    return {
      ok: false,
      error:
        "SAME_ARMY",
    };
  }

  const world =
    getRuntimeWorldState();

  const target =
    world.armies[
      targetArmyId
    ];

  const source =
    world.armies[
      sourceArmyId
    ];

  if (
    !target ||
    !source
  ) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  if (
    world.simulation
      .activeMovements[
        targetArmyId
      ] ||
    world.simulation
      .activeMovements[
        sourceArmyId
      ]
  ) {
    return {
      ok: false,
      error:
        "ARMY_MOVING",
    };
  }

  if (
    target.status ===
      "battle" ||
    source.status ===
      "battle"
  ) {
    return {
      ok: false,
      error:
        "ARMY_IN_BATTLE",
    };
  }

  if (
    target.ownerId !==
    source.ownerId
  ) {
    return {
      ok: false,
      error:
        "NOT_SAME_OWNER",
    };
  }

  const targetPosition =
    world.simulation
      .entityPositions[
        targetArmyId
      ];

  const sourcePosition =
    world.simulation
      .entityPositions[
        sourceArmyId
      ];

  if (
    !targetPosition ||
    !sourcePosition ||
    targetPosition.kind !==
      "node" ||
    sourcePosition.kind !==
      "node" ||
    targetPosition.nodeId !==
      sourcePosition.nodeId
  ) {
    return {
      ok: false,
      error:
        "NOT_SAME_NODE",
    };
  }

  updateRuntimeWorldState(
    (current) => {
      const armies = {
        ...current.armies,
      };

      armies[
        targetArmyId
      ] = {
        ...armies[
          targetArmyId
        ],

        unitIds: [
          ...armies[
            targetArmyId
          ].unitIds,

          ...armies[
            sourceArmyId
          ].unitIds,
        ],

        supply: {
          foodSupply:
            armies[
              targetArmyId
            ].supply
              .foodSupply +
            armies[
              sourceArmyId
            ].supply
              .foodSupply,

          state:
            armies[
              targetArmyId
            ].supply.state,
        },
      };

      delete armies[
        sourceArmyId
      ];

      const positions = {
        ...current
          .simulation
          .entityPositions,
      };

      delete positions[
        sourceArmyId
      ];

      const kingdom =
        current.kingdoms[
          target.ownerId
        ];

      return {
        ...current,

        armies,

        kingdoms: {
          ...current.kingdoms,

          [target.ownerId]: {
            ...kingdom,

            armyIds:
              kingdom.armyIds
                .filter(
                  (id) =>
                    id !==
                    sourceArmyId
                ),
          },
        },

        simulation: {
          ...current.simulation,

          entityPositions:
            positions,
        },
      };
    }
  );

  return {
    ok: true,

    armyId:
      targetArmyId,
  };
}