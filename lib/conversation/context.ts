import { getRuntimeWorldState } from "@/lib/world/runtime";
import { getNpcPersonality } from "@/data/npc-personalities";
import { canConverse } from "@/lib/conversation/presence";
import { getDeliveredCharacterKnowledge } from "@/lib/conversation/character-knowledge";
import { retrieveRelevantMemories } from "@/lib/conversation/memory";
import type {
  CharacterKnowledgeFact,
  GmCharacterContext,
} from "@/types/conversation";

function relevanceScore(
  fact: CharacterKnowledgeFact,
  query: string
): number {
  const normalizedQuery = query.toLocaleLowerCase("tr-TR");
  const normalizedFact =
    `${fact.summary} ${fact.subjectId}`.toLocaleLowerCase("tr-TR");

  if (!normalizedQuery.trim()) {
    return fact.deliveredAt;
  }

  const tokens = normalizedQuery
    .split(/[^\p{L}\p{N}_-]+/u)
    .filter((token) => token.length >= 3);

  return tokens.reduce(
    (score, token) =>
      score + (normalizedFact.includes(token) ? 1000 : 0),
    fact.deliveredAt
  );
}

export function buildGmCharacterContext(
  characterId: string,
  conversationId: string
): GmCharacterContext | undefined {
  const world = getRuntimeWorldState();
  const character = world.characters[characterId];
  const conversation = world.session.conversations[conversationId];

  if (
    !character ||
    !conversation ||
    !conversation.participantCharacterIds.includes(characterId)
  ) {
    return undefined;
  }

  const interlocutorId = conversation.participantCharacterIds.find(
    (participantId) => participantId !== characterId
  );

  const query = conversation.turns
    .slice(-6)
    .map((turn) => turn.text)
    .join(" ");

  const knowledge = getDeliveredCharacterKnowledge(characterId)
    .slice()
    .sort(
      (a, b) =>
        relevanceScore(b, query) - relevanceScore(a, query) ||
        b.deliveredAt - a.deliveredAt
    )
    .slice(0, 12);

  const now = world.simulation.worldTimeMinutes;

  const recentDeliveredMessages = Object.values(world.messages)
    .filter(
      (message) =>
        message.recipientId === characterId &&
        message.deliveredAt !== undefined &&
        message.deliveredAt <= now
    )
    .sort(
      (a, b) =>
        (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0) ||
        b.id.localeCompare(a.id)
    )
    .slice(0, 10)
    .map((message) => ({
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
      deliveredAt: message.deliveredAt as number,
    }));

  const relevantMemories = retrieveRelevantMemories(
    characterId,
    query,
    interlocutorId ? [interlocutorId] : [],
    10
  );

  const presence = interlocutorId
    ? canConverse(interlocutorId, characterId)
    : undefined;

  return {
    worldTimeMinutes: now,
    identity: {
      id: character.id,
      name: character.name,
      kingdomId: character.kingdomId,
      rank: character.rank,
    },
    personality: getNpcPersonality(characterId),
    physicalContext: {
      position: world.simulation.entityPositions[characterId] ?? null,
      presenceReason: presence?.ok ? presence.reason : null,
    },
    interlocutor: interlocutorId
      ? {
          characterId: interlocutorId,
          relationship: character.relationships[interlocutorId] ?? 0,
        }
      : null,
    knowledge,
    recentDeliveredMessages,
    relevantMemories,
    transcript: conversation.turns.map((turn) => ({ ...turn })),
    rules: [
      "Speak only from identity, knowledge, delivered messages, relationships, memories, and this transcript.",
      "Do not invent exact hidden canonical values.",
      "If information is uncertain or old, preserve that uncertainty.",
      "Dialogue alone cannot mutate canonical armies, resources, politics, movement, promises, or world state.",
      "If you do not know something, say that you do not know it.",
    ],
  };
}
