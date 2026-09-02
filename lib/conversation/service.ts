import {
  allocateSimulationSequence,
  addWorldPauseReason,
  getRuntimeWorldState,
  removeWorldPauseReason,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";
import { validatePlayerAccess } from "@/lib/session/access";
import {
  canConverse,
  getPresentCharacters,
} from "@/lib/conversation/presence";
import { buildGmCharacterContext } from "@/lib/conversation/context";
import { createMemoriesFromConversation } from "@/lib/conversation/memory";
import { getGmCharacterModelAdapter } from "@/lib/conversation/model";
import type {
  ConversationSession,
  ConversationTurn,
} from "@/types/conversation";

export type ConversationServiceError =
  | "SESSION_NOT_FOUND"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_NOT_ACTIVE"
  | "TARGET_NOT_FOUND"
  | "TARGET_IS_PLAYER_CONTROLLED"
  | "NOT_PRESENT"
  | "CONVERSATION_NOT_FOUND"
  | "CONVERSATION_CLOSED"
  | "NOT_AUTHORIZED"
  | "EMPTY_MESSAGE"
  | "GM_CONTEXT_NOT_AVAILABLE"
  | "GM_MODEL_ERROR";

function accessErrorToConversationError(
  error:
    | "SESSION_NOT_FOUND"
    | "PLAYER_NOT_FOUND"
    | "PLAYER_NOT_ACTIVE"
    | "NOT_CURRENT_PLAYER"
    | "COMMAND_WINDOW_CLOSED"
): ConversationServiceError {
  if (
    error === "SESSION_NOT_FOUND" ||
    error === "PLAYER_NOT_FOUND" ||
    error === "PLAYER_NOT_ACTIVE"
  ) {
    return error;
  }

  return "NOT_AUTHORIZED";
}

function isPlayerControlledCharacter(characterId: string): boolean {
  return Object.values(getRuntimeWorldState().session.players).some(
    (player) => player.active && player.characterId === characterId
  );
}

function createTurn(
  speakerCharacterId: string,
  speakerRole: ConversationTurn["speakerRole"],
  text: string
): ConversationTurn {
  const sequence = allocateSimulationSequence();
  const now = getRuntimeWorldState().simulation.worldTimeMinutes;

  return {
    id: `conversation-turn-${sequence.toString().padStart(6, "0")}`,
    speakerCharacterId,
    speakerRole,
    text,
    createdAtWorldTime: now,
  };
}

function appendTurn(
  conversationId: string,
  turn: ConversationTurn
): void {
  updateRuntimeWorldState((current) => {
    const conversation = current.session.conversations[conversationId];

    if (!conversation) {
      return current;
    }

    return {
      ...current,
      session: {
        ...current.session,
        conversations: {
          ...current.session.conversations,
          [conversationId]: {
            ...conversation,
            turns: [...conversation.turns, turn],
          },
        },
      },
    };
  });
}

export function inspectPresentCharacters(
  sessionId: string,
  playerId: string
) {
  const access = validatePlayerAccess(sessionId, playerId);

  if (!access.ok) {
    return {
      ok: false as const,
      error: accessErrorToConversationError(access.error),
    };
  }

  return {
    ok: true as const,
    characters: getPresentCharacters(access.player.characterId).filter(
      (character) => !isPlayerControlledCharacter(character.characterId)
    ),
  };
}

export function startConversation(
  sessionId: string,
  playerId: string,
  targetCharacterId: string
):
  | { ok: false; error: ConversationServiceError }
  | { ok: true; conversation: ConversationSession } {
  const access = validatePlayerAccess(sessionId, playerId);

  if (!access.ok) {
    return {
      ok: false,
      error: accessErrorToConversationError(access.error),
    };
  }

  const world = getRuntimeWorldState();
  const requesterCharacterId = access.player.characterId;

  if (!world.characters[targetCharacterId]) {
    return { ok: false, error: "TARGET_NOT_FOUND" };
  }

  if (isPlayerControlledCharacter(targetCharacterId)) {
    return { ok: false, error: "TARGET_IS_PLAYER_CONTROLLED" };
  }

  const existing = Object.values(world.session.conversations).find(
    (conversation) =>
      conversation.status === "open" &&
      conversation.controllerPlayerId === playerId &&
      conversation.targetCharacterId === targetCharacterId
  );

  if (existing) {
    return { ok: true, conversation: existing };
  }

  const presence = canConverse(
    requesterCharacterId,
    targetCharacterId
  );

  if (!presence.ok) {
    return { ok: false, error: "NOT_PRESENT" };
  }

  const sequence = allocateSimulationSequence();
  const now = getRuntimeWorldState().simulation.worldTimeMinutes;
  const id = `conversation-${sequence.toString().padStart(6, "0")}`;
  const pauseReasonId = `conversation:${id}`;

  const conversation: ConversationSession = {
    id,
    participantCharacterIds: [
      requesterCharacterId,
      targetCharacterId,
    ],
    controllerPlayerId: playerId,
    targetCharacterId,
    openedAtWorldTime: now,
    status: "open",
    turns: [],
    pauseReasonId,
  };

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      conversations: {
        ...current.session.conversations,
        [conversation.id]: conversation,
      },
    },
  }));

  addWorldPauseReason(pauseReasonId);

  return { ok: true, conversation };
}

export function inspectConversation(
  sessionId: string,
  playerId: string,
  conversationId: string
) {
  const access = validatePlayerAccess(sessionId, playerId);

  if (!access.ok) {
    return {
      ok: false as const,
      error: accessErrorToConversationError(access.error),
    };
  }

  const conversation =
    getRuntimeWorldState().session.conversations[conversationId];

  if (!conversation) {
    return {
      ok: false as const,
      error: "CONVERSATION_NOT_FOUND" as const,
    };
  }

  if (conversation.controllerPlayerId !== playerId) {
    return {
      ok: false as const,
      error: "NOT_AUTHORIZED" as const,
    };
  }

  return { ok: true as const, conversation };
}

export async function sendConversationMessage(
  sessionId: string,
  playerId: string,
  conversationId: string,
  text: string
) {
  const access = validatePlayerAccess(sessionId, playerId);

  if (!access.ok) {
    return {
      ok: false as const,
      error: accessErrorToConversationError(access.error),
    };
  }

  const trimmed = text.trim();

  if (!trimmed) {
    return { ok: false as const, error: "EMPTY_MESSAGE" as const };
  }

  const conversation =
    getRuntimeWorldState().session.conversations[conversationId];

  if (!conversation) {
    return {
      ok: false as const,
      error: "CONVERSATION_NOT_FOUND" as const,
    };
  }

  if (conversation.controllerPlayerId !== playerId) {
    return { ok: false as const, error: "NOT_AUTHORIZED" as const };
  }

  if (conversation.status !== "open") {
    return {
      ok: false as const,
      error: "CONVERSATION_CLOSED" as const,
    };
  }

  const requesterCharacterId = access.player.characterId;
  const presence = canConverse(
    requesterCharacterId,
    conversation.targetCharacterId
  );

  if (!presence.ok) {
    return { ok: false as const, error: "NOT_PRESENT" as const };
  }

  const playerTurn = createTurn(
    requesterCharacterId,
    "player",
    trimmed
  );
  appendTurn(conversationId, playerTurn);

  const context = buildGmCharacterContext(
    conversation.targetCharacterId,
    conversationId
  );

  if (!context) {
    return {
      ok: false as const,
      error: "GM_CONTEXT_NOT_AVAILABLE" as const,
    };
  }

  try {
    const response =
      await getGmCharacterModelAdapter().generateResponse(context);

    const npcTurn = createTurn(
      conversation.targetCharacterId,
      "npc",
      response.text.trim()
    );

    appendTurn(conversationId, npcTurn);

    return {
      ok: true as const,
      conversation:
        getRuntimeWorldState().session.conversations[conversationId],
      playerTurn,
      npcTurn,
    };
  } catch {
    return {
      ok: false as const,
      error: "GM_MODEL_ERROR" as const,
    };
  }
}

export async function talkToCharacter(
  sessionId: string,
  playerId: string,
  targetCharacterId: string,
  text: string,
  conversationId?: string
) {
  let id = conversationId;

  if (!id) {
    const started = startConversation(
      sessionId,
      playerId,
      targetCharacterId
    );

    if (!started.ok) {
      return started;
    }

    id = started.conversation.id;
  }

  return sendConversationMessage(
    sessionId,
    playerId,
    id,
    text
  );
}

export function endConversation(
  sessionId: string,
  playerId: string,
  conversationId: string
) {
  const access = validatePlayerAccess(sessionId, playerId);

  if (!access.ok) {
    return {
      ok: false as const,
      error: accessErrorToConversationError(access.error),
    };
  }

  const conversation =
    getRuntimeWorldState().session.conversations[conversationId];

  if (!conversation) {
    return {
      ok: false as const,
      error: "CONVERSATION_NOT_FOUND" as const,
    };
  }

  if (conversation.controllerPlayerId !== playerId) {
    return { ok: false as const, error: "NOT_AUTHORIZED" as const };
  }

  if (conversation.status === "closed") {
    return {
      ok: true as const,
      conversation,
      memoriesCreated: [],
    };
  }

  const now = getRuntimeWorldState().simulation.worldTimeMinutes;

  const closed: ConversationSession = {
    ...conversation,
    status: "closed",
    endedAtWorldTime: now,
  };

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      conversations: {
        ...current.session.conversations,
        [conversationId]: closed,
      },
    },
  }));

  removeWorldPauseReason(conversation.pauseReasonId);

  const memoriesCreated =
    createMemoriesFromConversation(closed);

  return {
    ok: true as const,
    conversation:
      getRuntimeWorldState().session.conversations[conversationId],
    memoriesCreated,
  };
}
