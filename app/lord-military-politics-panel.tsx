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

import {
  getLordCorrespondence,
  sendLordCorrespondence,
} from "@/lib/lords/communication";

import type {
  LordOrderType,
} from "@/types/lords";

function bandClass(
  band: string
): string {
  switch (band) {
    case "excellent":
    case "reliable":
    case "likely":
      return "text-emerald-300";
    case "uncertain":
    case "adequate":
      return "text-amber-300";
    case "resistant":
      return "text-orange-300";
    case "hostile":
    case "critical":
    case "poor":
      return "text-red-300";
    default:
      return "text-neutral-300";
  }
}

function formatDelay(
  now: number,
  at?: number
): string {
  if (at === undefined) return "";
  const minutes =
    Math.max(
      0,
      at -
      now
    );
  if (minutes < 60) {
    return `${Math.ceil(minutes)}m`;
  }
  return `${Math.ceil(minutes / 60)}h`;
}

export default function LordMilitaryPoliticsPanel({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
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
    text,
    setText,
  ] =
    useState(
      ""
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
    inspection.lords.length ===
      0
  ) {
    return (
      <div className="text-xs text-neutral-500">
        No autonomous lords belong to this realm.
      </div>
    );
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

  const rulerCharacterId =
    player.characterId;

  const thread =
    getLordCorrespondence(
      rulerCharacterId,
      selected.characterId
    );

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

  const orders =
    Object.values(
      world.session
        .lords
        .orders
    )
      .filter(
        (order) =>
          order.lordCharacterId ===
            selected.characterId &&
          order.playerId ===
            player.id
      )
      .sort(
        (a, b) =>
          b.issuedAt -
          a.issuedAt
      )
      .slice(
        0,
        4
      );

  async function sendMessage() {
    const current =
      text.trim();

    if (!current) {
      return;
    }

    const result =
      await sendLordCorrespondence(
        world.session.id,
        player.id,
        selected.characterId,
        current
      );

    if (!result.ok) {
      setMessage(
        `Message failed: ${result.error}`
      );
      return;
    }

    setText(
      ""
    );

    setMessage(
      result.mode ===
        "courier"
        ? `Courier dispatched. Lord receives the letter in roughly ${formatDelay(
            world.simulation
              .worldTimeMinutes,
            result.expectedLordReceiptAt
          )}; the reply then travels back.`
        : "The lord is present; the exchange is immediate."
    );
  }

  async function issue(
    type:
      LordOrderType
  ) {
    const targetNode =
      type ===
        "BRING_ARMY" ||
      type ===
        "REINFORCE"
        ? selectedNodeId ??
          undefined
        : undefined;

    const targetSettlement =
      type ===
        "DEFEND_SETTLEMENT"
        ? selectedSettlementId ??
          undefined
        : undefined;

    if (
      (
        type ===
          "BRING_ARMY" ||
        type ===
          "REINFORCE"
      ) &&
      !targetNode
    ) {
      setMessage(
        "Select the strategic destination on the map first. The lord's army will physically march there if he accepts."
      );
      return;
    }

    if (
      type ===
        "DEFEND_SETTLEMENT" &&
      !targetSettlement
    ) {
      setMessage(
        "Select the settlement to defend on the map first."
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
            targetNode,
          targetSettlementId:
            targetSettlement,
          risk,
          note:
            text.trim() ||
            "Formal royal command.",
        }
      );

    if (!result.ok) {
      setMessage(
        `Order failed: ${result.error}`
      );
      return;
    }

    const order =
      result.order;

    setText(
      ""
    );

    setMessage(
      order.response
        ? `${order.response}: ${order.responseSummary ?? ""}`
        : "Order dispatched by courier. The lord has not received it yet."
    );
  }

  const actions:
    Array<{
      type: LordOrderType;
      icon: string;
      title: string;
      description: string;
    }> = [
      {
        type:
          "BRING_ARMY",
        icon:
          "➜",
        title:
          "March to selected position",
        description:
          selectedNodeId
            ? `Target: ${selectedNodeId}`
            : "Select a pass, junction, hill or other map node first.",
      },
      {
        type:
          "DEFEND_SETTLEMENT",
        icon:
          "🛡",
        title:
          "Defend selected settlement",
        description:
          selectedSettlementId
            ? `Target: ${selectedSettlementId}`
            : "Select a settlement first.",
      },
      {
        type:
          "REINFORCE",
        icon:
          "⚔",
        title:
          "Reinforce selected position",
        description:
          selectedNodeId
            ? `Target: ${selectedNodeId}`
            : "Select a battlefield/strategic node first.",
      },
      {
        type:
          "HOLD_POSITION",
        icon:
          "⛨",
        title:
          "Hold current ground",
        description:
          "Stops the lord's household forces and orders them to hold.",
      },
      {
        type:
          "RAISE_TROOPS",
        icon:
          "♟",
        title:
          "Raise household troops",
        description:
          "Uses the lord's canonical home settlement recruitment resources.",
      },
    ];

  return (
    <div
      className={
        embedded
          ? "w-full text-neutral-100"
          : "fixed right-20 top-24 z-[92] w-[430px] rounded-2xl border border-violet-900/60 bg-black/95 p-3 text-neutral-100 shadow-2xl"
      }
    >
      <div className="grid grid-cols-[118px_1fr] gap-3">
        <div className="space-y-1">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
            Your Lords
          </div>

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
                className={`w-full rounded-xl border p-2 text-left ${
                  lord.characterId ===
                  selected.characterId
                    ? "border-violet-400 bg-violet-950/45"
                    : "border-neutral-800 bg-neutral-950/50 hover:border-neutral-600"
                }`}
              >
                <div className="truncate text-[10px] font-bold">
                  {lord.title}
                </div>
                <div className={`mt-1 text-[8px] uppercase ${bandClass(lord.obedience.band)}`}>
                  {lord.obedience.band}
                </div>
                <div className="mt-1 text-[8px] text-neutral-500">
                  Loyalty {lord.loyalty}
                </div>
              </button>
            )
          )}
        </div>

        <div className="min-w-0">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold">
                  {selected.title}
                </div>
                <div className="mt-1 text-[9px] text-neutral-500">
                  {world.characters[selected.characterId]?.name ?? selected.characterId}
                </div>
              </div>

              <div className={`text-[9px] font-black uppercase ${bandClass(selected.obedience.band)}`}>
                {selected.obedience.band}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1 text-[9px]">
              <div className="rounded bg-black/30 p-2">
                <div className="text-neutral-500">
                  Loyalty
                </div>
                <div className="font-bold">
                  {selected.loyalty}
                </div>
              </div>
              <div className="rounded bg-black/30 p-2">
                <div className="text-neutral-500">
                  Relation
                </div>
                <div className="font-bold">
                  {selected.relationshipToRuler}
                </div>
              </div>
              <div className="rounded bg-black/30 p-2">
                <div className="text-neutral-500">
                  Soldiers
                </div>
                <div className="font-bold">
                  {selected.controlledSoldiers.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-[9px] font-black uppercase tracking-wide text-neutral-400">
              Correspondence
            </div>

            <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/55 p-2">
              {thread.length ===
              0 ? (
                <div className="py-4 text-center text-[9px] text-neutral-600">
                  No letters exchanged yet.
                </div>
              ) : (
                thread.map(
                  (entry) => (
                    <div
                      key={
                        entry.id
                      }
                      className={`max-w-[88%] rounded-lg px-2 py-1.5 text-[9px] ${
                        entry.direction ===
                        "outgoing"
                          ? "ml-auto bg-amber-950/50 text-amber-100"
                          : "mr-auto bg-violet-950/60 text-violet-100"
                      }`}
                    >
                      <div>
                        {entry.text}
                      </div>
                      <div className="mt-1 text-[7px] text-neutral-500">
                        {entry.delivered
                          ? "delivered"
                          : "courier traveling"}
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <div className="mt-1 flex gap-1">
              <input
                value={
                  text
                }
                onChange={(
                  event
                ) =>
                  setText(
                    event.target.value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Write to your lord…"
                className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-black/55 px-2 py-2 text-[10px] outline-none focus:border-violet-500"
              />

              <button
                type="button"
                disabled={
                  !isMyTurn ||
                  !text.trim()
                }
                onClick={() =>
                  void sendMessage()
                }
                className="rounded-lg border border-violet-700 bg-violet-950/50 px-3 text-[10px] font-bold text-violet-100 disabled:opacity-30"
              >
                Send
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-wide text-neutral-400">
                Formal Commands
              </div>

              <label className="text-[8px] text-neutral-500">
                risk {risk}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={
                    risk
                  }
                  onChange={(
                    event
                  ) =>
                    setRisk(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="ml-2 w-16 align-middle"
                />
              </label>
            </div>

            <div className="mt-1 space-y-1">
              {actions.map(
                (action) => {
                  const forecast =
                    estimateLordOrderObedience(
                      selected.characterId,
                      action.type,
                      risk
                    );

                  return (
                    <button
                      key={
                        action.type
                      }
                      type="button"
                      disabled={
                        !isMyTurn
                      }
                      onClick={() =>
                        void issue(
                          action.type
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/55 p-2 text-left hover:border-violet-700 disabled:opacity-30"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-violet-800 bg-violet-950/50">
                        {action.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold">
                          {action.title}
                        </span>
                        <span className="block truncate text-[8px] text-neutral-500">
                          {action.description}
                        </span>
                      </span>

                      <span className={`text-[8px] font-black uppercase ${bandClass(forecast?.band ?? "uncertain")}`}>
                        {forecast?.band ?? "uncertain"}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {orders.length >
          0 ? (
            <div className="mt-3">
              <div className="text-[9px] font-black uppercase tracking-wide text-neutral-400">
                Recent Orders
              </div>

              <div className="mt-1 space-y-1">
                {orders.map(
                  (order) => (
                    <div
                      key={
                        order.id
                      }
                      className="rounded-lg border border-neutral-800 bg-black/30 p-2 text-[8px]"
                    >
                      <div className="flex justify-between gap-2">
                        <span>
                          {order.type.replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                        <span className="font-bold text-neutral-300">
                          {order.status}
                        </span>
                      </div>
                      {order.responseSummary ? (
                        <div className="mt-1 text-neutral-500">
                          {order.responseSummary}
                        </div>
                      ) : null}
                    </div>
                  )
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {message ? (
        <div className="mt-3 rounded-lg border border-neutral-800 bg-black/50 p-2 text-[9px] text-neutral-300">
          {message}
        </div>
      ) : null}
    </div>
  );
}
