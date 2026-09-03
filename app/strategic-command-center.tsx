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
  getMapInteractionState,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  getRealmBudgetSnapshot,
} from "@/lib/economy/realm-budget";

import {
  getKingdomTerritoryEconomy,
} from "@/lib/economy/territory-economy";

import {
  declarePlayerWar,
  passPlayerCommandWindow,
} from "@/lib/session/player-actions";

import {
  getDiplomaticPairStatus,
} from "@/lib/politics/diplomatic-law";

import WarIntelligencePanel from "@/app/war-intelligence-panel";
import DiplomaticLawPanel from "@/app/diplomatic-law-panel";
import SettlementInvestmentPanel from "@/app/settlement-investment-panel";
import LordMilitaryPoliticsPanel from "@/app/lord-military-politics-panel";
import StrategicBriefingPanel from "@/app/strategic-briefing-panel";

type CommandSurface =
  | "REALM"
  | "SETTLEMENT"
  | "WAR"
  | "DIPLOMACY"
  | "LORDS"
  | "BRIEFING";

const SURFACES:
  Array<{
    id: CommandSurface;
    icon: string;
    label: string;
  }> = [
  {
    id:
      "REALM",
    icon:
      "♛",
    label:
      "Realm",
  },
  {
    id:
      "SETTLEMENT",
    icon:
      "⌂",
    label:
      "Settlement",
  },
  {
    id:
      "WAR",
    icon:
      "⚔",
    label:
      "War",
  },
  {
    id:
      "DIPLOMACY",
    icon:
      "🕊",
    label:
      "Diplomacy",
  },
  {
    id:
      "LORDS",
    icon:
      "♜",
    label:
      "Lords",
  },
  {
    id:
      "BRIEFING",
    icon:
      "✦",
    label:
      "Briefing",
  },
];

export default function StrategicCommandCenter() {
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

  const interaction =
    useSyncExternalStore(
      subscribeMapInteraction,
      getMapInteractionState,
      getMapInteractionState
    );

  const [
    surface,
    setSurface,
  ] =
    useState<
      CommandSurface | null
    >(
      "REALM"
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
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

  const territory =
    useMemo(
      () =>
        kingdom
          ? getKingdomTerritoryEconomy(
              kingdom.id
            )
          : null,
      [
        kingdom?.id,
        world.simulation
          .worldTimeMinutes,
        world.armies,
      ]
    );

  if (
    demo.mode !==
      "player" ||
    !player ||
    !kingdom ||
    !budget ||
    !territory
  ) {
    return null;
  }

  const cycle =
    world.session
      .commandCycle;

  const isMyTurn =
    cycle.currentPlayerId ===
    player.id;

  const selectedSettlement =
    interaction
      .selectedSettlementId
      ? world.settlements[
          interaction
            .selectedSettlementId
        ]
      : undefined;

  const selectedArmy =
    interaction
      .selectedArmyId
      ? world.armies[
          interaction
            .selectedArmyId
        ]
      : undefined;

  function toggle(
    next:
      CommandSurface
  ) {
    setSurface(
      (
        current
      ) =>
        current ===
        next
          ? null
          : next
    );
  }

  function endOrders() {
    const result =
      passPlayerCommandWindow(
        world.session.id,
        player.id
      );

    setMessage(
      result.ok
        ? "Orders ended. Control passes to the next required ruler."
        : `Cannot end orders: ${result.error}`
    );
  }

  function declareWar(
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
        ? "War declaration dispatched into the canonical campaign state."
        : `War declaration failed: ${result.error}`
    );
  }

  return (
    <>
      <nav className="fixed right-3 top-1/2 z-[95] flex -translate-y-1/2 flex-col gap-2">
        {SURFACES.map(
          (
            item
          ) => (
            <button
              key={
                item.id
              }
              type="button"
              title={
                item.label
              }
              onClick={() =>
                toggle(
                  item.id
                )
              }
              className={`group relative grid h-11 w-11 place-items-center rounded-full border text-lg shadow-xl backdrop-blur transition ${
                surface ===
                item.id
                  ? "border-amber-300 bg-amber-950/90 text-amber-100 ring-2 ring-amber-300/20"
                  : "border-neutral-700 bg-black/80 text-neutral-300 hover:border-amber-600 hover:text-amber-200"
              }`}
            >
              {item.icon}

              <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[9px] font-bold text-neutral-100 group-hover:block">
                {item.label}
              </span>
            </button>
          )
        )}

        <button
          type="button"
          disabled={
            !isMyTurn
          }
          onClick={
            endOrders
          }
          title="End Orders"
          className="mt-2 grid h-11 w-11 place-items-center rounded-full border border-emerald-700 bg-emerald-950/90 text-sm font-black text-emerald-100 shadow-xl disabled:opacity-30"
        >
          ▶
        </button>
      </nav>

      {surface ? (
        <section className="fixed right-16 top-[82px] z-[94] max-h-[calc(100dvh-98px)] w-[min(430px,calc(100vw-86px))] overflow-hidden rounded-2xl border border-neutral-700/80 bg-[#090b0d]/96 text-neutral-100 shadow-2xl backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                {
                  SURFACES.find(
                    (
                      item
                    ) =>
                      item.id ===
                      surface
                  )?.label
                }
              </div>
              <div className="mt-1 text-[9px] text-neutral-500">
                {kingdom.name} · {cycle.phase} · {isMyTurn ? "your command" : "waiting"}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSurface(
                  null
                )
              }
              className="grid h-8 w-8 place-items-center rounded-full border border-neutral-700 bg-black/50 text-neutral-400"
            >
              ×
            </button>
          </header>

          <div className="max-h-[calc(100dvh-155px)] overflow-y-auto p-3">
            {surface ===
            "REALM" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[9px] uppercase text-neutral-500">
                      Treasury
                    </div>
                    <div className="mt-1 text-xl font-black">
                      {Math.round(
                        budget.treasury
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[9px] uppercase text-neutral-500">
                      Net / day
                    </div>
                    <div
                      className={`mt-1 text-xl font-black ${
                        budget
                          .projectedDailyNetGold >=
                        0
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {budget
                        .projectedDailyNetGold >=
                      0
                        ? "+"
                        : ""}
                      {Math.round(
                        budget
                          .projectedDailyNetGold
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px]">
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-neutral-500">
                      Daily income
                    </span>
                    <span className="text-right">
                      +
                      {Math.round(
                        budget
                          .dailyIncomeGold
                      )}
                    </span>

                    <span className="text-neutral-500">
                      Army expense
                    </span>
                    <span className="text-right">
                      -
                      {Math.round(
                        budget
                          .dailyArmyExpenseGold
                      )}
                    </span>

                    <span className="text-neutral-500">
                      Spendable
                    </span>
                    <span className="text-right">
                      {Math.round(
                        budget
                          .spendableGold
                      )}
                    </span>

                    <span className="text-neutral-500">
                      Territory
                    </span>
                    <span className="text-right">
                      {territory.homeNodeCount -
                        territory.occupiedHomeNodeCount}
                      /
                      {territory.homeNodeCount}
                    </span>

                    <span className="text-neutral-500">
                      Disrupted income
                    </span>
                    <span className="text-right text-red-300">
                      {Math.round(
                        territory.disruptedGold
                      )}
                    </span>
                  </div>
                </div>

                <details className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px]">
                  <summary className="cursor-pointer font-bold text-neutral-300">
                    War declarations
                  </summary>

                  <div className="mt-2 space-y-1">
                    {Object.values(
                      world.kingdoms
                    )
                      .filter(
                        (
                          target
                        ) =>
                          target.id !==
                          kingdom.id
                      )
                      .map(
                        (
                          target
                        ) => {
                          const pair =
                            getDiplomaticPairStatus(
                              kingdom.id,
                              target.id
                            );

                          return (
                            <div
                              key={
                                target.id
                              }
                              className="flex items-center justify-between rounded bg-black/30 px-2 py-1"
                            >
                              <span>
                                {target.name}
                              </span>

                              <button
                                type="button"
                                disabled={
                                  !isMyTurn ||
                                  pair.atWar ||
                                  pair.peaceProtected
                                }
                                onClick={() =>
                                  declareWar(
                                    target.id
                                  )
                                }
                                className="rounded border border-red-900 bg-red-950/40 px-2 py-1 text-[8px] text-red-200 disabled:opacity-25"
                              >
                                {pair.atWar
                                  ? "AT WAR"
                                  : pair.peaceProtected
                                    ? "TRUCE"
                                    : "DECLARE WAR"}
                              </button>
                            </div>
                          );
                        }
                      )}
                  </div>
                </details>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px]">
                  <div className="font-bold">
                    Map selection
                  </div>
                  <div className="mt-2 text-neutral-400">
                    Army:{" "}
                    <span className="text-neutral-100">
                      {selectedArmy?.id ??
                        "none"}
                    </span>
                  </div>
                  <div className="mt-1 text-neutral-400">
                    Settlement:{" "}
                    <span className="text-neutral-100">
                      {selectedSettlement?.name ??
                        "none"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {surface ===
            "SETTLEMENT" ? (
              selectedSettlement ? (
                <SettlementInvestmentPanel
                  embedded
                />
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-700 p-8 text-center text-xs text-neutral-500">
                  Select a settlement on the map first.
                </div>
              )
            ) : null}

            {surface ===
            "WAR" ? (
              selectedArmy ? (
                <WarIntelligencePanel
                  embedded
                />
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-700 p-8 text-center text-xs text-neutral-500">
                  Select one of your armies first.
                </div>
              )
            ) : null}

            {surface ===
            "DIPLOMACY" ? (
              <DiplomaticLawPanel
                embedded
              />
            ) : null}

            {surface ===
            "LORDS" ? (
              <LordMilitaryPoliticsPanel
                embedded
              />
            ) : null}

            {surface ===
            "BRIEFING" ? (
              <StrategicBriefingPanel
                embedded
              />
            ) : null}
          </div>

          {message ? (
            <div className="border-t border-neutral-800 bg-black/50 px-3 py-2 text-[9px] text-neutral-300">
              {message}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
