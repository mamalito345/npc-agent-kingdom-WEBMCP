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
  getDiplomaticPairStatus,
  DEFAULT_PEACE_TRUCE_MINUTES,
} from "@/lib/politics/diplomatic-law";

import {
  proposeAgreement,
} from "@/lib/politics/service";

import type {
  AgreementType,
} from "@/types/politics";

function relationLabel(
  value: number
): string {
  if (value >= 60) return "Friendly";
  if (value >= 20) return "Cordial";
  if (value > -20) return "Neutral";
  if (value > -60) return "Hostile";
  return "Bitter enemies";
}

function formatRemaining(
  now: number,
  until?: number
): string {
  if (until === undefined) return "";
  const days =
    Math.max(
      0,
      Math.ceil(
        (
          until -
          now
        ) /
        1440
      )
    );
  return `${days}d`;
}

export default function DiplomaticLawPanel({
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

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(
      null
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

  if (
    !player ||
    !kingdom
  ) {
    return null;
  }

  const foreignRealms =
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

  const selected =
    foreignRealms.find(
      (realm) =>
        realm.id ===
        selectedId
    ) ??
    foreignRealms[
      0
    ];

  if (!selected) {
    return null;
  }

  const status =
    getDiplomaticPairStatus(
      kingdom.id,
      selected.id
    );

  const now =
    world.simulation
      .worldTimeMinutes;

  const isMyTurn =
    world.session
      .commandCycle
      .currentPlayerId ===
    player.id;

  const agreements =
    Object.values(
      world.session
        .politics
        .agreements
    );

  const pendingByType =
    new Map(
      agreements
        .filter(
          (agreement) =>
            agreement.status ===
              "PROPOSED" &&
            agreement.partyKingdomIds
              .includes(
                kingdom.id
              ) &&
            agreement.partyKingdomIds
              .includes(
                selected.id
              )
        )
        .map(
          (agreement) => [
            agreement.type,
            agreement,
          ]
        )
    );

  function propose(
    type:
      AgreementType
  ) {
    if (
      pendingByType.has(
        type
      )
    ) {
      setMessage(
        `${type.replaceAll("_", " ")} proposal is already awaiting a reply.`
      );
      return;
    }

    const result =
      proposeAgreement(
        world.session.id,
        player.id,
        type,
        selected.id,
        type ===
          "PEACE"
          ? {
              terms:
                "Seven-day truce and cessation of hostilities.",
              expiresAt:
                now +
                DEFAULT_PEACE_TRUCE_MINUTES,
            }
          : {
              terms:
                type ===
                  "MILITARY_ACCESS"
                  ? "Military passage through controlled roads and border crossings."
                  : undefined,
            }
      );

    setMessage(
      result.ok
        ? `${type.replaceAll("_", " ")} proposal sent. It is not active until the other realm accepts it.`
        : `Proposal failed: ${result.error}`
    );
  }

  const relation =
    kingdom.relations[
      selected.id
    ] ??
    0;

  return (
    <div
      className={
        embedded
          ? "w-full text-neutral-100"
          : "fixed right-20 top-24 z-[92] w-[400px] rounded-2xl border border-indigo-900/60 bg-black/95 p-3 text-neutral-100 shadow-2xl"
      }
    >
      <div className="mb-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
          Diplomacy
        </div>
        <div className="mt-1 text-[10px] text-neutral-500">
          Select one realm. Only legally relevant actions are shown.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {foreignRealms.map(
          (realm) => {
            const pair =
              getDiplomaticPairStatus(
                kingdom.id,
                realm.id
              );

            return (
              <button
                key={
                  realm.id
                }
                type="button"
                onClick={() =>
                  setSelectedId(
                    realm.id
                  )
                }
                className={`rounded-xl border p-2 text-left ${
                  realm.id ===
                  selected.id
                    ? "border-indigo-400 bg-indigo-950/45"
                    : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-600"
                }`}
              >
                <div className="text-[11px] font-bold">
                  {realm.name}
                </div>
                <div className="mt-1 text-[9px] text-neutral-500">
                  {pair.atWar
                    ? "⚔ AT WAR"
                    : pair.peaceProtected
                      ? "🕊 TRUCE"
                      : relationLabel(
                          kingdom.relations[
                            realm.id
                          ] ??
                          0
                        )}
                </div>
              </button>
            );
          }
        )}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-bold">
              {selected.name}
            </div>
            <div className="text-[10px] text-neutral-500">
              Relations {relation} · {relationLabel(relation)}
            </div>
          </div>

          <div className="text-right text-[10px]">
            {status.atWar ? (
              <span className="font-black text-red-300">
                AT WAR
              </span>
            ) : status.peaceProtected ? (
              <span className="font-black text-cyan-200">
                TRUCE {formatRemaining(
                  now,
                  status.peaceProtectedUntil
                )}
              </span>
            ) : (
              <span className="text-neutral-400">
                PEACE
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1 text-[9px]">
          <span className={`rounded px-2 py-1 ${
            status.militaryAccess
              ? "bg-emerald-950 text-emerald-200"
              : "bg-neutral-900 text-neutral-500"
          }`}>
            {status.militaryAccess
              ? "MILITARY ACCESS"
              : "NO ACCESS"}
          </span>

          {status.nonAggression ? (
            <span className="rounded bg-blue-950 px-2 py-1 text-blue-200">
              NON-AGGRESSION
            </span>
          ) : null}

          {status.alliance ? (
            <span className="rounded bg-violet-950 px-2 py-1 text-violet-200">
              ALLIANCE
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          {!status.atWar ? (
            <>
              <button
                type="button"
                disabled={
                  !isMyTurn ||
                  status.militaryAccess ||
                  pendingByType.has(
                    "MILITARY_ACCESS"
                  )
                }
                onClick={() =>
                  propose(
                    "MILITARY_ACCESS"
                  )
                }
                className="flex w-full items-center justify-between rounded-lg border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-left text-[10px] disabled:opacity-35"
              >
                <span>Request military access</span>
                <span className="text-neutral-500">
                  {pendingByType.has(
                    "MILITARY_ACCESS"
                  )
                    ? "AWAITING REPLY"
                    : "SEND"}
                </span>
              </button>

              <button
                type="button"
                disabled={
                  !isMyTurn ||
                  status.nonAggression ||
                  pendingByType.has(
                    "NON_AGGRESSION"
                  )
                }
                onClick={() =>
                  propose(
                    "NON_AGGRESSION"
                  )
                }
                className="flex w-full items-center justify-between rounded-lg border border-blue-900 bg-blue-950/30 px-3 py-2 text-left text-[10px] disabled:opacity-35"
              >
                <span>Propose non-aggression pact</span>
                <span className="text-neutral-500">
                  {pendingByType.has(
                    "NON_AGGRESSION"
                  )
                    ? "AWAITING REPLY"
                    : "SEND"}
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={
                !isMyTurn ||
                pendingByType.has(
                  "PEACE"
                )
              }
              onClick={() =>
                propose(
                  "PEACE"
                )
              }
              className="flex w-full items-center justify-between rounded-lg border border-cyan-900 bg-cyan-950/30 px-3 py-2 text-left text-[10px] disabled:opacity-35"
            >
              <span>Offer seven-day peace / truce</span>
              <span className="text-neutral-500">
                {pendingByType.has(
                  "PEACE"
                )
                  ? "AWAITING REPLY"
                  : "SEND"}
              </span>
            </button>
          )}
        </div>

        {!status.atWar ? (
          <div className="mt-3 text-[9px] text-neutral-500">
            Peace is the current state, so there is no meaningless “offer peace” button. Peace terms only appear during an actual war.
          </div>
        ) : null}
      </div>

      {message ? (
        <div className="mt-3 rounded-lg border border-neutral-800 bg-black/40 p-2 text-[10px] text-neutral-300">
          {message}
        </div>
      ) : null}
    </div>
  );
}
