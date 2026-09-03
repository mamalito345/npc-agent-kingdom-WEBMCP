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
  getDiplomaticPairStatus,
} from "@/lib/politics/diplomatic-law";

import {
  declarePlayerWar,
  passPlayerCommandWindow,
} from "@/lib/session/player-actions";

import WarIntelligencePanel from "@/app/war-intelligence-panel";
import DiplomaticLawPanel from "@/app/diplomatic-law-panel";
import SettlementInvestmentPanel from "@/app/settlement-investment-panel";
import LordMilitaryPoliticsPanel from "@/app/lord-military-politics-panel";
import StrategicBriefingPanel from "@/app/strategic-briefing-panel";

type CommandTab =
  | "REALM"
  | "SETTLEMENT"
  | "WAR"
  | "DIPLOMACY"
  | "LORDS"
  | "BRIEFING";

const TABS:
  Array<{
    id:
      CommandTab;
    label:
      string;
  }> = [
  {
    id:
      "REALM",
    label:
      "Realm",
  },
  {
    id:
      "SETTLEMENT",
    label:
      "Settlement",
  },
  {
    id:
      "WAR",
    label:
      "War",
  },
  {
    id:
      "DIPLOMACY",
    label:
      "Diplomacy",
  },
  {
    id:
      "LORDS",
    label:
      "Lords",
  },
  {
    id:
      "BRIEFING",
    label:
      "Briefing",
  },
];

function phaseClass(
  phase:
    string
): string {
  switch (
    phase
  ) {
    case "interrupted":
      return "border-red-700 bg-red-950/60 text-red-100";

    case "planning":
      return "border-amber-700 bg-amber-950/50 text-amber-100";

    default:
      return "border-emerald-700 bg-emerald-950/50 text-emerald-100";
  }
}

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
    open,
    setOpen,
  ] =
    useState(
      true
    );

  const [
    tab,
    setTab,
  ] =
    useState<
      CommandTab
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

  const selectedArmy =
    interaction
      .selectedArmyId
      ? world.armies[
          interaction
            .selectedArmyId
        ]
      : undefined;

  const selectedSettlement =
    interaction
      .selectedSettlementId
      ? world.settlements[
          interaction
            .selectedSettlementId
        ]
      : undefined;

  const ownBattles =
    Object.values(
      world.battles
    ).filter(
      (battle) =>
        battle.status ===
          "active" &&
        [
          ...battle
            .attackerArmyIds,
          ...battle
            .defenderArmyIds,
        ].some(
          (armyId) =>
            world.armies[
              armyId
            ]?.ownerId ===
            kingdom.id
        )
    );

  const incomingBorderIncidents =
    Object.values(
      world.session
        .borders
        .incidents
    ).filter(
      (incident) =>
        incident
          .toKingdomId ===
        kingdom.id
    );

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
    ) +
    1;

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
        ? "Orders ended. Simulation may continue."
        : `Cannot end orders: ${result.error}`
    );
  }

  function declareWar(
    targetId:
      string
  ) {
    const result =
      declarePlayerWar(
        world.session.id,
        player.id,
        targetId,
        "AGGRESSION"
      );

    setMessage(
      result.ok
        ? `War declared: ${result.warId}.`
        : `War declaration failed: ${result.error}`
    );
  }

  return (
    <section className="fixed right-4 top-[84px] z-[90] w-[470px] max-w-[calc(100vw-32px)] text-neutral-100">
      <div className="overflow-hidden rounded-2xl border border-neutral-700/80 bg-[#090b0d]/96 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() =>
            setOpen(
              (current) =>
                !current
            )
          }
          className="flex w-full items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3 text-left"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
              Strategic Command Center
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
              <span>
                {kingdom.name}
              </span>
              <span>
                ·
              </span>
              <span>
                Day {day} ·{" "}
                {hour
                  .toString()
                  .padStart(
                    2,
                    "0"
                  )}
                :00
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cycle.interrupt &&
            cycle.interrupt
              .affectedPlayerIds
              .includes(
                player.id
              ) ? (
              <span className="rounded-full bg-red-700 px-2 py-1 text-[9px] font-black">
                ATTENTION
              </span>
            ) : null}

            <span
              className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${phaseClass(
                cycle.phase
              )}`}
            >
              {cycle.phase}
            </span>

            <span className="text-neutral-500">
              {open
                ? "−"
                : "+"}
            </span>
          </div>
        </button>

        {open ? (
          <>
            <div className="grid grid-cols-4 gap-px bg-neutral-800 text-[9px]">
              <div className="bg-[#101316] p-2">
                <div className="text-neutral-500">
                  Treasury
                </div>
                <div className="mt-0.5 font-bold">
                  {budget.treasury.toFixed(
                    0
                  )}
                </div>
              </div>

              <div className="bg-[#101316] p-2">
                <div className="text-neutral-500">
                  Net/day
                </div>
                <div
                  className={
                    budget
                      .projectedDailyNetGold >=
                    0
                      ? "mt-0.5 font-bold text-emerald-300"
                      : "mt-0.5 font-bold text-red-300"
                  }
                >
                  {budget
                    .projectedDailyNetGold >=
                  0
                    ? "+"
                    : ""}
                  {budget.projectedDailyNetGold.toFixed(
                    1
                  )}
                </div>
              </div>

              <div className="bg-[#101316] p-2">
                <div className="text-neutral-500">
                  Territory
                </div>
                <div className="mt-0.5 font-bold">
                  {territory
                    .homeNodeCount -
                    territory
                      .occupiedHomeNodeCount}
                  /
                  {territory.homeNodeCount}
                </div>
              </div>

              <div className="bg-[#101316] p-2">
                <div className="text-neutral-500">
                  Active battles
                </div>
                <div
                  className={
                    ownBattles.length >
                    0
                      ? "mt-0.5 font-bold text-red-300"
                      : "mt-0.5 font-bold text-neutral-200"
                  }
                >
                  {ownBattles.length}
                </div>
              </div>
            </div>

            {cycle.interrupt &&
            cycle.interrupt
              .affectedPlayerIds
              .includes(
                player.id
              ) ? (
              <div className="border-b border-red-900/50 bg-red-950/25 px-4 py-2 text-[10px] text-red-100">
                <span className="font-black uppercase">
                  {cycle.interrupt.type.replaceAll(
                    "_",
                    " "
                  )}
                </span>
                {" — "}
                {cycle.interrupt.message}
              </div>
            ) : null}

            <div className="flex overflow-x-auto border-b border-neutral-800 bg-black/30 p-1">
              {TABS.map(
                (candidate) => (
                  <button
                    key={
                      candidate.id
                    }
                    type="button"
                    onClick={() =>
                      setTab(
                        candidate.id
                      )
                    }
                    className={`min-w-fit rounded-lg px-3 py-2 text-[9px] font-bold uppercase tracking-wide ${
                      tab ===
                      candidate.id
                        ? "bg-amber-950 text-amber-200"
                        : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                    }`}
                  >
                    {candidate.label}
                  </button>
                )
              )}
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-3">
              {tab ===
              "REALM" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="font-bold text-amber-200">
                        Economy
                      </div>

                      <div className="mt-2 space-y-1 text-neutral-400">
                        <div className="flex justify-between">
                          <span>
                            Income
                          </span>
                          <span>
                            +
                            {budget.dailyIncomeGold.toFixed(
                              1
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>
                            Army expense
                          </span>
                          <span>
                            -
                            {budget.dailyArmyExpenseGold.toFixed(
                              1
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>
                            Reserve
                          </span>
                          <span>
                            {budget.recommendedReserveGold.toFixed(
                              0
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>
                            Spendable
                          </span>
                          <span>
                            {budget.spendableGold.toFixed(
                              0
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>
                            Coverage
                          </span>
                          <span>
                            {budget.reserveCoverageDays >=
                            999
                              ? "∞"
                              : `${budget.reserveCoverageDays.toFixed(
                                  1
                                )}d`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="font-bold text-emerald-200">
                        Realm Security
                      </div>

                      <div className="mt-2 space-y-1 text-neutral-400">
                        <div className="flex justify-between">
                          <span>
                            Contested
                          </span>
                          <span>
                            {territory.contestedNodeCount}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>
                            Occupied
                          </span>
                          <span>
                            {territory.occupiedHomeNodeCount}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>
                            Lost node income
                          </span>
                          <span>
                            {territory.disruptedGold.toFixed(
                              1
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>
                            Border incidents
                          </span>
                          <span>
                            {incomingBorderIncidents.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px]">
                    <div className="font-bold">
                      Current Selection
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-neutral-400">
                      <div>
                        Army:{" "}
                        <span className="text-neutral-100">
                          {selectedArmy?.id ??
                            "none"}
                        </span>
                      </div>

                      <div>
                        Settlement:{" "}
                        <span className="text-neutral-100">
                          {selectedSettlement?.id ??
                            "none"}
                        </span>
                      </div>
                    </div>

                    {selectedSettlement ? (
                      <button
                        type="button"
                        onClick={() =>
                          setTab(
                            "SETTLEMENT"
                          )
                        }
                        className="mt-2 rounded border border-emerald-800 bg-emerald-950/40 px-2 py-1 text-emerald-100"
                      >
                        Open settlement management
                      </button>
                    ) : null}

                    {selectedArmy ? (
                      <button
                        type="button"
                        onClick={() =>
                          setTab(
                            "WAR"
                          )
                        }
                        className="ml-1 mt-2 rounded border border-red-800 bg-red-950/40 px-2 py-1 text-red-100"
                      >
                        Open war intelligence
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px]">
                    <div className="font-bold">
                      War Declarations
                    </div>

                    <div className="mt-2 space-y-1">
                      {foreignKingdoms.map(
                        (target) => {
                          const status =
                            getDiplomaticPairStatus(
                              kingdom.id,
                              target.id
                            );

                          return (
                            <div
                              key={
                                target.id
                              }
                              className="flex items-center justify-between gap-2 rounded bg-black/30 p-2"
                            >
                              <div>
                                <div className="font-semibold">
                                  {target.name}
                                </div>

                                <div className="text-[9px] text-neutral-500">
                                  {status.atWar
                                    ? "AT WAR"
                                    : status.peaceProtected
                                      ? "TRUCE ACTIVE"
                                      : `Relation ${kingdom.relations[target.id] ?? 0}`}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={
                                  !isMyTurn ||
                                  status.atWar ||
                                  status.peaceProtected
                                }
                                onClick={() =>
                                  declareWar(
                                    target.id
                                  )
                                }
                                className="rounded border border-red-800 bg-red-950/50 px-2 py-1 text-red-100 disabled:opacity-30"
                              >
                                Declare War
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !isMyTurn
                    }
                    onClick={
                      endOrders
                    }
                    className="w-full rounded-xl border border-amber-700 bg-amber-950/45 px-3 py-2 text-xs font-black uppercase tracking-wide text-amber-100 disabled:opacity-30"
                  >
                    End Orders / Pass
                  </button>
                </div>
              ) : null}

              {tab ===
              "SETTLEMENT" ? (
                selectedSettlement ? (
                  <SettlementInvestmentPanel
                    embedded
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-700 p-6 text-center text-xs text-neutral-500">
                    Select one of your settlements on the map to manage development, recruitment and fortifications.
                  </div>
                )
              ) : null}

              {tab ===
              "WAR" ? (
                selectedArmy ? (
                  <WarIntelligencePanel
                    embedded
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-700 p-6 text-center text-xs text-neutral-500">
                    Select one of your armies. Select a known enemy ghost to obtain engagement and terrain analysis.
                  </div>
                )
              ) : null}

              {tab ===
              "DIPLOMACY" ? (
                <DiplomaticLawPanel
                  embedded
                />
              ) : null}

              {tab ===
              "LORDS" ? (
                <LordMilitaryPoliticsPanel
                  embedded
                />
              ) : null}

              {tab ===
              "BRIEFING" ? (
                <StrategicBriefingPanel
                  embedded
                />
              ) : null}
            </div>

            {message ? (
              <div className="border-t border-neutral-800 bg-black/40 px-4 py-2 text-[10px] text-neutral-300">
                {message}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
