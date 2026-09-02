"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  getMapInteractionState,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  setPlayerBattleTactic,
  submitPlayerBattleCrisisOrder,
} from "@/lib/session/player-actions";

import type {
  BattleOrderType,
  BattleTactic,
} from "@/types/military";

const TACTICS:
  BattleTactic[] = [
  "hold_ground",
  "aggressive_push",
  "shield_wall",
  "cavalry_flank",
  "counterattack",
  "seize_high_ground",
  "orderly_retreat",
  "desperate_assault",
];

const CRISIS_ORDERS:
  BattleOrderType[] = [
  "hold_position",
  "commit_reserve",
  "press_attack",
  "order_retreat",
];

function composition(
  armyIds: string[]
) {
  const units =
    armyIds.flatMap(
      (armyId) =>
        getArmyUnits(
          armyId
        )
    );

  return {
    soldiers:
      units.reduce(
        (sum, unit) =>
          sum +
          unit.currentSoldiers,
        0
      ),
    infantry:
      units
        .filter(
          (unit) =>
            unit.type ===
            "infantry"
        )
        .reduce(
          (sum, unit) =>
            sum +
            unit.currentSoldiers,
          0
        ),
    cavalry:
      units
        .filter(
          (unit) =>
            unit.type ===
            "cavalry"
        )
        .reduce(
          (sum, unit) =>
            sum +
            unit.currentSoldiers,
          0
        ),
    siege:
      units
        .filter(
          (unit) =>
            unit.type ===
            "siege"
        )
        .reduce(
          (sum, unit) =>
            sum +
            unit.currentSoldiers,
          0
        ),
  };
}

export default function BattleBoard() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const interaction =
    useSyncExternalStore(
      subscribeMapInteraction,
      getMapInteractionState,
      getMapInteractionState
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null
    );

  const selectedArmyId =
    interaction
      .selectedArmyId;

  const battle =
    selectedArmyId
      ? Object.values(
          world.battles
        ).find(
          (candidate) =>
            candidate.status ===
              "active" &&
            (
              candidate
                .attackerArmyIds
                .includes(
                  selectedArmyId
                ) ||
              candidate
                .defenderArmyIds
                .includes(
                  selectedArmyId
                )
            )
        )
      : undefined;

  const player =
    world.session.players[
      world.session.localPlayerId
    ];

  const attacker =
    useMemo(
      () =>
        battle
          ? composition(
              battle
                .attackerArmyIds
            )
          : null,
      [
        battle,
      ]
    );

  const defender =
    useMemo(
      () =>
        battle
          ? composition(
              battle
                .defenderArmyIds
            )
          : null,
      [
        battle,
      ]
    );

  if (
    !battle ||
    !attacker ||
    !defender ||
    !player
  ) {
    return null;
  }

  /*
   * Preserve the narrowed battle value for event-handler closures.
   * TypeScript does not keep the outer optional narrowing across nested
   * functions because the captured variable could theoretically change
   * between render and invocation.
   */
  const activeBattle =
    battle;

  const controllableArmyId =
    [
      ...activeBattle
        .attackerArmyIds,
      ...activeBattle
        .defenderArmyIds,
    ].find(
      (armyId) =>
        world.armies[
          armyId
        ]?.ownerId ===
          player.kingdomId &&
        !Object.values(
          world.session.lords
            .profiles
        ).some(
          (lord) =>
            lord
              .controlledArmyIds
              .includes(
                armyId
              )
        )
    );

  function setTactic(
    tactic: BattleTactic
  ): void {
    if (!controllableArmyId) {
      return;
    }

    const result =
      setPlayerBattleTactic(
        world.session.id,
        player.id,
        activeBattle.id,
        controllableArmyId,
        tactic
      );

    setMessage(
      result.ok
        ? `Tactic: ${tactic}`
        : `TACTIC FAILED — ${result.error}`
    );
  }

  function crisisOrder(
    order: BattleOrderType
  ): void {
    if (!controllableArmyId) {
      return;
    }

    const result =
      submitPlayerBattleCrisisOrder(
        world.session.id,
        player.id,
        activeBattle.id,
        controllableArmyId,
        order
      );

    setMessage(
      result.ok
        ? `Battle order: ${order}`
        : `ORDER FAILED — ${result.error}`
    );
  }

  const locationName =
    world.locations[
      activeBattle.nodeId
    ]?.name ??
    activeBattle.nodeId;

  return (
    <section className="fixed bottom-5 left-[340px] z-[80] w-[620px] rounded-2xl border border-red-900/70 bg-[#0a0c0e]/96 p-4 text-neutral-100 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400">
            Persistent Battle
          </div>

          <h2 className="mt-1 font-serif text-xl">
            Battle of{" "}
            {locationName}
          </h2>
        </div>

        <div className="text-right text-[10px] uppercase tracking-wider text-neutral-500">
          <div>
            Hour{" "}
            {
              activeBattle.battleHour
            }
          </div>
          <div className="mt-1 text-red-300">
            {
              activeBattle.currentPhase
            }
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div>
          <div className="text-[10px] uppercase text-neutral-500">
            Attacker
          </div>

          <div className="mt-1 text-2xl font-semibold">
            {
              attacker.soldiers
            }
          </div>

          <div className="mt-2 text-xs text-neutral-400">
            INF{" "}
            {
              attacker.infantry
            }{" "}
            · CAV{" "}
            {
              attacker.cavalry
            }{" "}
            · SIEGE{" "}
            {
              attacker.siege
            }
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-center">
          <div className="text-[10px] uppercase text-neutral-500">
            Terrain
          </div>

          <div className="mt-1 text-xs font-semibold uppercase">
            {
              activeBattle.terrain
            }
          </div>

          <div className="mt-2 text-[10px] text-amber-300">
            {activeBattle.features.length >
            0
              ? activeBattle.features.join(
                  " · "
                )
              : "open ground"}
          </div>

          <div className="mt-3 text-xl font-semibold">
            {activeBattle.frontMomentum >
            0
              ? "+"
              : ""}
            {
              activeBattle.frontMomentum
            }
          </div>

          <div className="text-[9px] uppercase text-neutral-600">
            momentum
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase text-neutral-500">
            Defender
          </div>

          <div className="mt-1 text-2xl font-semibold">
            {
              defender.soldiers
            }
          </div>

          <div className="mt-2 text-xs text-neutral-400">
            INF{" "}
            {
              defender.infantry
            }{" "}
            · CAV{" "}
            {
              defender.cavalry
            }{" "}
            · SIEGE{" "}
            {
              defender.siege
            }
          </div>
        </div>
      </div>

      {message ? (
        <div className="mt-3 rounded border border-neutral-800 bg-neutral-900 p-2 text-xs text-neutral-400">
          {message}
        </div>
      ) : null}

      {controllableArmyId ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Battle Tactic
            </div>

            <div className="grid grid-cols-2 gap-1">
              {TACTICS.map(
                (tactic) => (
                  <button
                    key={
                      tactic
                    }
                    type="button"
                    onClick={() =>
                      setTactic(
                        tactic
                      )
                    }
                    className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-[10px] hover:border-amber-600"
                  >
                    {tactic.replaceAll(
                      "_",
                      " "
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-400">
              Crisis Orders
            </div>

            <div className="grid grid-cols-2 gap-1">
              {CRISIS_ORDERS.map(
                (order) => (
                  <button
                    key={
                      order
                    }
                    type="button"
                    disabled={
                      activeBattle
                        .pendingDecision
                        ?.armyId !==
                      controllableArmyId
                    }
                    onClick={() =>
                      crisisOrder(
                        order
                      )
                    }
                    className="rounded border border-red-900 bg-red-950/25 px-2 py-1.5 text-[10px] disabled:opacity-25"
                  >
                    {order.replaceAll(
                      "_",
                      " "
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-violet-900 bg-violet-950/20 p-3 text-xs text-violet-200">
          Your ruler does not directly command the selected independent lord force in this activeBattle.
        </div>
      )}

      <div className="mt-4 max-h-28 overflow-y-auto border-t border-neutral-800 pt-3">
        {activeBattle.history
          .slice(-6)
          .map(
            (entry) => (
              <div
                key={
                  entry.id
                }
                className="mb-1 text-[10px] text-neutral-500"
              >
                <span className="mr-2 text-neutral-700">
                  {
                    entry.timestamp
                  }
                </span>
                {
                  entry.summary
                }
              </div>
            )
          )}
      </div>
    </section>
  );
}
