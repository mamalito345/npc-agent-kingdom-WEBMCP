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
  getDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

import {
  getRealmBudgetSnapshot,
} from "@/lib/economy/realm-budget";

import {
  declarePlayerWar,
  passPlayerCommandWindow,
} from "@/lib/session/player-actions";

export default function RealmCommandPanel() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const demo =
    useSyncExternalStore(
      subscribeDemoConfig,
      getDemoConfig,
      getDemoConfig
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null
    );

  const player =
    world.session.players[
      world.session
        .localPlayerId
    ];

  const kingdom =
    player
      ? world.kingdoms[
          player.kingdomId
        ]
      : undefined;

  const budget =
    useMemo(
      () =>
        kingdom
          ? getRealmBudgetSnapshot(
              kingdom.id
            )
          : null,
      [
        kingdom?.id,
        kingdom?.treasury,
        world.simulation
          .worldTimeMinutes,
        world.armies,
        world.settlements,
      ]
    );

  if (
    demo.mode !==
      "player" ||
    !player ||
    !kingdom ||
    !budget
  ) {
    return null;
  }

  const cycle =
    world.session
      .commandCycle;

  const isMyTurn =
    cycle.currentPlayerId ===
    player.id;

  const foreignKingdoms =
    Object.values(
      world.kingdoms
    )
      .filter(
        (candidate) =>
          candidate.id !==
          kingdom.id
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      );

  const day =
    Math.floor(
      world.simulation
        .worldTimeMinutes /
        1440
    ) + 1;

  const hour =
    Math.floor(
      (
        world.simulation
          .worldTimeMinutes %
        1440
      ) /
      60
    );

  function endOrders() {
    const result =
      passPlayerCommandWindow(
        world.session.id,
        player.id
      );

    setMessage(
      result.ok
        ? "Orders ended. The command cycle may now continue."
        : `Cannot end orders: ${result.error}`
    );
  }

  function declare(
    targetKingdomId: string
  ) {
    const result =
      declarePlayerWar(
        world.session.id,
        player.id,
        targetKingdomId,
        "AGGRESSION"
      );

    setMessage(
      result.ok
        ? `War declared. ${result.warId}`
        : `War declaration failed: ${result.error}`
    );
  }

  return (
    <aside className="fixed right-4 top-[84px] z-[85] w-[330px] rounded-xl border border-neutral-700/80 bg-black/85 p-3 text-neutral-100 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
            Realm Command
          </div>

          <div className="mt-1 text-sm font-semibold">
            Day {day} · {hour.toString().padStart(2, "0")}:00
          </div>
        </div>

        <div className={`rounded px-2 py-1 text-[10px] font-bold ${
          cycle.phase === "executing"
            ? "bg-emerald-950 text-emerald-200"
            : cycle.phase === "interrupted"
              ? "bg-red-950 text-red-200"
              : "bg-amber-950 text-amber-200"
        }`}>
          {cycle.phase.toUpperCase()}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-white/5 p-2">
          <div className="text-neutral-400">
            Treasury
          </div>
          <div className="font-bold">
            {budget.treasury.toFixed(0)} gold
          </div>
        </div>

        <div className="rounded-lg bg-white/5 p-2">
          <div className="text-neutral-400">
            Daily Net
          </div>
          <div className={budget.projectedDailyNetGold >= 0 ? "font-bold text-emerald-300" : "font-bold text-red-300"}>
            {budget.projectedDailyNetGold >= 0 ? "+" : ""}
            {budget.projectedDailyNetGold.toFixed(1)}
          </div>
        </div>

        <div className="rounded-lg bg-white/5 p-2">
          <div className="text-neutral-400">
            Income
          </div>
          <div className="font-semibold">
            +{budget.dailyIncomeGold.toFixed(1)}/day
          </div>
        </div>

        <div className="rounded-lg bg-white/5 p-2">
          <div className="text-neutral-400">
            Army Cost
          </div>
          <div className="font-semibold">
            -{budget.dailyArmyExpenseGold.toFixed(1)}/day
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2 text-[11px]">
        <div className="flex justify-between">
          <span className="text-neutral-400">
            Recommended reserve
          </span>
          <span>
            {budget.recommendedReserveGold.toFixed(0)}
          </span>
        </div>

        <div className="mt-1 flex justify-between">
          <span className="text-neutral-400">
            Spendable above reserve
          </span>
          <span>
            {budget.spendableGold.toFixed(0)}
          </span>
        </div>

        <div className="mt-1 flex justify-between">
          <span className="text-neutral-400">
            Army-cost coverage
          </span>
          <span>
            {budget.reserveCoverageDays >= 999
              ? "∞"
              : `${budget.reserveCoverageDays.toFixed(1)} days`}
          </span>
        </div>
      </div>

      {world.simulation.paused ? (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/40 p-2 text-[10px] text-red-100">
          PAUSED: {world.simulation.pauseReasons.join(", ") || "unknown reason"}
        </div>
      ) : null}

      {cycle.phase !== "executing" ? (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">
            Current command player
          </div>
          <div className="text-xs">
            {cycle.currentPlayerId
              ? world.session.players[cycle.currentPlayerId]?.displayName ?? cycle.currentPlayerId
              : "None"}
          </div>

          {isMyTurn ? (
            <button
              type="button"
              onClick={endOrders}
              className="mt-2 w-full rounded-lg border border-amber-400/50 bg-amber-950/70 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-900/70"
            >
              END ORDERS / PASS
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 text-[10px] text-emerald-200">
          World execution is active. Time advances automatically until a meaningful interrupt.
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-bold text-red-200">
          Declare War
        </summary>

        <div className="mt-2 space-y-1">
          {foreignKingdoms.map(
            (target) => {
              const alreadyAtWar =
                Object.values(
                  world.wars
                ).some(
                  (war) =>
                    war.status === "active" &&
                    (
                      (
                        war.attackerRealmIds.includes(kingdom.id) &&
                        war.defenderRealmIds.includes(target.id)
                      ) ||
                      (
                        war.attackerRealmIds.includes(target.id) &&
                        war.defenderRealmIds.includes(kingdom.id)
                      )
                    )
                );

              return (
                <div
                  key={target.id}
                  className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1.5"
                >
                  <div>
                    <div className="text-xs font-semibold">
                      {target.name}
                    </div>
                    <div className="text-[9px] text-neutral-400">
                      Relations {kingdom.relations[target.id] ?? 0}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isMyTurn || alreadyAtWar}
                    onClick={() => declare(target.id)}
                    className="rounded border border-red-500/50 bg-red-950/60 px-2 py-1 text-[10px] font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                    title={
                      alreadyAtWar
                        ? "Already at war"
                        : !isMyTurn
                          ? "War can be declared during your command window"
                          : "Declare canonical war"
                    }
                  >
                    {alreadyAtWar ? "AT WAR" : "WAR"}
                  </button>
                </div>
              );
            }
          )}
        </div>
      </details>

      {message ? (
        <div className="mt-2 rounded bg-white/5 p-2 text-[10px] text-neutral-300">
          {message}
        </div>
      ) : null}
    </aside>
  );
}
