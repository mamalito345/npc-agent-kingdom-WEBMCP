"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getRuntimeWorldState,
  subscribeWorldState,
} from "@/lib/world/runtime";

import {
  humanEndConversation,
  humanInspectPresentCharacters,
  humanTalkToCharacter,
} from "@/lib/conversation/human-actions";

export default function ConversationPanel() {
  const [, setRevision] = useState(0);
  const [targetCharacterId, setTargetCharacterId] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeWorldState(() => {
        setRevision((value) => value + 1);
      }),
    []
  );

  const world = getRuntimeWorldState();
  const playerId = world.session.localPlayerId;

  const presentResult =
    humanInspectPresentCharacters(
      world.session.id,
      playerId
    );

  const presentCharacters = presentResult.ok
    ? presentResult.characters
    : [];

  const activeConversation =
    Object.values(world.session.conversations).find(
      (conversation) =>
        conversation.status === "open" &&
        conversation.controllerPlayerId === playerId
    );

  const selectedTarget =
    activeConversation?.targetCharacterId ??
    targetCharacterId ??
    presentCharacters[0]?.characterId ??
    "";

  async function send(): Promise<void> {
    const target =
      activeConversation?.targetCharacterId ||
      targetCharacterId ||
      presentCharacters[0]?.characterId;

    if (!target || !text.trim()) {
      return;
    }

    setBusy(true);
    setError(null);

    const result = await humanTalkToCharacter(
      world.session.id,
      playerId,
      target,
      text,
      activeConversation?.id
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setText("");
    setTargetCharacterId(target);
  }

  function close(): void {
    if (!activeConversation) {
      return;
    }

    const result = humanEndConversation(
      world.session.id,
      playerId,
      activeConversation.id
    );

    if (!result.ok) {
      setError(result.error);
    }
  }

  return (
    <aside
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 40,
        width: 380,
        maxHeight: "46vh",
        overflow: "auto",
        padding: 12,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(10,10,10,0.92)",
        color: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>
        Conversation
      </div>

      {!activeConversation && (
        <select
          value={selectedTarget}
          onChange={(event) =>
            setTargetCharacterId(event.target.value)
          }
          style={{
            width: "100%",
            marginBottom: 8,
            color: "black",
          }}
        >
          {presentCharacters.length === 0 && (
            <option value="">
              No present NPC
            </option>
          )}

          {presentCharacters.map((character) => (
            <option
              key={character.characterId}
              value={character.characterId}
            >
              {character.name} — {character.reason}
            </option>
          ))}
        </select>
      )}

      {activeConversation && (
        <div
          style={{
            marginBottom: 8,
            fontSize: 13,
            opacity: 0.8,
          }}
        >
          Talking to{" "}
          {world.characters[
            activeConversation.targetCharacterId
          ]?.name}
        </div>
      )}

      {activeConversation?.turns.map((turn) => (
        <div
          key={turn.id}
          style={{ marginBottom: 7, fontSize: 13 }}
        >
          <strong>
            {world.characters[turn.speakerCharacterId]?.name ??
              turn.speakerCharacterId}
            :
          </strong>{" "}
          {turn.text}
        </div>
      ))}

      <textarea
        value={text}
        onChange={(event) =>
          setText(event.target.value)
        }
        placeholder="Speak to a present NPC..."
        rows={3}
        style={{
          width: "100%",
          color: "black",
          marginTop: 4,
        }}
      />

      {error && (
        <div
          style={{
            color: "#ff9e9e",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {error}
          {error === "NOT_PRESENT"
            ? " — use send_message/courier for distant characters."
            : ""}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          disabled={
            busy ||
            !(
              activeConversation?.targetCharacterId ||
              targetCharacterId ||
              presentCharacters[0]?.characterId
            ) ||
            !text.trim()
          }
          onClick={() => void send()}
        >
          {busy ? "..." : "Talk"}
        </button>

        {activeConversation && (
          <button
            type="button"
            onClick={close}
          >
            End
          </button>
        )}
      </div>
    </aside>
  );
}
