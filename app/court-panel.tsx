"use client";

import {
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  humanInspectPresentCharacters,
} from "@/lib/conversation/human-actions";

import {
  openCourtConversation,
} from "@/lib/ui/court";

import {
  getDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

export default function CourtPanel() {
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

  if (
    demo.mode ===
    "observer"
  ) {
    return null;
  }

  const playerId =
    world.session
      .localPlayerId;

  const result =
    humanInspectPresentCharacters(
      world.session.id,
      playerId
    );

  const present =
    result.ok
      ? result.characters
      : [];

  const profiles =
    world.session.lords
      .profiles;

  return (
    <aside className="fixed bottom-5 left-5 z-[72] w-[300px] rounded-2xl border border-neutral-700/70 bg-[#0b0d0f]/94 p-4 text-neutral-100 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
            Royal Court
          </div>
          <div className="mt-1 text-sm font-semibold">
            Present Characters
          </div>
        </div>

        <div className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] text-neutral-400">
          {present.length} present
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {present.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 p-3 text-xs leading-5 text-neutral-500">
            No important NPC is currently present with the ruler. Distant characters require a courier or envoy.
          </div>
        ) : (
          present
            .slice(0, 5)
            .map(
              (character) => {
                const profile =
                  profiles[
                    character
                      .characterId
                  ];

                return (
                  <button
                    key={
                      character
                        .characterId
                    }
                    type="button"
                    onClick={() =>
                      openCourtConversation(
                        character
                          .characterId
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/75 p-3 text-left transition hover:border-amber-700"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-neutral-700 bg-neutral-950 text-lg">
                      {profile
                        ? "♜"
                        : "♟"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {character.name}
                      </div>

                      <div className="truncate text-[10px] text-neutral-500">
                        {profile
                          ?.title ??
                          character.reason}
                      </div>

                      {profile ? (
                        <div className="mt-1 flex gap-3 text-[10px]">
                          <span className="text-emerald-300">
                            Loyalty{" "}
                            {
                              profile.loyalty
                            }
                          </span>
                          <span className="text-neutral-500">
                            Relation{" "}
                            {
                              profile
                                .relationshipToRuler
                            }
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <span className="text-[10px] font-semibold text-amber-300">
                      TALK
                    </span>
                  </button>
                );
              }
            )
        )}
      </div>
    </aside>
  );
}
