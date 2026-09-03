"use client";

import {
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  getKingdomStrategicEconomy,
} from "@/lib/economy/strategic-metrics";

import {
  getKingdomSettlementEconomy,
} from "@/lib/economy/settlement-economy";

import {
  getDemoConfig,
  setDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

import {
  formatWorldTime,
  pauseWorld,
  resumeWorld,
} from "@/lib/world/time";

import {
  openGameDrawer,
} from "@/lib/ui/game-drawer";

import {
  requestReturnToMenu,
} from "@/lib/ui/navigation";

function number(
  value:
    number
): string {
  return Math.round(
    value
  ).toLocaleString();
}

export default function KingdomHud() {
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

  const isTimeRunning =
    demo.running &&
    !world.simulation
      .paused;

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

  const settlements =
    useMemo(
      () =>
        kingdom
          ? Object.values(
              world.settlements
            ).filter(
              (
                settlement
              ) =>
                (
                  settlement
                    .controllerKingdomId ??
                  settlement.kingdomId
                ) ===
                kingdom.id
            )
          : [],
      [
        kingdom,
        world.settlements,
      ]
    );

  if (
    demo.mode ===
      "observer" ||
    !kingdom ||
    !player
  ) {
    return null;
  }

  const economy =
    getKingdomStrategicEconomy(
      kingdom.id
    );

  const settlementEconomy =
    getKingdomSettlementEconomy(
      kingdom.id
    );

  const stockpile =
    settlements.reduce(
      (
        total,
        settlement
      ) => ({
        food:
          total.food +
          settlement
            .resources
            .food,
        wood:
          total.wood +
          settlement
            .resources
            .wood,
        stone:
          total.stone +
          settlement
            .resources
            .stone,
        metal:
          total.metal +
          settlement
            .resources
            .metal,
      }),
      {
        food:
          0,
        wood:
          0,
        stone:
          0,
        metal:
          0,
      }
    );

  const production =
    settlementEconomy
      .effectiveProduction;

  const armies =
    Object.values(
      world.armies
    ).filter(
      (
        army
      ) =>
        army.ownerId ===
          kingdom.id &&
        army.status !==
          "destroyed"
    ).length;

  const lords =
    Object.values(
      world.session
        .lords
        .profiles
    ).filter(
      (
        lord
      ) =>
        lord.kingdomId ===
        kingdom.id
    ).length;

  const deliveredMessages =
    Object.values(
      world.messages
    ).filter(
      (
        message
      ) =>
        message.recipientId ===
          player.characterId &&
        message.deliveredAt !==
          undefined
    ).length;

  const resources = [
    {
      icon:
        "💰",
      label:
        "Gold",
      value:
        kingdom.treasury,
      delta:
        economy
          .dailyTradeIncome -
        economy
          .dailyMilitaryGoldCost,
    },
    {
      icon:
        "🌾",
      label:
        "Food",
      value:
        stockpile.food,
      delta:
        production.food,
    },
    {
      icon:
        "🪵",
      label:
        "Wood",
      value:
        stockpile.wood,
      delta:
        production.wood,
    },
    {
      icon:
        "🪨",
      label:
        "Stone",
      value:
        stockpile.stone,
      delta:
        production.stone,
    },
    {
      icon:
        "⚙",
      label:
        "Metal",
      value:
        stockpile.metal,
      delta:
        production.metal,
    },
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-[85] border-b border-neutral-700/70 bg-[#090b0d]/95 px-3 py-2 text-[#f4ead5] shadow-xl backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 border-r border-neutral-700 pr-3">
          <div className="text-[9px] uppercase tracking-[0.22em] text-amber-400">
            👑 Realm
          </div>

          <div className="mt-0.5 max-w-36 truncate font-serif text-base font-semibold uppercase tracking-wide xl:text-lg">
            {kingdom.name}
          </div>
        </div>

        <div className="shrink-0 border-r border-neutral-800 pr-3 text-[10px]">
          <div className="font-mono text-neutral-200">
            {formatWorldTime(
              world.simulation
                .worldTimeMinutes
            )}
          </div>

          <div className="mt-1 flex gap-1">
            <button
              type="button"
              title={
                isTimeRunning
                  ? "Pause the world clock"
                  : "Resume the world clock (GM and Actor LLM kingdoms only act while it runs)"
              }
              onClick={() => {
                if (
                  isTimeRunning
                ) {
                  pauseWorld();
                  setDemoConfig({
                    running:
                      false,
                  });
                } else {
                  resumeWorld();
                  setDemoConfig({
                    running:
                      true,
                  });
                }
              }}
              className={`rounded border px-2 py-0.5 ${
                isTimeRunning
                  ? "border-neutral-700 bg-neutral-900"
                  : "border-amber-500 bg-amber-950/60 text-amber-200"
              }`}
            >
              {isTimeRunning
                ? "⏸"
                : "▶"}
            </button>

            {(
              [
                1,
                4,
                8,
              ] as const
            ).map(
              (
                speed
              ) => (
                <button
                  key={
                    speed
                  }
                  type="button"
                  onClick={() =>
                    setDemoConfig({
                      speed,
                    })
                  }
                  className={`rounded border px-2 py-0.5 ${
                    demo.speed ===
                    speed
                      ? "border-amber-400 bg-amber-950 text-amber-200"
                      : "border-neutral-700 bg-neutral-900 text-neutral-500"
                  }`}
                >
                  x{speed}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {resources.map(
            (
              resource
            ) => (
              <div
                key={
                  resource.label
                }
                title={`${resource.label}: ${number(resource.value)} · Net/day ${resource.delta >= 0 ? "+" : ""}${number(resource.delta)}`}
                className="min-w-[92px] rounded-lg border border-neutral-800 bg-neutral-950/60 px-2.5 py-1.5 xl:min-w-[108px]"
              >
                <div className="text-[11px] font-semibold">
                  {resource.icon}{" "}
                  {number(
                    resource.value
                  )}
                </div>

                <div
                  className={`mt-0.5 text-[9px] ${
                    resource.delta >=
                    0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {resource.delta >=
                  0
                    ? "+"
                    : ""}
                  {number(
                    resource.delta
                  )}
                  /day
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex shrink-0 gap-1 text-[10px]">
          <div
            title="Active armies"
            className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-2 py-2"
          >
            ⚔ {armies}
          </div>

          <button
            type="button"
            title="Lords"
            onClick={() =>
              openGameDrawer(
                "lords"
              )
            }
            className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-2 py-2 hover:border-amber-700"
          >
            👥 {lords}
          </button>

          <button
            type="button"
            title="Messages"
            onClick={() =>
              openGameDrawer(
                "messages"
              )
            }
            className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-2 py-2 hover:border-amber-700"
          >
            ✉ {deliveredMessages}
          </button>

          <button
            type="button"
            title="Diplomacy"
            onClick={() =>
              openGameDrawer(
                "diplomacy"
              )
            }
            className="hidden rounded-lg border border-neutral-800 bg-neutral-950/70 px-2 py-2 hover:border-violet-700 lg:block"
          >
            🕊
          </button>

          <button
            type="button"
            title="Save / load"
            onClick={() =>
              openGameDrawer(
                "save"
              )
            }
            className="hidden rounded-lg border border-neutral-800 bg-neutral-950/70 px-2 py-2 hover:border-cyan-700 xl:block"
          >
            💾
          </button>

          <button
            type="button"
            title="Exit to menu"
            onClick={() => {
              if (
                window.confirm(
                  "Exit to the main menu? Your progress is kept in the running world."
                )
              ) {
                requestReturnToMenu();
              }
            }}
            className="rounded-lg border border-red-900/60 bg-red-950/40 px-2 py-2 text-red-200 hover:border-red-600"
          >
            ✕
          </button>
        </div>
      </div>
    </header>
  );
}
