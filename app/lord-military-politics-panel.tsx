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
  inspectKingdomMilitaryPolitics,
  estimateLordOrderObedience,
} from "@/lib/lords/military-politics";

import {
  issueCharacterOrder,
} from "@/lib/lords/service";

import type {
  LordOrderType,
} from "@/types/lords";

function bandClass(
  band: string
): string {
  switch (
    band
  ) {
    case "excellent":
    case "reliable":
      return "text-emerald-200";

    case "good":
    case "likely":
      return "text-green-200";

    case "adequate":
    case "uncertain":
      return "text-amber-200";

    case "resistant":
      return "text-orange-200";

    case "poor":
    case "hostile":
    case "critical":
      return "text-red-200";

    default:
      return "text-neutral-200";
  }
}

export default function LordMilitaryPoliticsPanel({ embedded = false }: { embedded?: boolean } = {}) {
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
    selectedLordId,
    setSelectedLordId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    risk,
    setRisk,
  ] =
    useState(
      50
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

  if (!player) {
    return null;
  }

  const inspection =
    inspectKingdomMilitaryPolitics(
      world.session.id,
      player.id
    );

  if (
    !inspection.ok ||
    inspection.lords
      .length ===
      0
  ) {
    return null;
  }

  const selected =
    inspection.lords.find(
      (lord) =>
        lord.characterId ===
        selectedLordId
    ) ??
    inspection.lords[
      0
    ];

  if (!selected) {
    return null;
  }

  const isMyTurn =
    world.session
      .commandCycle
      .currentPlayerId ===
    player.id;

  const selectedNodeId =
    interaction
      .selectedStrategicNodeId ??
    interaction
      .destinationNodeId;

  const selectedSettlementId =
    interaction
      .selectedSettlementId ??
    interaction
      .destinationSettlementId;

  function forecast(
    type:
      LordOrderType
  ) {
    return estimateLordOrderObedience(
      selected.characterId,
      type,
      risk
    );
  }

  async function issue(
    type:
      LordOrderType
  ) {
    const needsNode =
      type ===
        "REINFORCE" ||
      type ===
        "BRING_ARMY";

    const needsSettlement =
      type ===
      "DEFEND_SETTLEMENT";

    if (
      needsNode &&
      !selectedNodeId
    ) {
      setMessage(
        "Select a strategic node on the map first."
      );

      return;
    }

    if (
      needsSettlement &&
      !selectedSettlementId
    ) {
      setMessage(
        "Select a settlement on the map first."
      );

      return;
    }

    const result =
      await issueCharacterOrder(
        world.session.id,
        player.id,
        selected.characterId,
        {
          type,
          targetNodeId:
            needsNode
              ? selectedNodeId ??
                undefined
              : undefined,
          targetSettlementId:
            needsSettlement
              ? selectedSettlementId ??
                undefined
              : undefined,
          risk,
          note:
            "Issued from Lord Military Politics command panel.",
        }
      );

    if (!result.ok) {
      setMessage(
        `Lord order failed: ${result.error}`
      );

      return;
    }

    const order =
      result.order;

    setMessage(
      order.response
        ? `${order.response}: ${order.responseSummary ?? "No response summary."}`
        : `Order ${order.id} dispatched; awaiting delivery/response.`
    );
  }

  const orderButtons:
    Array<{
      type:
        LordOrderType;
      label:
        string;
    }> = [
      {
        type:
          "HOLD_POSITION",
        label:
          "Hold Position",
      },
      {
        type:
          "RAISE_TROOPS",
        label:
          "Raise Troops",
      },
      {
        type:
          "BRING_ARMY",
        label:
          "Bring Army",
      },
      {
        type:
          "REINFORCE",
        label:
          "Reinforce",
      },
      {
        type:
          "DEFEND_SETTLEMENT",
        label:
          "Defend Settlement",
      },
    ];

  return (
    <aside className={embedded ? "max-h-[62vh] w-full overflow-y-auto rounded-xl border border-violet-900/60 bg-black/55 p-3 text-neutral-100" : "fixed left-[438px] top-[84px] z-[81] max-h-[76vh] w-[410px] overflow-y-auto rounded-xl border border-violet-900/60 bg-black/88 p-3 text-neutral-100 shadow-2xl backdrop-blur"}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
        Lord Military Politics
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {inspection.lords.map(
          (lord) => (
            <button
              key={
                lord.characterId
              }
              type="button"
              onClick={() =>
                setSelectedLordId(
                  lord.characterId
                )
              }
              className={`rounded border px-2 py-1 text-[9px] ${
                lord.characterId ===
                selected.characterId
                  ? "border-violet-300 bg-violet-950 text-violet-100"
                  : "border-neutral-700 bg-neutral-900 text-neutral-400"
              }`}
            >
              {lord.title}
            </button>
          )
        )}
      </div>

      <div className="mt-2 rounded border border-white/10 bg-white/5 p-2 text-[10px]">
        <div className="text-xs font-bold">
          {selected.title}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1">
          <span className="text-neutral-500">
            Loyalty
          </span>
          <span className="text-right">
            {selected.loyalty}
          </span>

          <span className="text-neutral-500">
            Ruler relation
          </span>
          <span className="text-right">
            {selected.relationshipToRuler}
          </span>

          <span className="text-neutral-500">
            Political power
          </span>
          <span className="text-right">
            {selected.politicalPower}
          </span>

          <span className="text-neutral-500">
            Controlled troops
          </span>
          <span className="text-right">
            {selected.controlledSoldiers.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded border border-cyan-900/40 bg-cyan-950/10 p-2">
          <div className="text-neutral-500">
            Commander suitability
          </div>

          <div
            className={`mt-1 text-sm font-black uppercase ${bandClass(
              selected
                .commanderSuitability
                .band
            )}`}
          >
            {
              selected
                .commanderSuitability
                .band
            }{" "}
            {selected
              .commanderSuitability
              .score}
          </div>
        </div>

        <div className="rounded border border-amber-900/40 bg-amber-950/10 p-2">
          <div className="text-neutral-500">
            Obedience
          </div>

          <div
            className={`mt-1 text-sm font-black uppercase ${bandClass(
              selected.obedience
                .band
            )}`}
          >
            {selected.obedience.band}{" "}
            {selected.obedience.baseScore}
          </div>
        </div>
      </div>

      <div className="mt-2 rounded border border-red-900/40 bg-red-950/10 p-2 text-[10px]">
        <div className="flex justify-between">
          <span className="font-bold text-red-200">
            Political Risk
          </span>

          <span
            className={`font-black uppercase ${bandClass(
              selected
                .politicalRisk
                .level
            )}`}
          >
            {selected
              .politicalRisk
              .level}{" "}
            {selected
              .politicalRisk
              .score}
          </span>
        </div>

        {selected
          .politicalRisk
          .reasons
          .slice(
            0,
            3
          )
          .map(
            (reason) => (
              <div
                key={reason}
                className="mt-1 text-neutral-400"
              >
                • {reason}
              </div>
            )
          )}
      </div>

      <div className="mt-2 rounded border border-white/10 bg-white/5 p-2 text-[10px]">
        <div className="font-bold">
          Military Readiness
        </div>

        <div className="mt-1 grid grid-cols-2 gap-1 text-neutral-400">
          <span>
            Active armies
          </span>
          <span className="text-right">
            {selected
              .militaryReadiness
              .activeArmyCount}
          </span>

          <span>
            Marching
          </span>
          <span className="text-right">
            {selected
              .militaryReadiness
              .marchingArmyCount}
          </span>

          <span>
            In battle
          </span>
          <span className="text-right">
            {selected
              .militaryReadiness
              .battleArmyCount}
          </span>

          <span>
            Avg morale
          </span>
          <span className="text-right">
            {selected
              .militaryReadiness
              .averageMorale}
          </span>

          <span>
            Supply problems
          </span>
          <span className="text-right">
            {selected
              .militaryReadiness
              .underSuppliedArmyCount}
          </span>

          <span>
            Funding problems
          </span>
          <span className="text-right">
            {selected
              .militaryReadiness
              .underFundedArmyCount}
          </span>
        </div>
      </div>

      <div className="mt-2 rounded border border-white/10 bg-white/5 p-2 text-[10px]">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="lord-order-risk"
            className="font-bold"
          >
            Order risk
          </label>

          <span>
            {risk}/100
          </span>
        </div>

        <input
          id="lord-order-risk"
          type="range"
          min={0}
          max={100}
          value={risk}
          onChange={(
            event
          ) =>
            setRisk(
              Number(
                event.target
                  .value
              )
            )
          }
          className="mt-1 w-full"
        />

        <div className="mt-2 grid grid-cols-2 gap-1">
          {orderButtons.map(
            ({
              type,
              label,
            }) => {
              const prediction =
                forecast(
                  type
                );

              return (
                <button
                  key={type}
                  type="button"
                  disabled={
                    !isMyTurn
                  }
                  onClick={() =>
                    void issue(
                      type
                    )
                  }
                  className="rounded border border-violet-800 bg-violet-950/40 p-2 text-left disabled:opacity-30"
                >
                  <div className="font-bold text-violet-100">
                    {label}
                  </div>

                  <div
                    className={`mt-1 text-[9px] uppercase ${bandClass(
                      prediction
                        ?.band ??
                        "unknown"
                    )}`}
                  >
                    Forecast:{" "}
                    {prediction
                      ?.band ??
                      "unknown"}{" "}
                    {prediction
                      ?.score ??
                      "?"}
                  </div>
                </button>
              );
            }
          )}
        </div>

        <div className="mt-2 text-[9px] text-neutral-500">
          Map target:{" "}
          {selectedNodeId ??
            selectedSettlementId ??
            "none"}
        </div>
      </div>

      {message ? (
        <div className="mt-2 rounded bg-white/5 p-2 text-[10px] text-neutral-300">
          {message}
        </div>
      ) : null}
    </aside>
  );
}
