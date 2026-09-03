import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getConnectedEdges,
  getOtherNodeId,
} from "@/lib/map/graph";

import {
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  getUnitCombatStrength,
} from "@/lib/military/calculations";

import {
  getMoraleModifier,
  getSupplyModifier,
  getCommanderModifier,
  getBattleTerrainDefense,
  getTerrainModifier,
} from "@/lib/military/battle-modifiers";

import {
  getArmyCommanderRating,
} from "@/lib/military/commander-rating";

import {
  getMapNode,
} from "@/lib/map/graph";

import type {
  BattleOrder,
  PersistentBattle,
} from "@/types/military";

export type BattleSide =
  | "attacker"
  | "defender";

export interface BattleArmyPower {
  armyId:
    string;
  basePower:
    number;
  supportPower:
    number;
  moraleModifier:
    number;
  supplyModifier:
    number;
  commanderModifier:
    number;
  terrainModifier:
    number;
  reserveMultiplier:
    number;
  effectivePower:
    number;
}

export interface BattleSidePower {
  side:
    BattleSide;
  armyIds:
    string[];
  order?:
    BattleOrder;
  armyPowers:
    BattleArmyPower[];
  rawPower:
    number;
  orderMultiplier:
    number;
  convergentAssaultMultiplier:
    number;
  totalPower:
    number;
}

export function getBattleSideForArmy(
  battle:
    PersistentBattle,
  armyId:
    string
): BattleSide | undefined {
  if (
    battle.attackerArmyIds
      .includes(
        armyId
      )
  ) {
    return "attacker";
  }

  if (
    battle.defenderArmyIds
      .includes(
        armyId
      )
  ) {
    return "defender";
  }

  return undefined;
}

export function getBattleSideArmyIds(
  battle:
    PersistentBattle,
  side:
    BattleSide
): string[] {
  return side ===
    "attacker"
    ? battle
        .attackerArmyIds
    : battle
        .defenderArmyIds;
}

export function getLatestBattleOrderForSide(
  battle:
    PersistentBattle,
  side:
    BattleSide
): BattleOrder | undefined {
  return [
    ...battle.activeOrders,
  ]
    .filter(
      (order) =>
        getBattleSideForArmy(
          battle,
          order.armyId
        ) === side
    )
    .sort(
      (a, b) =>
        b.issuedAt -
          a.issuedAt ||
        b.id.localeCompare(
          a.id
        )
    )[0];
}

export function sideHasBattleOrder(
  battle:
    PersistentBattle,
  side:
    BattleSide
): boolean {
  return (
    getLatestBattleOrderForSide(
      battle,
      side
    ) !== undefined
  );
}

function getArmyBasePower(
  armyId:
    string
): number {
  return getArmyUnits(
    armyId
  ).reduce(
    (total, unit) =>
      total +
      getUnitCombatStrength(
        unit
      ),
    0
  );
}

function getReserveMultiplier(
  armyIndex:
    number,
  reserveCommitted:
    boolean,
  convergingFromDifferentDirection:
    boolean
): number {
  if (
    armyIndex ===
    0
  ) {
    return 1;
  }

  /*
   * An army that visibly marched in from a different strategic node than
   * the side's lead army is a genuine pincer force, not a reserve being
   * held back — it should fight at full strength immediately.
   */
  if (
    convergingFromDifferentDirection
  ) {
    return 1;
  }

  if (
    reserveCommitted
  ) {
    return 1;
  }

  return 0.5;
}

/**
 * A side whose armies visibly approached the battle node from two or
 * more different strategic nodes is attacking (or reinforcing) from
 * multiple directions at once. The defender cannot fully concentrate
 * against every axis, so the whole side gets a modest combined-power
 * bonus on top of each individual army's own strength.
 */
function getConvergentAssaultMultiplier(
  armyIds:
    string[]
): number {
  const world =
    getRuntimeWorldState();

  const directions =
    new Set<
      string
    >();

  for (
    const armyId
    of armyIds
  ) {
    const direction =
      world.armies[
        armyId
      ]
        ?.arrivedFromNodeId;

    if (
      direction
    ) {
      directions.add(
        direction
      );
    }
  }

  if (
    directions.size >=
    3
  ) {
    return 1.18;
  }

  if (
    directions.size >=
    2
  ) {
    return 1.1;
  }

  return 1;
}

function getOrderMultiplier(
  side:
    BattleSide,
  order?:
    BattleOrder
): number {
  if (!order) {
    return 1;
  }

  switch (
    order.type
  ) {
    case "hold_position":
      return side ===
        "defender"
        ? 1.12
        : 0.95;

    case "commit_reserve":
      return 1.05;

    case "press_attack":
      return 1.15;

    case "order_retreat":
      return 0.6;
  }
}

function nodeIsBattleAdjacent(
  armyNodeId:
    string,
  battleNodeId:
    string
): boolean {
  if (
    armyNodeId ===
    battleNodeId
  ) {
    return true;
  }

  return getConnectedEdges(
    battleNodeId
  ).some(
    (edge) =>
      getOtherNodeId(
        edge,
        battleNodeId
      ) ===
      armyNodeId
  );
}

function getAdjacentSupportPower(
  battle:
    PersistentBattle,
  targetArmyId:
    string
): number {
  const world =
    getRuntimeWorldState();

  const target =
    world.armies[
      targetArmyId
    ];

  if (!target) {
    return 0;
  }

  return Object.values(
    world.armies
  )
    .filter(
      (army) =>
        army.id !==
          targetArmyId &&
        army.ownerId ===
          target.ownerId &&
        army.supportTargetArmyId ===
          targetArmyId &&
        army.status !==
          "destroyed" &&
        army.status !==
          "battle" &&
        world.simulation
          .activeMovements[
            army.id
          ] ===
          undefined
    )
    .reduce(
      (
        total,
        supporter
      ) => {
        const position =
          world.simulation
            .entityPositions[
              supporter.id
            ];

        if (
          !position ||
          position.kind !==
            "node" ||
          !nodeIsBattleAdjacent(
            position.nodeId,
            battle.nodeId
          )
        ) {
          return total;
        }

        /*
         * Adjacent support is meaningful but remains secondary to physically
         * committed battle armies. The support army contributes 30% of its
         * base combat strength while it stays stationary on the battle node
         * or one directly connected strategic node.
         */
        return (
          total +
          getArmyBasePower(
            supporter.id
          ) *
            0.3
        );
      },
      0
    );
}

export function calculateBattleSidePower(
  battle:
    PersistentBattle,
  side:
    BattleSide
): BattleSidePower {
  const world =
    getRuntimeWorldState();

  const armyIds =
    getBattleSideArmyIds(
      battle,
      side
    ).filter(
      (armyId) => {
        const army =
          world.armies[
            armyId
          ];

        return (
          army !==
            undefined &&
          army.status !==
            "destroyed"
        );
      }
    );

  const order =
    getLatestBattleOrderForSide(
      battle,
      side
    );

  const reserveCommitted =
    side ===
      "attacker"
      ? battle
          .attackerReserveCommitted
      : battle
          .defenderReserveCommitted;

  const leadArmyDirection =
    armyIds.length >
    0
      ? world.armies[
          armyIds[0]
        ]
          ?.arrivedFromNodeId
      : undefined;

  const battleNodeTerrain =
    getMapNode(
      battle.nodeId
    )?.terrain ??
    "plains";

  // Only the side actually standing on/holding the ground benefits from
  // its terrain -- an attacker marching in to assault a mountain fort
  // does not get the mountain's protection, the defender does.
  const terrainModifierForSide =
    side ===
    "defender"
      ? getTerrainModifier(
          getBattleTerrainDefense(
            battleNodeTerrain
          )
        )
      : 0;

  const armyPowers =
    armyIds.map(
      (
        armyId,
        armyIndex
      ): BattleArmyPower => {
        const army =
          world.armies[
            armyId
          ];

        if (!army) {
          throw new Error(
            `Battle army not found: ${armyId}`
          );
        }

        const basePower =
          getArmyBasePower(
            armyId
          );

        const supportPower =
          getAdjacentSupportPower(
            battle,
            armyId
          );

        const moraleModifier =
          getMoraleModifier(
            army.morale
          );

        const supplyModifier =
          getSupplyModifier(
            army.supply.state
          );

        const commanderModifier =
          getCommanderModifier(
            getArmyCommanderRating(
              armyId
            )
          );

        const terrainModifier =
          terrainModifierForSide;

        const convergingFromDifferentDirection =
          Boolean(
            army.arrivedFromNodeId &&
            leadArmyDirection &&
            army.arrivedFromNodeId !==
              leadArmyDirection
          );

        const reserveMultiplier =
          getReserveMultiplier(
            armyIndex,
            reserveCommitted,
            convergingFromDifferentDirection
          );

        const operationalPower =
          Math.max(
            0,
            basePower +
              supportPower +
              moraleModifier +
              supplyModifier +
              commanderModifier +
              terrainModifier
          );

        return {
          armyId,
          basePower,
          supportPower,
          moraleModifier,
          supplyModifier,
          commanderModifier,
          terrainModifier,
          reserveMultiplier,
          effectivePower:
            operationalPower *
            reserveMultiplier,
        };
      }
    );

  const rawPower =
    armyPowers.reduce(
      (total, army) =>
        total +
        army.effectivePower,
      0
    );

  const orderMultiplier =
    getOrderMultiplier(
      side,
      order
    );

  const convergentAssaultMultiplier =
    getConvergentAssaultMultiplier(
      armyIds
    );

  return {
    side,
    armyIds,
    order,
    armyPowers,
    rawPower,
    orderMultiplier,
    convergentAssaultMultiplier,
    totalPower:
      rawPower *
      orderMultiplier *
      convergentAssaultMultiplier,
  };
}
