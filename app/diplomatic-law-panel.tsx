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
  getDiplomaticPairStatus,
  DEFAULT_PEACE_TRUCE_MINUTES,
} from "@/lib/politics/diplomatic-law";

import {
  proposeAgreement,
} from "@/lib/politics/service";

import type {
  AgreementType,
} from "@/types/politics";

function formatRemaining(
  now: number,
  until?: number
): string {
  if (
    until ===
    undefined
  ) {
    return "";
  }

  const minutes =
    Math.max(
      0,
      until -
        now
    );

  if (
    minutes <=
    0
  ) {
    return "expired";
  }

  const days =
    Math.ceil(
      minutes /
        (
          24 *
          60
        )
    );

  return `${days}d`;
}

export default function DiplomaticLawPanel({ embedded = false }: { embedded?: boolean } = {}) {
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

  if (
    demo.mode !==
    "player"
  ) {
    return null;
  }

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

  const isMyTurn =
    world.session
      .commandCycle
      .currentPlayerId ===
    player.id;

  const now =
    world.simulation
      .worldTimeMinutes;

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

  const relevantIncidents =
    Object.values(
      world.session
        .borders
        .incidents
    )
      .filter(
        (incident) =>
          incident
            .fromKingdomId ===
            kingdom.id ||
          incident
            .toKingdomId ===
            kingdom.id
      )
      .sort(
        (a, b) =>
          b.occurredAt -
            a.occurredAt
      )
      .slice(
        0,
        3
      );

  function propose(
    targetKingdomId:
      string,
    type:
      AgreementType
  ) {
    const result =
      proposeAgreement(
        world.session.id,
        player.id,
        type,
        targetKingdomId,
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
                  ? "Mutual military passage through controlled strategic roads and border crossings."
                  : undefined,
            }
      );

    setMessage(
      result.ok
        ? `${type} proposal dispatched by courier.`
        : `Proposal failed: ${result.error}`
    );
  }

  return (
    <aside className={embedded ? "max-h-[62vh] w-full overflow-y-auto rounded-xl border border-indigo-900/60 bg-black/55 p-3 text-neutral-100" : "fixed bottom-4 right-4 z-[83] max-h-[70vh] w-[390px] overflow-y-auto rounded-xl border border-indigo-900/60 bg-black/88 p-3 text-neutral-100 shadow-2xl backdrop-blur"}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
        Diplomatic Law
      </div>

      <div className="mt-1 text-[10px] text-neutral-500">
        Access · non-aggression · truce · border incidents
      </div>

      <div className="mt-3 space-y-2">
        {foreignRealms.map(
          (target) => {
            const status =
              getDiplomaticPairStatus(
                kingdom.id,
                target.id
              );

            return (
              <div
                key={target.id}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-[10px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold">
                      {target.name}
                    </div>
                    <div className="text-neutral-500">
                      Relations{" "}
                      {kingdom
                        .relations[
                          target.id
                        ] ?? 0}
                    </div>
                  </div>

                  <div className="text-right">
                    {status.atWar ? (
                      <div className="font-black text-red-300">
                        AT WAR
                      </div>
                    ) : status
                        .peaceProtected ? (
                      <div className="font-black text-cyan-200">
                        TRUCE{" "}
                        {formatRemaining(
                          now,
                          status
                            .peaceProtectedUntil
                        )}
                      </div>
                    ) : (
                      <div className="text-neutral-400">
                        PEACE
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {status
                    .militaryAccess ? (
                    <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-emerald-200">
                      ACCESS
                    </span>
                  ) : (
                    <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-neutral-500">
                      NO ACCESS
                    </span>
                  )}

                  {status
                    .nonAggression ? (
                    <span className="rounded bg-blue-950 px-1.5 py-0.5 text-blue-200">
                      NAP
                    </span>
                  ) : null}

                  {status
                    .alliance ? (
                    <span className="rounded bg-violet-950 px-1.5 py-0.5 text-violet-200">
                      ALLIANCE
                    </span>
                  ) : null}

                  {status
                    .militarySupport ? (
                    <span className="rounded bg-amber-950 px-1.5 py-0.5 text-amber-200">
                      SUPPORT
                    </span>
                  ) : null}
                </div>

                {!status.atWar ? (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      disabled={
                        !isMyTurn ||
                        status
                          .militaryAccess
                      }
                      onClick={() =>
                        propose(
                          target.id,
                          "MILITARY_ACCESS"
                        )
                      }
                      className="rounded border border-emerald-800 bg-emerald-950/50 px-2 py-1 text-emerald-100 disabled:opacity-30"
                    >
                      Request Access
                    </button>

                    <button
                      type="button"
                      disabled={
                        !isMyTurn ||
                        status
                          .nonAggression
                      }
                      onClick={() =>
                        propose(
                          target.id,
                          "NON_AGGRESSION"
                        )
                      }
                      className="rounded border border-blue-800 bg-blue-950/50 px-2 py-1 text-blue-100 disabled:opacity-30"
                    >
                      Propose NAP
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={
                      !isMyTurn
                    }
                    onClick={() =>
                      propose(
                        target.id,
                        "PEACE"
                      )
                    }
                    className="mt-2 w-full rounded border border-cyan-800 bg-cyan-950/50 px-2 py-1 text-cyan-100 disabled:opacity-30"
                  >
                    Propose 7-Day Peace
                  </button>
                )}

                {status
                  .peaceProtected ? (
                  <div className="mt-2 rounded bg-cyan-950/30 p-1.5 text-cyan-200">
                    War declaration blocked until truce expires.
                  </div>
                ) : null}
              </div>
            );
          }
        )}
      </div>

      {relevantIncidents.length >
      0 ? (
        <details className="mt-3 rounded border border-red-900/40 bg-red-950/10 p-2 text-[10px]">
          <summary className="cursor-pointer font-bold text-red-200">
            Recent border incidents
          </summary>

          <div className="mt-2 space-y-1">
            {relevantIncidents.map(
              (incident) => (
                <div
                  key={incident.id}
                  className="rounded bg-black/35 p-1.5"
                >
                  <div className="font-semibold">
                    {incident
                      .fromKingdomId} →{" "}
                    {incident
                      .toKingdomId}
                  </div>

                  <div className="text-neutral-500">
                    {incident.edgeId} · relation{" "}
                    {incident.relationPenalty}
                  </div>
                </div>
              )
            )}
          </div>
        </details>
      ) : null}

      {message ? (
        <div className="mt-2 rounded bg-white/5 p-2 text-[10px] text-neutral-300">
          {message}
        </div>
      ) : null}
    </aside>
  );
}
