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
  humanEndConversation,
  humanTalkToCharacter,
} from "@/lib/conversation/human-actions";

import {
  closeCourtConversation,
  getSelectedCourtCharacterId,
  subscribeCourtConversation,
} from "@/lib/ui/court";

export default function ConversationPanel() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const requestedCharacterId =
    useSyncExternalStore(
      subscribeCourtConversation,
      getSelectedCourtCharacterId,
      getSelectedCourtCharacterId
    );

  const [text, setText] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const playerId =
    world.session
      .localPlayerId;

  const activeConversation =
    Object.values(
      world.session
        .conversations
    ).find(
      (conversation) =>
        conversation.status ===
          "open" &&
        conversation
          .controllerPlayerId ===
          playerId
    );

  const targetCharacterId =
    activeConversation
      ?.targetCharacterId ??
    requestedCharacterId;

  if (!targetCharacterId) {
    return null;
  }

  const target =
    world.characters[
      targetCharacterId
    ];

  async function send():
    Promise<void> {
    if (
      !targetCharacterId ||
      !text.trim()
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    const result =
      await humanTalkToCharacter(
        world.session.id,
        playerId,
        targetCharacterId,
        text,
        activeConversation?.id
      );

    setBusy(false);

    if (!result.ok) {
      setError(
        result.error
      );
      return;
    }

    setText("");
  }

  function close():
    void {
    if (
      activeConversation
    ) {
      const result =
        humanEndConversation(
          world.session.id,
          playerId,
          activeConversation.id
        );

      if (!result.ok) {
        setError(
          result.error
        );
        return;
      }
    }

    closeCourtConversation();
  }

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-5 backdrop-blur-sm">
      <section className="flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-800/50 bg-[#0a0c0e] text-neutral-100 shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-800 p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
              Royal Audience
            </div>
            <div className="mt-1 text-lg font-semibold">
              {
                target?.name ??
                targetCharacterId
              }
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!activeConversation ? (
            <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-900/65 p-3 text-xs leading-5 text-neutral-500">
              This character is physically present. Speaking begins a bounded GM Character conversation using only the NPC&apos;s available context.
            </div>
          ) : null}

          <div className="space-y-3">
            {activeConversation
              ?.turns.map(
                (turn) => {
                  const speaker =
                    world.characters[
                      turn
                        .speakerCharacterId
                    ];

                  const playerTurn =
                    turn
                      .speakerCharacterId ===
                    world.session
                      .players[
                        playerId
                      ]
                      ?.characterId;

                  return (
                    <div
                      key={
                        turn.id
                      }
                      className={`max-w-[88%] rounded-xl p-3 text-sm leading-6 ${
                        playerTurn
                          ? "ml-auto bg-amber-950/45"
                          : "bg-neutral-900"
                      }`}
                    >
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        {
                          speaker?.name ??
                          turn
                            .speakerCharacterId
                        }
                      </div>
                      {
                        turn.text
                      }
                    </div>
                  );
                }
              )}
          </div>
        </div>

        <footer className="border-t border-neutral-800 p-4">
          {error ? (
            <div className="mb-2 rounded border border-red-900 bg-red-950/25 p-2 text-xs text-red-300">
              {error}
            </div>
          ) : null}

          <textarea
            value={text}
            onChange={(
              event
            ) =>
              setText(
                event.target
                  .value
              )
            }
            placeholder={`Speak to ${target?.name ?? "this character"}...`}
            rows={3}
            className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm outline-none focus:border-amber-700"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={
                busy ||
                !text.trim()
              }
              onClick={() =>
                void send()
              }
              className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-black disabled:opacity-30"
            >
              {busy
                ? "Waiting..."
                : "Speak"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
