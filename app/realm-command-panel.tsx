"use client";

import {
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
  PASS_COMMAND_WINDOW_CONFIRMATION_PHRASE,
} from "@/lib/session/player-actions";

import {
  getRealmControlLabel,
} from "@/lib/demo/realm-control";

import {
  getObserverFeed,
} from "@/lib/demo/observer";

import {
  formatWorldTime,
} from "@/lib/world/time";

import {
  openGameDrawer,
} from "@/lib/ui/game-drawer";

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

  const [
    collapsed,
    setCollapsed,
  ] =
    useState(false);

  const player =
    world.session.players[
      world.session.localPlayerId
    ];

  const kingdom =
    player
      ? world.kingdoms[
          player.kingdomId
        ]
      : undefined;

  const budget =
    kingdom
      ? getRealmBudgetSnapshot(
          kingdom.id
        )
      : null;

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
        player.id,
        // A human deliberately clicking "end orders" IS the
        // confirmation -- pass_command_window now requires an
        // explicit confirmation phrase so a turn can never end from a
        // stray/default tool call or an unresponsive model, but that
        // gate is not meant to make the human retype anything.
        PASS_COMMAND_WINDOW_CONFIRMATION_PHRASE
      );

    setMessage(
      result.ok
        ? "Orders ended. The command cycle may now continue."
        : `Cannot end orders: ${result.error}`
    );
  }

  function declare(
    targetKingdomId:
      string
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

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed left-1/2 top-[62px] z-[96] -translate-x-1/2 rounded-lg border border-amber-700/60 bg-black/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300 shadow-xl backdrop-blur hover:bg-black"
      >
        Realm Command · Day {day} ({cycle.phase}) ▾
      </button>
    );
  }

  return (
    <aside className="fixed left-1/2 top-[62px] z-[96] w-[340px] -translate-x-1/2 rounded-xl border border-amber-700/60 bg-black/90 p-3 text-neutral-100 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
            Realm Command
          </div>

          <div className="mt-1 text-sm font-semibold">
            Day {day} · {hour.toString().padStart(2, "0")}:00
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div
            className={`rounded px-2 py-1 text-[10px] font-bold ${
              cycle.phase ===
              "executing"
                ? "bg-emerald-950 text-emerald-200"
                : cycle.phase ===
                    "interrupted"
                  ? "bg-red-950 text-red-200"
                  : "bg-amber-950 text-amber-200"
            }`}
          >
            {cycle.phase.toUpperCase()}
          </div>

          <button
            type="button"
            title="Minimize"
            onClick={() => setCollapsed(true)}
            className="rounded px-1.5 py-1 text-xs text-neutral-400 hover:bg-white/10 hover:text-neutral-100"
          >
            ✕
          </button>
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
          <div
            className={
              budget.projectedDailyNetGold >=
              0
                ? "font-bold text-emerald-300"
                : "font-bold text-red-300"
            }
          >
            {budget.projectedDailyNetGold >=
            0
              ? "+"
              : ""}
            {budget.projectedDailyNetGold.toFixed(1)}
          </div>
        </div>

        <div className="rounded-lg bg-white/5 p-2">
          <div className="text-neutral-400">
            Settlement Income
          </div>
          <div className="font-semibold">
            +{budget.dailySettlementIncomeGold.toFixed(1)}
          </div>
        </div>

        <div className="rounded-lg bg-white/5 p-2">
          <div className="text-neutral-400">
            Territory Income
          </div>
          <div className="font-semibold">
            +{budget.dailyTerritoryIncomeGold.toFixed(1)}
          </div>
        </div>

        <div className="rounded-lg bg-white/5 p-2">
          <div className="text-neutral-400">
            Total Income
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
            Strategic nodes
          </span>
          <span>
            {budget.territoryNodeCount}
          </span>
        </div>

        <div className="mt-1 flex justify-between">
          <span className="text-neutral-400">
            Territory disruption
          </span>
          <span
            className={
              budget.territoryDisruptedGold >
              0
                ? "text-red-300"
                : ""
            }
          >
            -{budget.territoryDisruptedGold.toFixed(1)}
          </span>
        </div>

        <div className="mt-1 flex justify-between">
          <span className="text-neutral-400">
            Contested / occupied
          </span>
          <span>
            {budget.contestedTerritoryNodeCount} /{" "}
            {budget.occupiedHomeTerritoryNodeCount}
          </span>
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
            {budget.reserveCoverageDays >=
            999
              ? "∞"
              : `${budget.reserveCoverageDays.toFixed(1)} days`}
          </span>
        </div>
      </div>

      {world.simulation.paused ? (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/40 p-2 text-[10px] text-red-100">
          PAUSED:{" "}
          {world.simulation.pauseReasons.join(", ") ||
            "unknown reason"}
        </div>
      ) : null}

      {cycle.phase !==
      "executing" ? (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">
            Current command player
          </div>
          <div className="text-xs">
            {cycle.currentPlayerId
              ? `${
                  world.session.players[
                    cycle.currentPlayerId
                  ]?.displayName ??
                  cycle.currentPlayerId
                } (${
                  world.session.players[
                    cycle.currentPlayerId
                  ]
                    ? getRealmControlLabel(
                        world.session.players[
                          cycle.currentPlayerId
                        ]!.kingdomId
                      )
                    : "?"
                })`
              : "None"}
          </div>

          {cycle.interrupt?.message ? (
            <div className="mt-2 rounded-lg border border-amber-700/50 bg-amber-950/30 px-2 py-2 text-[11px] leading-4 text-amber-100">
              {cycle.interrupt.message}
            </div>
          ) : null}

          {isMyTurn ? (
            <button
              type="button"
              onClick={endOrders}
              className="mt-2 w-full rounded-lg border border-amber-400/50 bg-amber-950/70 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-900/70"
            >
              END ORDERS / PASS
            </button>
          ) : (
            <div className="mt-2 text-[10px] text-neutral-500">
              Waiting on {cycle.currentPlayerId
                ? world.session.players[
                    cycle.currentPlayerId
                  ]?.displayName ??
                  "another ruler"
                : "the realm"}
              . The world will resume automatically.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 text-[10px] text-emerald-200">
          World execution is active. Time advances automatically until a meaningful interrupt.
        </div>
      )}

      <div className="mt-3 border-t border-white/10 pt-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
            Recent GM / AI Activity
          </div>

          <button
            type="button"
            onClick={() =>
              openGameDrawer(
                "ai_feed"
              )
            }
            className="text-[10px] text-neutral-400 underline hover:text-neutral-200"
          >
            Full feed
          </button>
        </div>

        <div className="mt-1 space-y-1">
          {getObserverFeed(6)
            .slice()
            .reverse()
            .slice(0, 4)
            .map((entry) => (
              <div
                key={entry.id}
                className="rounded bg-white/5 px-2 py-1 text-[10px] leading-4 text-neutral-300"
              >
                <span className="text-neutral-500">
                  {formatWorldTime(entry.time)}
                  {entry.kingdomId
                    ? ` · ${entry.kingdomId}`
                    : ""}
                </span>{" "}
                — {entry.actor}: {entry.summary}
              </div>
            ))}

          {getObserverFeed(1).length === 0 ? (
            <div className="text-[10px] text-neutral-500">
              No GM/AI decisions recorded yet.
            </div>
          ) : null}
        </div>
      </div>

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
                    war.status ===
                      "active" &&
                    (
                      (
                        war.attackerRealmIds.includes(
                          kingdom.id
                        ) &&
                        war.defenderRealmIds.includes(
                          target.id
                        )
                      ) ||
                      (
                        war.attackerRealmIds.includes(
                          target.id
                        ) &&
                        war.defenderRealmIds.includes(
                          kingdom.id
                        )
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
                      Relations{" "}
                      {kingdom.relations[
                        target.id
                      ] ?? 0}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !isMyTurn ||
                      alreadyAtWar
                    }
                    onClick={() =>
                      declare(
                        target.id
                      )
                    }
                    className="rounded border border-red-500/50 bg-red-950/60 px-2 py-1 text-[10px] font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {alreadyAtWar
                      ? "AT WAR"
                      : "WAR"}
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
