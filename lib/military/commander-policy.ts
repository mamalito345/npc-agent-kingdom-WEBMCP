import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  submitBattleOrder,
} from "@/lib/military/battle-orders";

import type {
  BattleOrderType,
  PersistentBattle,
} from "@/types/military";

function chooseCommanderOrder(
  battle:
    PersistentBattle,
  armyId:
    string
): BattleOrderType {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return "hold_position";
  }

  if (
    army.morale ===
      "broken" ||
    army.supply.state ===
      "starving"
  ) {
    return "order_retreat";
  }

  if (
    army.morale ===
      "high" &&
    army.supply.state ===
      "supplied"
  ) {
    return "press_attack";
  }

  if (
    battle.currentPhase ===
      "crisis"
  ) {
    return "commit_reserve";
  }

  return "hold_position";
}

export function resolveCommanderDecision(
  battle:
    PersistentBattle,
  armyId:
    string
): void {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return;
  }

  const order =
    chooseCommanderOrder(
      battle,
      armyId
    );

  submitBattleOrder({
    battleId:
      battle.id,

    armyId,

    actorType:
      "commander",

    actorId:
      army.commanderId ??
      `commander:${army.id}`,

    order,
  });
}