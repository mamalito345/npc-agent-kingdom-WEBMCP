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
  getMapInteractionState,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  getSettlementInvestmentPlan,
} from "@/lib/economy/settlement-investment";

import {
  getMapNode,
} from "@/lib/map/graph";

import {
  recruitPlayerUnits,
} from "@/lib/session/player-actions";

import {
  developPlayerSettlement,
  fortifyPlayerSettlement,
} from "@/lib/session/management-player-actions";

import type {
  SettlementDevelopmentFocus,
} from "@/types/settlement";

import type {
  UnitType,
} from "@/types/military";

function stockpileText(
  value: {
    gold: number;
    food: number;
    wood: number;
    stone: number;
    metal: number;
  }
): string {
  return [
    `G${value.gold}`,
    `F${value.food}`,
    `W${value.wood}`,
    `S${value.stone}`,
    `M${value.metal}`,
  ].join(" · ");
}

export default function SettlementInvestmentPanel({ embedded = false }: { embedded?: boolean } = {}) {
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

  const player =
    world.session.players[
      world.session
        .localPlayerId
    ];

  const settlementId =
    interaction
      .selectedSettlementId;

  if (
    !player ||
    !settlementId
  ) {
    return null;
  }

  const plan =
    getSettlementInvestmentPlan(
      settlementId,
      player.kingdomId
    );

  if (!plan.ok) {
    /*
     * Not our settlement (or investment data unavailable). Rather than
     * showing nothing, give a read-only intel card -- name, owner,
     * terrain, development, garrison-ish size -- so a foreign or
     * enemy settlement can still be inspected for war planning.
     */
    const foreignSettlement =
      world.settlements[
        settlementId
      ];

    if (!foreignSettlement) {
      return null;
    }

    const node =
      getMapNode(
        foreignSettlement.locationId
      );

    const ownerKingdom =
      world.kingdoms[
        foreignSettlement.kingdomId
      ];

    return (
      <aside className="pointer-events-auto fixed right-4 top-[84px] z-[85] w-[320px] rounded-xl border border-neutral-700/70 bg-black/85 p-3 text-neutral-100 shadow-2xl backdrop-blur">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
          Settlement Intel (read-only)
        </div>

        <div className="mt-1 text-sm font-semibold">
          {foreignSettlement.name}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-neutral-400">Owner</div>
            <div className="font-semibold">
              {ownerKingdom?.name ?? foreignSettlement.kingdomId}
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-neutral-400">Type</div>
            <div className="font-semibold capitalize">
              {foreignSettlement.type}
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-neutral-400">Terrain</div>
            <div className="font-semibold capitalize">
              {(node?.terrain ?? "unknown").replace(/_/g, " ")}
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-neutral-400">Fortification</div>
            <div className="font-semibold">
              {foreignSettlement.fortificationLevel ?? 0} / 3
            </div>
          </div>
        </div>

        {node?.features && node.features.length > 0 ? (
          <div className="mt-2 text-[10px] text-neutral-400">
            Features: {node.features.join(", ").replace(/_/g, " ")}
          </div>
        ) : null}

        <div className="mt-2 text-[10px] text-neutral-500">
          {plan.error === "NOT_CONTROLLER"
            ? "You do not control this settlement -- only public/observable details are shown, not its true garrison or stockpiles."
            : plan.error}
        </div>
      </aside>
    );
  }

  const controlledSettlement =
    plan.settlement;

  if (!controlledSettlement) {
    return null;
  }

  const isMyTurn =
    world.session
      .commandCycle
      .currentPlayerId ===
    player.id;

  function develop(
    focus:
      SettlementDevelopmentFocus
  ) {
    const result =
      developPlayerSettlement(
        world.session.id,
        player.id,
        controlledSettlement.id,
        focus
      );

    setMessage(
      result.ok
        ? `Development ordered: ${focus}.`
        : `Development failed: ${result.error}`
    );
  }

  function recruit(
    unitType:
      UnitType
  ) {
    const result =
      recruitPlayerUnits(
        world.session.id,
        player.id,
        controlledSettlement.id,
        unitType,
        1
      );

    setMessage(
      result.ok
        ? `${unitType} recruitment started (cost ${result.order.reservedResources.gold.toLocaleString()}g).`
        : `Recruitment failed: ${result.error}`
    );
  }

  function fortify() {
    const result =
      fortifyPlayerSettlement(
        world.session.id,
        player.id,
        controlledSettlement.id
      );

    setMessage(
      result.ok
        ? `Fortification project ${result.order.id} started.`
        : `Fortification failed: ${result.error}`
    );
  }

  return (
    <aside className={embedded ? "max-h-[62vh] w-full overflow-y-auto rounded-xl border border-emerald-900/60 bg-black/55 p-3 text-neutral-100" : "fixed left-4 top-[84px] z-[82] max-h-[76vh] w-[410px] overflow-y-auto rounded-xl border border-emerald-900/60 bg-black/88 p-3 text-neutral-100 shadow-2xl backdrop-blur"}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
        Settlement Investment
      </div>

      <div className="mt-1 text-sm font-bold">
        {controlledSettlement.id}
      </div>

      <div className="mt-2 rounded bg-white/5 p-2 text-[10px]">
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">
            Type
          </span>
          <span>
            {plan.settlement.type}
          </span>
        </div>

        <div className="mt-1 flex justify-between gap-2">
          <span className="text-neutral-500">
            Available local stock
          </span>
          <span className="text-right">
            {stockpileText(
              plan.settlement
                .availableResources
            )}
          </span>
        </div>
      </div>

      <div className="mt-2 rounded border border-amber-900/40 bg-amber-950/10 p-2 text-[10px]">
        <div className="font-bold uppercase text-amber-200">
          Realm Budget Context
        </div>

        <div className="mt-1 grid grid-cols-2 gap-1">
          <span>
            Treasury
          </span>
          <span className="text-right">
            {plan.strategicBudget.kingdomTreasury.toFixed(
              0
            )}
          </span>

          <span>
            Net / day
          </span>
          <span className="text-right">
            {plan.strategicBudget.projectedDailyNetGold.toFixed(
              1
            )}
          </span>

          <span>
            Advisory reserve
          </span>
          <span className="text-right">
            {plan.strategicBudget.recommendedReserveGold.toFixed(
              0
            )}
          </span>
        </div>
      </div>

      <details
        className="mt-2 rounded border border-white/10 bg-white/5 p-2"
        open
      >
        <summary className="cursor-pointer text-xs font-bold text-emerald-200">
          Development
        </summary>

        <div className="mt-2 text-[10px] text-neutral-400">
          Level{" "}
          {plan.settlement
            .developmentLevel}
          /3
        </div>

        <div className="mt-2 space-y-1">
          {plan.development.options.map(
            (option) => (
              <div
                key={option.focus}
                className="rounded bg-black/30 p-2 text-[10px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold uppercase">
                      {option.focus}
                    </div>
                    <div className="text-neutral-500">
                      {option.currentDailyProduction}
                      /day →{" "}
                      {option.projectedDailyProduction}
                      /day
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !isMyTurn ||
                      !option.canAfford ||
                      option.maxLevelReached
                    }
                    onClick={() =>
                      develop(
                        option.focus
                      )
                    }
                    className="rounded border border-emerald-700 bg-emerald-950/50 px-2 py-1 text-emerald-100 disabled:opacity-30"
                  >
                    INVEST
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {plan.development.nextCost ? (
          <div className="mt-2 text-[9px] text-neutral-500">
            Next development cost:{" "}
            {stockpileText(
              plan.development
                .nextCost
            )}
          </div>
        ) : null}
      </details>

      <details
        className="mt-2 rounded border border-white/10 bg-white/5 p-2"
        open
      >
        <summary className="cursor-pointer text-xs font-bold text-cyan-200">
          Recruitment
        </summary>

        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-neutral-400">
          <span>
            Military level
          </span>
          <span className="text-right">
            {plan.recruitment.militaryLevel}
          </span>

          <span>
            Manpower
          </span>
          <span className="text-right">
            {plan.recruitment.remainingManpower}
            /
            {plan.recruitment.mobilizationCapacity}
          </span>

          <span>
            Active slots
          </span>
          <span className="text-right">
            {plan.recruitment.activeOrders}
            /
            {plan.recruitment.baseSlots}
          </span>
        </div>

        <div className="mt-2 space-y-1">
          {plan.recruitment.options.map(
            (option) => (
              <div
                key={option.unitType}
                className="rounded bg-black/30 p-2 text-[10px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold uppercase">
                      {option.unitType}
                    </div>

                    {"durationDays" in option ? (
                      <>
                        <div className="text-neutral-500">
                          {option.durationDays}d · max now{" "}
                          {option.maxBlocksNow}
                        </div>
                        {option.costPerBlock ? (
                          <div className="text-[9px] text-neutral-600">
                            {stockpileText(
                              option.costPerBlock
                            )}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="text-neutral-600">
                        unavailable
                      </div>
                    )}
                  </div>

                  {"canRecruitOne" in option ? (
                    <button
                      type="button"
                      disabled={
                        !isMyTurn ||
                        !option.canRecruitOne
                      }
                      onClick={() =>
                        recruit(
                          option.unitType
                        )
                      }
                      className="rounded border border-cyan-700 bg-cyan-950/50 px-2 py-1 text-cyan-100 disabled:opacity-30"
                    >
                      +250
                    </button>
                  ) : null}
                </div>
              </div>
            )
          )}
        </div>
      </details>

      <details className="mt-2 rounded border border-white/10 bg-white/5 p-2">
        <summary className="cursor-pointer text-xs font-bold text-stone-200">
          Fortification
        </summary>

        <div className="mt-2 text-[10px]">
          Level{" "}
          {plan.fortification.currentLevel}
          /
          {plan.fortification.maximumLevel}
        </div>

        {plan.fortification.nextCost ? (
          <>
            <div className="mt-1 text-[9px] text-neutral-500">
              Next cost:{" "}
              {stockpileText(
                plan.fortification
                  .nextCost
              )}
            </div>

            <div className="text-[9px] text-neutral-500">
              Build time:{" "}
              {plan.fortification.durationDays}
              d
            </div>

            <button
              type="button"
              disabled={
                !isMyTurn ||
                !plan.fortification.canAfford
              }
              onClick={
                fortify
              }
              className="mt-2 w-full rounded border border-stone-600 bg-stone-900/70 px-2 py-1 text-[10px] font-bold disabled:opacity-30"
            >
              START FORTIFICATION
            </button>
          </>
        ) : (
          <div className="mt-1 text-[10px] text-neutral-500">
            Maximum fortification reached.
          </div>
        )}
      </details>

      {plan.warnings.length >
      0 ? (
        <div className="mt-2 rounded border border-red-900/50 bg-red-950/20 p-2 text-[10px] text-red-200">
          {plan.warnings.map(
            (warning) => (
              <div key={warning}>
                • {warning}
              </div>
            )
          )}
        </div>
      ) : null}

      {message ? (
        <div className="mt-2 rounded bg-white/5 p-2 text-[10px] text-neutral-300">
          {message}
        </div>
      ) : null}
    </aside>
  );
}
