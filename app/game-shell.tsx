"use client";

import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  beginCampaign,
} from "@/lib/demo/campaign";

import {
  startObserverDemo,
} from "@/lib/demo/config";

import {
  deleteBrowserSave,
  downloadDemoSave,
  hasBrowserSave,
  importDemoSaveFile,
  loadDemoFromBrowser,
} from "@/lib/demo/persistence";

import {
  getKingdomLore,
  worldTimeline,
  worldTimelineTitle,
} from "@/data/lore";

type Screen =
  | "menu"
  | "new"
  | "load"
  | "intro";

export interface GameShellProps {
  onEnterGame:
    () => void;
}

function kingdomSubtitle(
  kingdomId: string
): string {
  return (
    getKingdomLore(kingdomId)
      ?.summary ??
    "Realm of the Five Kingdoms"
  );
}

function kingdomPosture(
  kingdomId: string
): string | undefined {
  return getKingdomLore(kingdomId)
    ?.posture;
}

export default function GameShell({
  onEnterGame,
}: GameShellProps) {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const players =
    useMemo(
      () =>
        Object.values(
          world.session.players
        ).filter(
          (player) =>
            player.active
        ),
      [world.session.players]
    );

  const [screen, setScreen] =
    useState<Screen>(
      "menu"
    );

  const [humanPlayerId, setHumanPlayerId] =
    useState(
      world.session.localPlayerId
    );

  const [actorPlayerId, setActorPlayerId] =
    useState(
      players.find(
        (player) =>
          player.id !==
          world.session.localPlayerId
      )?.id ??
      ""
    );

  const [message, setMessage] =
    useState("");

  const [introText, setIntroText] =
    useState({
      title:
        "YEAR 417 — SPRING",
      body:
        "Peace holds between the Five Kingdoms. For now.",
    });

  const importInput =
    useRef<HTMLInputElement>(
      null
    );

  const browserSaveAvailable =
    typeof window !==
      "undefined" &&
    hasBrowserSave();

  function continueSavedGame():
    void {
    try {
      if (
        loadDemoFromBrowser()
      ) {
        onEnterGame();
        return;
      }

      setMessage(
        "No local campaign save was found."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "SAVE_LOAD_FAILED"
      );
    }
  }

  function startConfiguredCampaign():
    void {
    const result =
      beginCampaign({
        humanPlayerId,
        actorPlayerId,
      });

    if (!result.ok) {
      setMessage(
        result.error
      );
      return;
    }

    const human =
      world.session.players[
        humanPlayerId
      ];

    const actor =
      world.session.players[
        actorPlayerId
      ];

    const humanKingdomId =
      human?.kingdomId ??
      "";

    const actorKingdomId =
      actor?.kingdomId ??
      "";

    const humanLore =
      getKingdomLore(
        humanKingdomId
      );

    const openingLine =
      humanLore
        ? `${world.kingdoms[humanKingdomId]?.name ?? "Your realm"}: ${humanLore.posture}`
        : `${world.kingdoms[humanKingdomId]?.name ?? "Your realm"} begins its reign.`;

    setIntroText({
      title:
        "YEAR 417 — SPRING, FIFTY YEARS AFTER THE IRON MARCHES WAR",
      body:
        `${openingLine} ${world.kingdoms[actorKingdomId]?.name ?? "A rival kingdom"} is ruled by a Player LLM. The remaining world is governed by the GM systems, each realm acting on its own fifty-year history of wars, alliances and grudges.`,
    });

    setScreen(
      "intro"
    );
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#080b0d] text-[#efe7d3]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(132,94,44,0.18),transparent_34%),linear-gradient(to_bottom,rgba(0,0,0,0.15),rgba(0,0,0,0.75))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-12">
        {screen === "menu" ? (
          <section className="w-full max-w-3xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.45em] text-amber-500/80">
              A Living Strategy World
            </div>

            <h1 className="mt-5 font-serif text-5xl font-semibold tracking-tight text-[#f5e7c4] md:text-7xl">
              War of the Five Kingdoms
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-neutral-400 md:text-base">
              Rule a persistent kingdom. Command armies, speak with lords,
              receive delayed intelligence and face rival AI rulers under the
              same canonical game rules.
            </p>

            <div className="mx-auto mt-10 grid max-w-md gap-3">
              {browserSaveAvailable ? (
                <button
                  type="button"
                  onClick={continueSavedGame}
                  className="rounded-xl border border-amber-500/60 bg-amber-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-amber-400"
                >
                  Continue
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setScreen("new");
                }}
                className="rounded-xl border border-neutral-700 bg-neutral-900/85 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-amber-700 hover:bg-neutral-800"
              >
                New Campaign
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setScreen("load");
                }}
                className="rounded-xl border border-neutral-800 bg-black/35 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-300 transition hover:bg-neutral-900"
              >
                Load / Import Save
              </button>

              <button
                type="button"
                onClick={() => {
                  startObserverDemo();
                  onEnterGame();
                }}
                className="rounded-xl border border-violet-800/70 bg-violet-950/30 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-violet-200 transition hover:bg-violet-950/60"
              >
                Observer Arena
              </button>
            </div>

            <div className="mt-10 grid gap-3 text-left md:grid-cols-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Human Player
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Rules a kingdom through the visible strategy-game interface.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Player LLM
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Inspects, plans and commands through the same canonical actions.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                  GM LLM
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Plays NPC characters and selects bounded world events.
                </p>
              </div>
            </div>

            {message ? (
              <div className="mt-5 text-sm text-red-300">
                {message}
              </div>
            ) : null}
          </section>
        ) : null}

        {screen === "new" ? (
          <section className="w-full max-w-6xl">
            <button
              type="button"
              onClick={() => setScreen("menu")}
              className="mb-6 text-sm text-neutral-500 hover:text-neutral-200"
            >
              ← Main Menu
            </button>

            <div className="mb-8">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">
                New Campaign
              </div>
              <h2 className="mt-2 font-serif text-4xl text-[#f5e7c4]">
                Choose your realm
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                First choose the Human kingdom. Then choose the rival Player LLM kingdom.
              </p>
            </div>

            <details className="mb-8 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-amber-500">
                {worldTimelineTitle}
              </summary>

              <ol className="mt-4 space-y-3 border-l border-neutral-800 pl-4">
                {worldTimeline.map((entry) => (
                  <li key={entry.title}>
                    <div className="text-[11px] uppercase tracking-wide text-neutral-600">
                      {entry.yearsAgo} years ago
                    </div>
                    <div className="text-sm font-semibold text-neutral-200">
                      {entry.title}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {entry.summary}
                    </p>
                  </li>
                ))}
              </ol>
            </details>

            <div className="grid gap-4 lg:grid-cols-5">
              {players.map((player) => {
                const kingdom =
                  world.kingdoms[
                    player.kingdomId
                  ];

                const selectedHuman =
                  humanPlayerId ===
                  player.id;

                const selectedActor =
                  actorPlayerId ===
                  player.id;

                return (
                  <div
                    key={player.id}
                    className={`rounded-2xl border p-4 ${
                      selectedHuman
                        ? "border-amber-500 bg-amber-950/20"
                        : selectedActor
                          ? "border-cyan-500/70 bg-cyan-950/20"
                          : "border-neutral-800 bg-neutral-950/75"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      {kingdom?.name ?? player.kingdomId}
                    </div>

                    <div className="mt-3 text-lg font-semibold text-neutral-100">
                      {player.displayName}
                    </div>

                    <p className="mt-2 min-h-12 text-xs leading-5 text-neutral-500">
                      {kingdomSubtitle(player.kingdomId)}
                    </p>

                    {kingdomPosture(player.kingdomId) ? (
                      <p className="mt-2 text-[11px] leading-4 text-amber-500/70">
                        {kingdomPosture(player.kingdomId)}
                      </p>
                    ) : null}

                    <div className="mt-5 grid gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setHumanPlayerId(player.id);

                          if (actorPlayerId === player.id) {
                            const replacement =
                              players.find(
                                (candidate) =>
                                  candidate.id !== player.id
                              );

                            if (replacement) {
                              setActorPlayerId(replacement.id);
                            }
                          }
                        }}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                          selectedHuman
                            ? "border-amber-400 bg-amber-400 text-black"
                            : "border-neutral-700 text-neutral-300"
                        }`}
                      >
                        HUMAN
                      </button>

                      <button
                        type="button"
                        disabled={selectedHuman}
                        onClick={() => setActorPlayerId(player.id)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-30 ${
                          selectedActor
                            ? "border-cyan-400 bg-cyan-400 text-black"
                            : "border-neutral-700 text-neutral-300"
                        }`}
                      >
                        ACTOR LLM
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-violet-900/50 bg-violet-950/20 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
                World Configuration
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-[11px] uppercase text-neutral-600">
                    Human
                  </div>
                  <div className="mt-1 text-sm">
                    {world.kingdoms[
                      world.session.players[humanPlayerId]?.kingdomId ?? ""
                    ]?.name ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase text-neutral-600">
                    Player LLM
                  </div>
                  <div className="mt-1 text-sm text-cyan-200">
                    {world.kingdoms[
                      world.session.players[actorPlayerId]?.kingdomId ?? ""
                    ]?.name ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase text-neutral-600">
                    GM World
                  </div>
                  <div className="mt-1 text-sm text-violet-200">
                    NPCs · Lords · Events · remaining world
                  </div>
                </div>
              </div>
            </div>

            {message ? (
              <div className="mt-4 text-sm text-red-300">
                {message}
              </div>
            ) : null}

            <div className="mt-7 flex justify-end">
              <button
                type="button"
                onClick={startConfiguredCampaign}
                disabled={
                  !humanPlayerId ||
                  !actorPlayerId ||
                  humanPlayerId === actorPlayerId
                }
                className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Begin Reign
              </button>
            </div>
          </section>
        ) : null}

        {screen === "load" ? (
          <section className="w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setScreen("menu")}
              className="mb-6 text-sm text-neutral-500 hover:text-neutral-200"
            >
              ← Main Menu
            </button>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/85 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">
                Load Campaign
              </div>

              <h2 className="mt-2 font-serif text-3xl">
                Saved worlds
              </h2>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  disabled={!browserSaveAvailable}
                  onClick={continueSavedGame}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-4 text-left disabled:opacity-30"
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      Browser Campaign
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">
                      Local persistent world snapshot
                    </span>
                  </span>
                  <span className="text-xs text-amber-300">
                    LOAD
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => importInput.current?.click()}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      Import Save File
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">
                      Restore a downloaded JSON campaign
                    </span>
                  </span>
                  <span className="text-xs text-cyan-300">
                    IMPORT
                  </span>
                </button>

                <input
                  ref={importInput}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (event) => {
                    const file =
                      event.target.files?.[0];

                    if (!file) {
                      return;
                    }

                    try {
                      await importDemoSaveFile(file);
                      onEnterGame();
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "IMPORT_FAILED"
                      );
                    } finally {
                      event.target.value = "";
                    }
                  }}
                />
              </div>

              {browserSaveAvailable ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadDemoSave()}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-xs"
                  >
                    Download Save
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      deleteBrowserSave();
                      setMessage("Browser save deleted.");
                    }}
                    className="rounded-lg border border-red-900/70 px-3 py-2 text-xs text-red-300"
                  >
                    Delete Browser Save
                  </button>
                </div>
              ) : null}

              {message ? (
                <div className="mt-5 text-sm text-neutral-400">
                  {message}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {screen === "intro" ? (
          <section className="max-w-3xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.45em] text-amber-500">
              New Reign
            </div>

            <h2 className="mt-6 font-serif text-5xl text-[#f5e7c4] md:text-6xl">
              {introText.title}
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-neutral-400">
              {introText.body}
            </p>

            <button
              type="button"
              onClick={onEnterGame}
              className="mt-10 rounded-xl border border-amber-500/70 bg-amber-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black hover:bg-amber-300"
            >
              Enter the Realm
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
