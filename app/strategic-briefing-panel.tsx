"use client";

import {
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  getLatestDeliveredStrategicBriefing,
} from "@/lib/session/strategic-briefing";

function severityClass(
  severity:
    string
): string {
  switch (
    severity
  ) {
    case "critical":
      return "border-red-700 bg-red-950/50 text-red-100";

    case "urgent":
      return "border-orange-700 bg-orange-950/40 text-orange-100";

    case "attention":
      return "border-amber-700 bg-amber-950/30 text-amber-100";

    default:
      return "border-neutral-700 bg-neutral-950/50 text-neutral-200";
  }
}

export default function StrategicBriefingPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const playerId =
    world.session
      .localPlayerId;

  const briefing =
    getLatestDeliveredStrategicBriefing(
      playerId
    );

  if (!briefing) {
    return null;
  }

  const interrupt =
    world.session
      .commandCycle
      .interrupt;

  const relevantInterrupt =
    interrupt?.type ===
      "STRATEGIC_BRIEFING" &&
    interrupt
      .affectedPlayerIds
      .includes(
        playerId
      );

  return (
    <aside className={embedded ? "max-h-[62vh] w-full overflow-y-auto rounded-xl border border-slate-700 bg-black/55 p-3 text-neutral-100" : "fixed bottom-4 left-[450px] z-[85] max-h-[66vh] w-[430px] overflow-y-auto rounded-xl border border-slate-700 bg-black/90 p-3 text-neutral-100 shadow-2xl backdrop-blur"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
            Strategic Briefing
          </div>

          <div className="mt-1 text-[9px] text-neutral-500">
            Since minute{" "}
            {briefing.since} · delivered{" "}
            {briefing.generatedAt}
          </div>
        </div>

        <span
          className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${severityClass(
            briefing.severity
          )}`}
        >
          {briefing.severity}
        </span>
      </div>

      {relevantInterrupt ? (
        <div className="mt-2 rounded border border-red-700/60 bg-red-950/35 p-2 text-[10px] text-red-100">
          Command attention required:{" "}
          {interrupt.message}
        </div>
      ) : (
        <div className="mt-2 rounded bg-white/5 p-2 text-[10px] text-neutral-400">
          {briefing.meaningful
            ? "Material developments were recorded in this briefing."
            : "Routine briefing only — command flow was not interrupted."}
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded bg-white/5 p-2">
          <div className="font-bold text-amber-200">
            Realm Economy
          </div>

          <div className="mt-1 grid grid-cols-2 gap-1 text-neutral-400">
            <span>
              Treasury
            </span>
            <span className="text-right">
              {briefing.economy.treasury.toFixed(
                0
              )}
            </span>

            <span>
              Net/day
            </span>
            <span className="text-right">
              {briefing.economy.projectedDailyNetGold.toFixed(
                1
              )}
            </span>

            <span>
              Army cost
            </span>
            <span className="text-right">
              {briefing.economy.dailyArmyCostGold.toFixed(
                1
              )}
            </span>

            <span>
              Reserve days
            </span>
            <span className="text-right">
              {briefing.economy.reserveCoverageDays.toFixed(
                1
              )}
            </span>
          </div>
        </div>

        <div className="rounded bg-white/5 p-2">
          <div className="font-bold text-emerald-200">
            Territory
          </div>

          <div className="mt-1 grid grid-cols-2 gap-1 text-neutral-400">
            <span>
              Home nodes
            </span>
            <span className="text-right">
              {briefing.territory.homeNodeCount}
            </span>

            <span>
              Contested
            </span>
            <span className="text-right">
              {briefing.territory.contestedNodeCount}
            </span>

            <span>
              Occupied
            </span>
            <span className="text-right">
              {briefing.territory.occupiedNodeCount}
            </span>

            <span>
              Disrupted
            </span>
            <span className="text-right">
              {briefing.territory.disruptedGold.toFixed(
                1
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="text-[10px] font-bold uppercase text-neutral-300">
          New Developments
        </div>

        {briefing.items.length ===
        0 ? (
          <div className="mt-2 rounded bg-white/5 p-2 text-[10px] text-neutral-500">
            No material new developments.
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            {briefing.items.map(
              (item) => (
                <div
                  key={item.id}
                  className={`rounded border p-2 text-[10px] ${severityClass(
                    item.severity
                  )}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-black uppercase">
                      {item.category}
                    </span>

                    <span className="uppercase opacity-70">
                      {item.severity}
                    </span>
                  </div>

                  <div className="mt-1">
                    {item.summary}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="mt-2 text-[9px] text-neutral-600">
        This briefing summarizes delivered player knowledge and your realm&apos;s own exact state. It does not reveal hidden enemy canonical positions.
      </div>
    </aside>
  );
}
