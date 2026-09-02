import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  getUnitCombatStrength,
} from "@/lib/military/calculations";

import {
  getMoraleModifier,
  getSupplyModifier,
} from "@/lib/military/battle-modifiers";

import type {
  BattleOrder,
  PersistentBattle,
} from "@/types/military";

export type BattleSide =
  | "attacker"
  | "defender";

export interface BattleArmyPower {
  armyId: string;

  basePower: number;

  moraleModifier: number;

  supplyModifier: number;

  reserveMultiplier: number;

  effectivePower: number;
}

export interface BattleSidePower {
  side: BattleSide;

  armyIds: string[];

  order?: BattleOrder;

  armyPowers:
    BattleArmyPower[];

  rawPower: number;

  orderMultiplier: number;

  totalPower: number;
}

export function getBattleSideForArmy(
  battle: PersistentBattle,
  armyId: string
): BattleSide | undefined {
  if (
    battle.attackerArmyIds.includes(
      armyId
    )
  ) {
    return "attacker";
  }

  if (
    battle.defenderArmyIds.includes(
      armyId
    )
  ) {
    return "defender";
  }

  return undefined;
}

export function getBattleSideArmyIds(
  battle: PersistentBattle,
  side: BattleSide
): string[] {
  return side === "attacker"
    ? battle.attackerArmyIds
    : battle.defenderArmyIds;
}

export function getLatestBattleOrderForSide(
  battle: PersistentBattle,
  side: BattleSide
): BattleOrder | undefined {
  return battle.activeOrders
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
  battle: PersistentBattle,
  side: BattleSide
): boolean {
  return (
    getLatestBattleOrderForSide(
      battle,
      side
    ) !== undefined
  );
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

function getReserveMultiplier(
  armyIndex: number,
  order?: BattleOrder
): number {
  //
  // First army represents the
  // currently committed frontline.
  //
  // Additional armies are operational
  // reserves / reinforcements.
  //
  if (
    armyIndex ===
    0
  ) {
    return 1;
  }

  //
  // COMMIT_RESERVE causes all currently
  // available reinforcing armies to
  // contribute fully.
  //
  if (
    order?.type ===
    "commit_reserve"
  ) {
    return 1;
  }

  //
  // Reinforcements that have arrived
  // but have not been committed still
  // contribute partially.
  //
  return 0.5;
}

function getOrderMultiplier(
  side: BattleSide,
  order?: BattleOrder
): number {
  if (!order) {
    return 1;
  }

  switch (
    order.type
  ) {
    case "hold_position":
      //
      // Holding is particularly useful
      // for the defending side.
      //
      return side ===
        "defender"
        ? 1.12
        : 0.95;

    case "commit_reserve":
      //
      // Main mechanical effect lives in
      // reserveMultiplier.
      //
      // Small coordination bonus.
      //
      return 1.05;

    case "press_attack":
      //
      // Increased operational pressure.
      //
      // C2.4 will also attach increased
      // casualty exposure to this order.
      //
      return 1.15;

    case "order_retreat":
      //
      // Army is disengaging rather than
      // fighting for battlefield control.
      //
      return 0.6;
  }
}

export function calculateBattleSidePower(
  battle: PersistentBattle,
  side: BattleSide
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

        const moraleModifier =
          getMoraleModifier(
            army.morale
          );

        const supplyModifier =
          getSupplyModifier(
            army.supply.state
          );

        const reserveMultiplier =
          getReserveMultiplier(
            armyIndex,
            order
          );

        const operationalPower =
          Math.max(
            0,
            basePower +
              moraleModifier +
              supplyModifier
          );

        return {
          armyId,

          basePower,

          moraleModifier,

          supplyModifier,

          reserveMultiplier,

          effectivePower:
            operationalPower *
            reserveMultiplier,
        };
      }
    );

  const rawPower =
    armyPowers.reduce(
      (
        total,
        army
      ) =>
        total +
        army.effectivePower,
      0
    );

  const orderMultiplier =
    getOrderMultiplier(
      side,
      order
    );

  return {
    side,

    armyIds,

    order,

    armyPowers,

    rawPower,

    orderMultiplier,

    totalPower:
      rawPower *
      orderMultiplier,
  };
}