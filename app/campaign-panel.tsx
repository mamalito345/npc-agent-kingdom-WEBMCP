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
  inspectPlayerCampaignStatus,
} from "@/lib/session/campaign-observation";

export default function CampaignPanel() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const playerId =
    world.session
      .localPlayerId;

  const result =
    inspectPlayerCampaignStatus(
      world.session.id,
      playerId
    );

  if (
    result.ok ===
    false
  ) {
    return null;
  }

  const status =
    result.status;

  const complete =
    status.objectives
      .filter(
        (objective) =>
          objective.status ===
          "COMPLETE"
      ).length;

  return (
    <>
      <aside className="fixed bottom-5 left-5 z-[76] w-[330px] rounded-2xl border border-neutral-700/70 bg-[#0b0d0f]/95 text-neutral-100 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() =>
            setOpen(
              (current) =>
                !current
            )
          }
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
              Campaign
            </div>

            <div className="mt-1 text-sm font-semibold">
              {status.capitalsControlled}/{status.totalCapitals} capitals controlled
            </div>
          </div>

          <div className="rounded-full border border-neutral-700 px-2 py-1 text-[10px]">
            {complete}/{status.objectives.length}
          </div>
        </button>

        {open ? (
          <div className="max-h-[54vh] space-y-2 overflow-y-auto border-t border-neutral-800 p-3">
            {status.objectives.map(
              (
                objective
              ) => (
                <div
                  key={
                    objective.id
                  }
                  className={`rounded-xl border p-3 ${
                    objective.status ===
                      "COMPLETE"
                      ? "border-emerald-800 bg-emerald-950/25"
                      : objective.status ===
                          "FAILED"
                        ? "border-red-800 bg-red-950/25"
                        : "border-neutral-800 bg-neutral-900/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold">
                      {
                        objective.title
                      }
                    </div>

                    <div className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
                      {
                        objective.status
                      }
                    </div>
                  </div>

                  <div className="mt-1 text-[11px] leading-5 text-neutral-400">
                    {
                      objective.description
                    }
                  </div>

                  <div className="mt-2 text-[10px] text-neutral-500">
                    {
                      objective.summary
                    }
                  </div>
                </div>
              )
            )}
          </div>
        ) : null}
      </aside>

      {status.outcome !==
      "ONGOING" ? (
        <div className="fixed inset-0 z-[140] grid place-items-center bg-black/75 p-6 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-3xl border p-8 text-center shadow-2xl ${
            status.outcome ===
              "VICTORY"
              ? "border-amber-500/80 bg-[#151006]"
              : "border-red-800/80 bg-[#170909]"
          }`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
              Campaign Result
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
              {status.outcome ===
                "VICTORY"
                ? "VICTORY"
                : "DEFEAT"}
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-neutral-300">
              {
                status.summary
              }
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
                <div className="text-neutral-500">
                  Capitals
                </div>
                <div className="mt-1 text-lg font-bold">
                  {status.capitalsControlled}/{status.totalCapitals}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
                <div className="text-neutral-500">
                  Armies
                </div>
                <div className="mt-1 text-lg font-bold">
                  {
                    status.activeOwnArmies
                  }
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
                <div className="text-neutral-500">
                  Stability
                </div>
                <div className="mt-1 text-lg font-bold">
                  {
                    status.stability
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
