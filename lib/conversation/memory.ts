import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";
import type {
  CharacterMemory,
  CharacterMemoryType,
  ConversationSession,
} from "@/types/conversation";

const MEMORY_KEYWORDS: Array<{
  type: CharacterMemoryType;
  importance: number;
  words: string[];
}> = [
  {
    type: "PROMISE",
    importance: 90,
    words: ["promise", "swear", "pledge", "söz", "yemin", "taahhüt"],
  },
  {
    type: "POLITICAL",
    importance: 82,
    words: [
      "alliance",
      "treaty",
      "peace",
      "throne",
      "kingdom",
      "ittifak",
      "anlaşma",
      "barış",
      "krallık",
      "taht",
    ],
  },
  {
    type: "MILITARY",
    importance: 78,
    words: [
      "army",
      "soldier",
      "reinforce",
      "attack",
      "defend",
      "ordu",
      "asker",
      "takviye",
      "saldır",
      "savun",
    ],
  },
  {
    type: "RELATIONSHIP",
    importance: 75,
    words: [
      "threat",
      "insult",
      "betray",
      "trust",
      "tehdit",
      "hakaret",
      "ihanet",
      "güven",
    ],
  },
];

function normalize(text: string): string {
  return text.toLocaleLowerCase("tr-TR");
}

function tokens(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(/[^\p{L}\p{N}_-]+/u)
      .filter((token) => token.length >= 3)
  );
}

function compactTranscript(conversation: ConversationSession): string {
  const text = conversation.turns
    .map((turn) => `${turn.speakerCharacterId}: ${turn.text}`)
    .join(" | ");

  return text.length <= 600 ? text : `${text.slice(0, 597)}...`;
}

export function addCharacterMemory(
  input: Omit<CharacterMemory, "id" | "createdAt"> & {
    createdAt?: number;
  }
): CharacterMemory {
  const sequence = allocateSimulationSequence();
  const now = getRuntimeWorldState().simulation.worldTimeMinutes;

  const memory: CharacterMemory = {
    ...input,
    id: `memory-${sequence.toString().padStart(6, "0")}`,
    createdAt: input.createdAt ?? now,
    importance: Math.max(0, Math.min(100, input.importance)),
    relatedEntityIds: [...new Set(input.relatedEntityIds)],
  };

  updateRuntimeWorldState((current) => ({
    ...current,
    session: {
      ...current.session,
      memories: {
        ...current.session.memories,
        [memory.characterId]: [
          ...(current.session.memories[memory.characterId] ?? []),
          memory,
        ],
      },
    },
  }));

  return memory;
}

export function createMemoriesFromConversation(
  conversation: ConversationSession
): CharacterMemory[] {
  if (conversation.turns.length === 0) {
    return [];
  }

  const combined = normalize(
    conversation.turns.map((turn) => turn.text).join(" ")
  );
  const summary = compactTranscript(conversation);
  const created: CharacterMemory[] = [];

  for (const characterId of conversation.participantCharacterIds) {
    const existing = getRuntimeWorldState().session.memories[characterId] ?? [];

    for (const rule of MEMORY_KEYWORDS) {
      if (!rule.words.some((word) => combined.includes(word))) {
        continue;
      }

      if (
        existing.some(
          (memory) =>
            memory.sourceConversationId === conversation.id &&
            memory.type === rule.type
        )
      ) {
        continue;
      }

      created.push(
        addCharacterMemory({
          characterId,
          type: rule.type,
          summary,
          importance: rule.importance,
          relatedEntityIds: conversation.participantCharacterIds.filter(
            (id) => id !== characterId
          ),
          sourceConversationId: conversation.id,
        })
      );
    }
  }

  return created;
}

export function retrieveRelevantMemories(
  characterId: string,
  query: string,
  relatedEntityIds: string[] = [],
  limit = 10
): CharacterMemory[] {
  const world = getRuntimeWorldState();
  const now = world.simulation.worldTimeMinutes;
  const queryTokens = tokens(query);

  return [...(world.session.memories[characterId] ?? [])]
    .map((memory) => {
      const memoryTokens = tokens(memory.summary);
      const overlap = [...queryTokens].filter((token) =>
        memoryTokens.has(token)
      ).length;
      const entityOverlap = relatedEntityIds.filter((id) =>
        memory.relatedEntityIds.includes(id)
      ).length;
      const ageDays = Math.max(0, (now - memory.createdAt) / (24 * 60));
      const recency = Math.max(0, 20 - ageDays);

      return {
        memory,
        score:
          memory.importance +
          recency +
          overlap * 8 +
          entityOverlap * 15,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.memory.createdAt - a.memory.createdAt ||
        a.memory.id.localeCompare(b.memory.id)
    )
    .slice(0, limit)
    .map((entry) => entry.memory);
}
