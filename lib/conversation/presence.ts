import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";
import type { CharacterPresenceContext } from "@/types/conversation";

export type ConversationPresenceReason =
  | "same_node"
  | "same_army"
  | "same_traveling_party"
  | "council";

export type CanConverseResult =
  | { ok: true; reason: ConversationPresenceReason }
  | {
      ok: false;
      error:
        | "REQUESTER_NOT_FOUND"
        | "TARGET_NOT_FOUND"
        | "SAME_CHARACTER"
        | "NOT_PRESENT";
    };

function contextReason(
  context: CharacterPresenceContext
): ConversationPresenceReason {
  switch (context.kind) {
    case "army":
      return "same_army";
    case "traveling_party":
      return "same_traveling_party";
    case "council":
      return "council";
  }
}

export function canConverse(
  requesterCharacterId: string,
  targetCharacterId: string
): CanConverseResult {
  const world = getRuntimeWorldState();

  if (!world.characters[requesterCharacterId]) {
    return { ok: false, error: "REQUESTER_NOT_FOUND" };
  }
  if (!world.characters[targetCharacterId]) {
    return { ok: false, error: "TARGET_NOT_FOUND" };
  }
  if (requesterCharacterId === targetCharacterId) {
    return { ok: false, error: "SAME_CHARACTER" };
  }

  const requesterPosition =
    world.simulation.entityPositions[requesterCharacterId];
  const targetPosition =
    world.simulation.entityPositions[targetCharacterId];

  if (
    requesterPosition?.kind === "node" &&
    targetPosition?.kind === "node" &&
    requesterPosition.nodeId === targetPosition.nodeId
  ) {
    return { ok: true, reason: "same_node" };
  }

  const context = Object.values(world.session.presenceContexts).find(
    (entry) =>
      entry.active &&
      entry.characterIds.includes(requesterCharacterId) &&
      entry.characterIds.includes(targetCharacterId)
  );

  if (context) {
    return { ok: true, reason: contextReason(context) };
  }

  return { ok: false, error: "NOT_PRESENT" };
}

export function getPresentCharacters(
  requesterCharacterId: string
): Array<{
  characterId: string;
  name: string;
  reason: ConversationPresenceReason;
}> {
  const world = getRuntimeWorldState();

  return Object.values(world.characters)
    .filter((character) => character.id !== requesterCharacterId)
    .flatMap((character) => {
      const result = canConverse(requesterCharacterId, character.id);
      return result.ok
        ? [
            {
              characterId: character.id,
              name: character.name,
              reason: result.reason,
            },
          ]
        : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function setCharacterPresenceContext(
  context: CharacterPresenceContext
): void {
  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      presenceContexts: {
        ...current.session.presenceContexts,
        [context.id]: {
          ...context,
          characterIds: [...new Set(context.characterIds)],
        },
      },
    },
  }));
}
