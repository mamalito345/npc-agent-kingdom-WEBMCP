import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmySoldierCount,
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  getUnitCombatStrength,
} from "@/lib/military/calculations";

import {
  getCommanderModifier,
  getMoraleModifier,
  getSupplyModifier,
  getTerrainModifier,
} from "@/lib/military/battle-modifiers";

import {
  createDeterministicRng,
  deterministicInteger,
  hashBattleSeed,
} from "@/lib/military/rng";

import {
  findDeterministicRetreatNode,
} from "@/lib/military/retreat";

import type {
  BattleOutcomeBand,
  BattleResult,
  CommanderRating,
  TerrainDefense,
  UnitBlock,
} from "@/types/military";

export interface FightArmiesInput {
  attackerArmyId:
    string;

  defenderArmyId:
    string;

  contactId?: string;

  attackerCommanderRating?:
    CommanderRating;

  defenderCommanderRating?:
    CommanderRating;

  terrain?:
    TerrainDefense;

  defenderFortificationLevel?:
    0 | 1 | 2 | 3;
}

export type FightArmiesError =
  | "ARMY_NOT_FOUND"
  | "SAME_ARMY"
  | "SAME_OWNER"
  | "ARMIES_NOT_AT_SAME_NODE"
  | "ARMY_DESTROYED"
  | "INVALID_CONTACT";

export type FightArmiesResult =
  | {
      ok: false;
      error:
        FightArmiesError;
    }
  | {
      ok: true;
      battle:
        BattleResult;
    };

function getOutcomeBand(
  powerDifference:
    number
): BattleOutcomeBand {
  if (
    powerDifference ===
    0
  ) {
    return "stalemate";
  }

  if (
    powerDifference <=
    2
  ) {
    return "narrow";
  }

  if (
    powerDifference <=
    5
  ) {
    return "clear";
  }

  if (
    powerDifference <=
    9
  ) {
    return "major";
  }

  return "rout";
}

function getCasualtyRanges(
  band:
    BattleOutcomeBand
): {
  winner:
    [number, number];
  loser:
    [number, number];
} {
  switch (band) {
    case "stalemate":
      return {
        winner: [10, 20],
        loser: [10, 20],
      };

    case "narrow":
      return {
        winner: [5, 15],
        loser: [10, 25],
      };

    case "clear":
      return {
        winner: [5, 15],
        loser: [20, 35],
      };

    case "major":
      return {
        winner: [5, 20],
        loser: [30, 50],
      };

    case "rout":
      return {
        winner: [0, 15],
        loser: [40, 70],
      };
  }
}

function getArmyBasePower(
  armyId: string
): number {
  return getArmyUnits(
    armyId
  ).reduce(
    (
      total,
      unit
    ) =>
      total +
      getUnitCombatStrength(
        unit
      ),
    0
  );
}

function applyCasualties(
  units:
    UnitBlock[],
  casualtyPercent:
    number
): {
  units:
    Record<
      string,
      UnitBlock
    >;
  soldiersLost:
    number;
} {
  const ratio =
    casualtyPercent /
    100;

  const updated:
    Record<
      string,
      UnitBlock
    > = {};

  let soldiersLost =
    0;

  for (
    const unit
    of units
  ) {
    if (
      unit.currentSoldiers <=
      0
    ) {
      updated[
        unit.id
      ] = unit;

      continue;
    }

    const loss =
      Math.min(
        unit.currentSoldiers,
        Math.round(
          unit.currentSoldiers *
            ratio
        )
      );

    soldiersLost +=
      loss;

    updated[
      unit.id
    ] = {
      ...unit,

      currentSoldiers:
        Math.max(
          0,
          unit.currentSoldiers -
            loss
        ),
    };
  }

  return {
    units:
      updated,

    soldiersLost,
  };
}

export function fightArmies(
  input:
    FightArmiesInput
): FightArmiesResult {
  if (
    input.attackerArmyId ===
    input.defenderArmyId
  ) {
    return {
      ok: false,
      error:
        "SAME_ARMY",
    };
  }

  const world =
    getRuntimeWorldState();

  const attacker =
    world.armies[
      input.attackerArmyId
    ];

  const defender =
    world.armies[
      input.defenderArmyId
    ];

  if (
    !attacker ||
    !defender
  ) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  if (
    attacker.status ===
      "destroyed" ||
    defender.status ===
      "destroyed"
  ) {
    return {
      ok: false,
      error:
        "ARMY_DESTROYED",
    };
  }

  if (
    attacker.ownerId ===
    defender.ownerId
  ) {
    return {
      ok: false,
      error:
        "SAME_OWNER",
    };
  }

  const attackerPosition =
    world.simulation
      .entityPositions[
        attacker.id
      ];

  const defenderPosition =
    world.simulation
      .entityPositions[
        defender.id
      ];

  if (
    !attackerPosition ||
    !defenderPosition ||
    attackerPosition.kind !==
      "node" ||
    defenderPosition.kind !==
      "node" ||
    attackerPosition.nodeId !==
      defenderPosition.nodeId
  ) {
    return {
      ok: false,
      error:
        "ARMIES_NOT_AT_SAME_NODE",
    };
  }

  if (
    input.contactId
  ) {
    const contact =
      world.armyContacts[
        input.contactId
      ];

    if (
      !contact ||
      contact.status !==
        "pending"
    ) {
      return {
        ok: false,
        error:
          "INVALID_CONTACT",
      };
    }
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const battleId =
    `battle-${sequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const seed =
    hashBattleSeed(
      [
        battleId,
        attacker.id,
        defender.id,
        attackerPosition
          .nodeId,
        now.toString(),
      ].join("|")
    );

  const rng =
    createDeterministicRng(
      seed
    );

  const attackerRoll =
    deterministicInteger(
      rng,
      0,
      3
    );

  const defenderRoll =
    deterministicInteger(
      rng,
      0,
      3
    );

  const attackerBase =
    getArmyBasePower(
      attacker.id
    );

  const defenderBase =
    getArmyBasePower(
      defender.id
    );

  const attackerCommander =
    getCommanderModifier(
      input
        .attackerCommanderRating ??
        "average"
    );

  const defenderCommander =
    getCommanderModifier(
      input
        .defenderCommanderRating ??
        "average"
    );

  const attackerMorale =
    getMoraleModifier(
      attacker.morale
    );

  const defenderMorale =
    getMoraleModifier(
      defender.morale
    );

  const attackerSupply =
    getSupplyModifier(
      attacker.supply
        .state
    );

  const defenderSupply =
    getSupplyModifier(
      defender.supply
        .state
    );

  const terrainModifier =
    getTerrainModifier(
      input.terrain ??
        "normal"
    );

  const fortification =
    input
      .defenderFortificationLevel ??
    0;

  const attackerPower =
    attackerBase +
    attackerCommander +
    attackerMorale +
    attackerSupply +
    attackerRoll;

  const defenderPower =
    defenderBase +
    defenderCommander +
    defenderMorale +
    defenderSupply +
    terrainModifier +
    fortification +
    defenderRoll;

  const signedDifference =
    attackerPower -
    defenderPower;

  const difference =
    Math.abs(
      signedDifference
    );

  const band =
    getOutcomeBand(
      difference
    );

  let winnerArmyId:
    string |
    undefined;

  let loserArmyId:
    string |
    undefined;

  if (
    signedDifference >
    0
  ) {
    winnerArmyId =
      attacker.id;

    loserArmyId =
      defender.id;
  } else if (
    signedDifference <
    0
  ) {
    winnerArmyId =
      defender.id;

    loserArmyId =
      attacker.id;
  }

  const casualtyRanges =
    getCasualtyRanges(
      band
    );

  let attackerCasualtyPercent:
    number;

  let defenderCasualtyPercent:
    number;

  if (!winnerArmyId) {
    attackerCasualtyPercent =
      deterministicInteger(
        rng,
        casualtyRanges
          .winner[
            0
          ],
        casualtyRanges
          .winner[
            1
          ]
      );

    defenderCasualtyPercent =
      deterministicInteger(
        rng,
        casualtyRanges
          .loser[
            0
          ],
        casualtyRanges
          .loser[
            1
          ]
      );
  } else {
    const attackerWon =
      winnerArmyId ===
      attacker.id;

    const attackerRange =
      attackerWon
        ? casualtyRanges
            .winner
        : casualtyRanges
            .loser;

    const defenderRange =
      attackerWon
        ? casualtyRanges
            .loser
        : casualtyRanges
            .winner;

    attackerCasualtyPercent =
      deterministicInteger(
        rng,
        attackerRange[
          0
        ],
        attackerRange[
          1
        ]
      );

    defenderCasualtyPercent =
      deterministicInteger(
        rng,
        defenderRange[
          0
        ],
        defenderRange[
          1
        ]
      );
  }

  const attackerBefore =
    getArmySoldierCount(
      attacker.id
    );

  const defenderBefore =
    getArmySoldierCount(
      defender.id
    );

  const attackerCasualties =
    applyCasualties(
      getArmyUnits(
        attacker.id
      ),
      attackerCasualtyPercent
    );

  const defenderCasualties =
    applyCasualties(
      getArmyUnits(
        defender.id
      ),
      defenderCasualtyPercent
    );

  const loserRetreatNode =
    loserArmyId
      ? findDeterministicRetreatNode(
          loserArmyId
        )
      : undefined;

  const attackerAfter =
    attackerBefore -
    attackerCasualties
      .soldiersLost;

  const defenderAfter =
    defenderBefore -
    defenderCasualties
      .soldiersLost;

  const result:
    BattleResult = {
    id:
      battleId,

    contactId:
      input.contactId,

    attackerArmyId:
      attacker.id,

    defenderArmyId:
      defender.id,

    nodeId:
      attackerPosition
        .nodeId,

    resolvedAt:
      now,

    band,

    winnerArmyId,

    loserArmyId,

    seed,

    retreatNodeId:
      loserRetreatNode,

    attacker: {
      armyId:
        attacker.id,

      basePower:
        attackerBase,

      commanderModifier:
        attackerCommander,

      moraleModifier:
        attackerMorale,

      supplyModifier:
        attackerSupply,

      terrainModifier:
        0,

      fortificationModifier:
        0,

      randomRoll:
        attackerRoll,

      totalPower:
        attackerPower,

      casualtyPercent:
        attackerCasualtyPercent,

      soldiersBefore:
        attackerBefore,

      soldiersLost:
        attackerCasualties
          .soldiersLost,

      soldiersAfter:
        attackerAfter,
    },

    defender: {
      armyId:
        defender.id,

      basePower:
        defenderBase,

      commanderModifier:
        defenderCommander,

      moraleModifier:
        defenderMorale,

      supplyModifier:
        defenderSupply,

      terrainModifier,

      fortificationModifier:
        fortification,

      randomRoll:
        defenderRoll,

      totalPower:
        defenderPower,

      casualtyPercent:
        defenderCasualtyPercent,

      soldiersBefore:
        defenderBefore,

      soldiersLost:
        defenderCasualties
          .soldiersLost,

      soldiersAfter:
        defenderAfter,
    },
  };

  updateRuntimeWorldState(
    (current) => {
      const contacts = {
        ...current
          .armyContacts,
      };

      if (
        input.contactId &&
        contacts[
          input.contactId
        ]
      ) {
        contacts[
          input.contactId
        ] = {
          ...contacts[
            input.contactId
          ],

          status:
            "resolved",
        };
      }

      const positions = {
        ...current
          .simulation
          .entityPositions,
      };

      if (
        loserArmyId &&
        loserRetreatNode
      ) {
        positions[
          loserArmyId
        ] = {
          kind:
            "node",

          nodeId:
            loserRetreatNode,
        };
      }

      return {
        ...current,

        unitBlocks: {
          ...current
            .unitBlocks,

          ...attackerCasualties
            .units,

          ...defenderCasualties
            .units,
        },

        armies: {
          ...current.armies,

          [attacker.id]: {
            ...current.armies[
              attacker.id
            ],

            status:
              attackerAfter <=
              0
                ? "destroyed"
                : loserArmyId ===
                  attacker.id
                  ? "retreating"
                  : "field",

            morale:
              loserArmyId ===
              attacker.id
                ? "low"
                : attacker
                    .morale,
          },

          [defender.id]: {
            ...current.armies[
              defender.id
            ],

            status:
              defenderAfter <=
              0
                ? "destroyed"
                : loserArmyId ===
                  defender.id
                  ? "retreating"
                  : "field",

            morale:
              loserArmyId ===
              defender.id
                ? "low"
                : defender
                    .morale,
          },
        },

        armyContacts:
          contacts,

        battleResults: {
          ...current
            .battleResults,

          [result.id]:
            result,
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
    battle:
      result,
  };
}