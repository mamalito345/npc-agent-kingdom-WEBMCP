import {
  characters,
} from "@/data/characters";

import type {
  PoliticsRuntimeState,
  Relationship,
} from "@/types/politics";

function relationshipKey(
  fromCharacterId: string,
  toCharacterId: string
): string {
  return `${fromCharacterId}->${toCharacterId}`;
}

export function createInitialPoliticsRuntimeState(): PoliticsRuntimeState {
  const relationships: Record<string, Relationship> = {};

  for (
    const character
    of Object.values(
      characters
    )
  ) {
    for (
      const [
        toCharacterId,
        value,
      ]
      of Object.entries(
        character.relationships
      )
    ) {
      relationships[
        relationshipKey(
          character.id,
          toCharacterId
        )
      ] = {
        fromCharacterId:
          character.id,
        toCharacterId,
        value:
          Math.max(
            -100,
            Math.min(
              100,
              value
            )
          ),
      };
    }
  }

  return {
    relationships,
    agreements: {},
    promises: {},
  };
}
