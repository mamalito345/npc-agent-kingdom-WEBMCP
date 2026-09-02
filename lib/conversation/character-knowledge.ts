import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";
import {
  addPlayerKnowledge,
  getDeliveredPlayerKnowledge,
} from "@/lib/session/knowledge";
import type { CharacterKnowledgeFact } from "@/types/conversation";
import type { WorldMinute } from "@/types/simulation";

export interface AddCharacterKnowledgeInput {
  characterId: string;
  subjectId: string;
  kind: CharacterKnowledgeFact["kind"];
  observedAt: WorldMinute;
  deliveredAt?: WorldMinute;
  source: CharacterKnowledgeFact["source"];
  confidence: CharacterKnowledgeFact["confidence"];
  summary: string;
  data?: CharacterKnowledgeFact["data"];
}

function playerIdForCharacter(characterId: string): string | undefined {
  return Object.values(getRuntimeWorldState().session.players).find(
    (player) => player.characterId === characterId
  )?.id;
}

export function addCharacterKnowledge(
  input: AddCharacterKnowledgeInput
): CharacterKnowledgeFact | undefined {
  const world = getRuntimeWorldState();

  if (!world.characters[input.characterId]) {
    return undefined;
  }

  const playerId = playerIdForCharacter(input.characterId);

  if (playerId) {
    return addPlayerKnowledge({
      playerId,
      subjectId: input.subjectId,
      kind: input.kind,
      observedAt: input.observedAt,
      deliveredAt: input.deliveredAt,
      source: input.source,
      confidence: input.confidence,
      summary: input.summary,
      data: input.data,
    });
  }

  const sequence = allocateSimulationSequence();
  const now = getRuntimeWorldState().simulation.worldTimeMinutes;

  const fact: CharacterKnowledgeFact = {
    id: `character-knowledge-${sequence.toString().padStart(6, "0")}`,
    subjectId: input.subjectId,
    kind: input.kind,
    observedAt: input.observedAt,
    deliveredAt: input.deliveredAt ?? now,
    source: input.source,
    confidence: input.confidence,
    summary: input.summary,
    data: input.data ?? {},
  };

  updateRuntimeWorldState((current) => {
    const existing = current.session.characterKnowledge[input.characterId] ?? {
      characterId: input.characterId,
      facts: [],
    };

    return {
      ...current,
      session: {
        ...current.session,
        characterKnowledge: {
          ...current.session.characterKnowledge,
          [input.characterId]: {
            ...existing,
            facts: [...existing.facts, fact],
          },
        },
      },
    };
  });

  return fact;
}

export function getDeliveredCharacterKnowledge(
  characterId: string
): CharacterKnowledgeFact[] {
  const world = getRuntimeWorldState();
  const playerId = playerIdForCharacter(characterId);

  if (playerId) {
    return getDeliveredPlayerKnowledge(playerId);
  }

  const now = world.simulation.worldTimeMinutes;
  const state = world.session.characterKnowledge[characterId];

  return (state?.facts ?? [])
    .filter((fact) => fact.deliveredAt <= now)
    .sort(
      (a, b) =>
        a.deliveredAt - b.deliveredAt ||
        a.id.localeCompare(b.id)
    );
}
