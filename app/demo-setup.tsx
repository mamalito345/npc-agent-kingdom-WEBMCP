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
  configureKingdomControllers,
  startObserverDemo,
} from "@/lib/demo/config";

export default function DemoSetup() {
  const world = useSyncExternalStore(
    subscribeWorldState,
    getWorldState,
    getWorldState
  );

  const players = useMemo(
    () => Object.values(world.session.players).filter((player) => player.active),
    [world.session.players]
  );

  const [open, setOpen] = useState(true);

  const [controllers, setControllers] = useState<Record<string, "HUMAN" | "LLM">>(
    () =>
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player.controllerType === "human" ? "HUMAN" : "LLM",
        ])
      )
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-amber-700/40 bg-neutral-950 p-6 shadow-2xl">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            Living Strategy World
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Humans and AI inhabit the same canonical world.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Human players and Player LLMs command kingdoms through the same gameplay
            actions. A separate GM LLM plays NPC characters and selects bounded world
            events. No model directly mutates canonical state.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {players.map((player) => (
            <div
              key={player.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3"
            >
              <div className="text-sm font-semibold text-white">
                {world.kingdoms[player.kingdomId]?.name ?? player.kingdomId}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {player.displayName}
              </div>

              <select
                value={controllers[player.id] ?? "LLM"}
                onChange={(event) =>
                  setControllers((current) => ({
                    ...current,
                    [player.id]: event.target.value as "HUMAN" | "LLM",
                  }))
                }
                className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-neutral-200"
              >
                <option value="HUMAN">HUMAN</option>
                <option value="LLM">LLM</option>
              </select>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
          <div className="text-sm font-semibold text-violet-200">
            GM LLM — separate system actor
          </div>
          <div className="mt-1 text-xs text-violet-300/70">
            Character Mode: lords / advisors / commanders · World Director Mode:
            predefined event selection and bounded proposals.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              configureKingdomControllers(controllers);
              setOpen(false);
            }}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            Start configured game
          </button>

          <button
            type="button"
            onClick={() => {
              startObserverDemo();
              setOpen(false);
            }}
            className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-300"
          >
            Start Observer Demo — 5 AI Kingdoms
          </button>
        </div>
      </div>
    </div>
  );
}
