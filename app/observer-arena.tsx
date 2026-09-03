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
  formatWorldTime,
  pauseWorld,
  resumeWorld,
} from "@/lib/world/time";

import {
  getDemoConfig,
  setDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

import {
  getObserverFeed,
  type ObserverFeedKind,
} from "@/lib/demo/observer";

import {
  loadDemoFromBrowser,
  saveDemoToBrowser,
} from "@/lib/demo/persistence";

import {
  requestReturnToMenu,
} from "@/lib/ui/navigation";

type Filter =
  | "ALL"
  | "PLAYER_LLM"
  | "TOOLS"
  | "CONVERSATIONS"
  | "DIPLOMACY"
  | "GM"
  | "BATTLES"
  | "EVENTS";

function matchesFilter(kind: ObserverFeedKind, filter: Filter): boolean {
  if (filter === "ALL") return true;
  if (filter === "PLAYER_LLM") return kind === "PLAYER_LLM";
  if (filter === "TOOLS") return kind === "TOOL";
  if (filter === "CONVERSATIONS") return kind === "CONVERSATION";
  if (filter === "DIPLOMACY") return kind === "DIPLOMACY";
  if (filter === "GM") return kind === "GM_CHARACTER" || kind === "WORLD_DIRECTOR";
  if (filter === "BATTLES") return kind === "BATTLE";
  return kind === "EVENT" || kind === "WORLD_DIRECTOR";
}

export default function ObserverArena() {
  const world = useSyncExternalStore(
    subscribeWorldState,
    getWorldState,
    getWorldState
  );

  const config = useSyncExternalStore(
    subscribeDemoConfig,
    getDemoConfig,
    getDemoConfig
  );

  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedKingdomId, setSelectedKingdomId] = useState("northreach");
  const [notice, setNotice] = useState("");

  const feed = useMemo(
    () => getObserverFeed(160).filter((entry) => matchesFilter(entry.kind, filter)),
    [
      filter,
      world.session.llmPlayers.decisions,
      world.session.director.events.traces,
      world.session.conversations,
      world.session.lords.orders,
      world.messages,
      world.battles,
    ]
  );

  const kingdom = world.kingdoms[selectedKingdomId];
  const player = Object.values(world.session.players).find(
    (candidate) => candidate.kingdomId === selectedKingdomId
  );

  const armies = Object.values(world.armies).filter(
    (army) => army.ownerId === selectedKingdomId
  );

  const lords = Object.values(world.session.lords.profiles).filter(
    (lord) => lord.kingdomId === selectedKingdomId
  );

  const planId = player
    ? world.session.llmPlayers.activePlanByPlayerId[player.id]
    : undefined;

  const plan = planId
    ? world.session.llmPlayers.plans[planId]
    : undefined;

  const lastDecision = player
    ? [...world.session.llmPlayers.decisions]
        .reverse()
        .find((decision) => decision.playerId === player.id)
    : undefined;

  const filters: Filter[] = [
    "ALL",
    "PLAYER_LLM",
    "TOOLS",
    "CONVERSATIONS",
    "DIPLOMACY",
    "GM",
    "BATTLES",
    "EVENTS",
  ];

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-[430px] flex-col border-l border-neutral-800 bg-neutral-950/95 text-neutral-100 shadow-2xl backdrop-blur">
      <div className="border-b border-neutral-800 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
              Observer Arena
            </div>
            <div className="mt-1 font-mono text-sm">
              {formatWorldTime(world.simulation.worldTimeMinutes)}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[1, 4, 8].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() =>
                  setDemoConfig({
                    speed: speed as 1 | 4 | 8,
                  })
                }
                className={`rounded border px-2 py-1 text-xs ${
                  config.speed === speed
                    ? "border-amber-400 bg-amber-950/50 text-amber-200"
                    : "border-neutral-700 bg-neutral-900 text-neutral-400"
                }`}
              >
                x{speed}
              </button>
            ))}

            <button
              type="button"
              title="Exit to menu"
              onClick={() => requestReturnToMenu()}
              className="ml-1 rounded border border-red-900/60 bg-red-950/40 px-2 py-1 text-xs text-red-200 hover:border-red-600"
            >
              ✕ Exit
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (world.simulation.paused) {
                resumeWorld();
                setDemoConfig({ running: true });
              } else {
                pauseWorld();
              }
            }}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800"
          >
            {world.simulation.paused ? "▶ Resume" : "⏸ Pause"}
          </button>

          <button
            type="button"
            onClick={() => {
              saveDemoToBrowser();
              setNotice("Saved");
            }}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs"
          >
            Save
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                const ok = loadDemoFromBrowser();
                setNotice(ok ? "Loaded" : "No save found");
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "Load failed");
              }
            }}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs"
          >
            Load
          </button>

          <span className="self-center text-[11px] text-neutral-500">
            {notice}
          </span>
        </div>
      </div>

      <div className="border-b border-neutral-800 p-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`whitespace-nowrap rounded px-2 py-1 text-[10px] ${
                filter === item
                  ? "bg-neutral-100 text-neutral-950"
                  : "bg-neutral-900 text-neutral-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-neutral-800 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Kingdom Inspector
          </div>

          <select
            value={selectedKingdomId}
            onChange={(event) => setSelectedKingdomId(event.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          >
            {Object.values(world.kingdoms).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          {kingdom ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-neutral-900 p-2">
                <span className="text-neutral-500">Controller</span>
                <div className="mt-1">
                  {player?.controllerType === "human" ? "HUMAN" : "PLAYER LLM"}
                </div>
              </div>
              <div className="rounded bg-neutral-900 p-2">
                <span className="text-neutral-500">Treasury</span>
                <div className="mt-1">{kingdom.treasury}</div>
              </div>
              <div className="rounded bg-neutral-900 p-2">
                <span className="text-neutral-500">Food</span>
                <div className="mt-1">{kingdom.food}</div>
              </div>
              <div className="rounded bg-neutral-900 p-2">
                <span className="text-neutral-500">Stability</span>
                <div className="mt-1">{kingdom.stability}</div>
              </div>
              <div className="col-span-2 rounded bg-neutral-900 p-2">
                <span className="text-neutral-500">Armies</span>
                <div className="mt-1">{armies.map((army) => army.id).join(", ") || "None"}</div>
              </div>
              <div className="col-span-2 rounded bg-neutral-900 p-2">
                <span className="text-neutral-500">Major Lords</span>
                <div className="mt-1">
                  {lords
                    .map(
                      (lord) =>
                        `${world.characters[lord.characterId]?.name ?? lord.characterId} · loyalty ${lord.loyalty}`
                    )
                    .join(" · ") || "None"}
                </div>
              </div>
              <div className="col-span-2 rounded bg-neutral-900 p-2">
                <span className="text-neutral-500">Current Plan</span>
                <div className="mt-1">
                  {plan ? `${plan.goal}${plan.targetId ? ` → ${plan.targetId}` : ""}` : "No active plan"}
                </div>
              </div>
              <div className="col-span-2 rounded bg-neutral-900 p-2">
                <span className="text-neutral-500">Last Decision</span>
                <div className="mt-1 text-neutral-300">
                  {lastDecision?.decisionSummary ?? "No decision yet"}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Live AI Activity
            </div>
            <div className="text-[10px] text-neutral-600">
              no chain-of-thought
            </div>
          </div>

          <div className="space-y-2">
            {feed.length === 0 ? (
              <div className="rounded border border-dashed border-neutral-800 p-4 text-xs text-neutral-500">
                Start the demo. AI decisions, tools, conversations, diplomacy and GM selections will appear here.
              </div>
            ) : (
              feed.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                      {entry.kind}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-600">
                      {entry.time}
                    </div>
                  </div>

                  <div className="mt-1 text-xs font-semibold text-neutral-200">
                    {entry.actor}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-400">
                    {entry.title}
                  </div>
                  <div className="mt-2 text-sm leading-5 text-neutral-200">
                    {entry.summary}
                  </div>

                  {entry.details?.length ? (
                    <div className="mt-2 space-y-1 border-t border-neutral-800 pt-2">
                      {entry.details.map((detail, index) => (
                        <div
                          key={`${entry.id}:detail:${index}`}
                          className="break-words font-mono text-[10px] leading-4 text-neutral-500"
                        >
                          {detail}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
