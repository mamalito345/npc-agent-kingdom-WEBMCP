import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  Relationship,
} from "@/types/politics";

function clampRelationship(
  value: number
): number {
  return Math.max(
    -100,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

export function relationshipKey(
  fromCharacterId: string,
  toCharacterId: string
): string {
  return `${fromCharacterId}->${toCharacterId}`;
}

export function getRelationship(
  fromCharacterId: string,
  toCharacterId: string
): Relationship {
  const world =
    getRuntimeWorldState();

  const existing =
    world.session.politics
      .relationships[
        relationshipKey(
          fromCharacterId,
          toCharacterId
        )
      ];

  if (existing) {
    return existing;
  }

  const fallback =
    world.characters[
      fromCharacterId
    ]?.relationships[
      toCharacterId
    ] ?? 0;

  return {
    fromCharacterId,
    toCharacterId,
    value:
      clampRelationship(
        fallback
      ),
  };
}

export function setRelationship(
  fromCharacterId: string,
  toCharacterId: string,
  value: number
): Relationship {
  const relationship: Relationship = {
    fromCharacterId,
    toCharacterId,
    value:
      clampRelationship(
        value
      ),
  };

  updateRuntimeWorldState(
    (current) => {
      const fromCharacter =
        current.characters[
          fromCharacterId
        ];

      const nextCharacters =
        fromCharacter
          ? {
              ...current.characters,
              [fromCharacterId]: {
                ...fromCharacter,
                relationships: {
                  ...fromCharacter.relationships,
                  [toCharacterId]:
                    relationship.value,
                },
              },
            }
          : current.characters;

      return {
        ...current,
        characters:
          nextCharacters,
        session: {
          ...current.session,
          politics: {
            ...current.session
              .politics,
            relationships: {
              ...current.session
                .politics
                .relationships,
              [relationshipKey(
                fromCharacterId,
                toCharacterId
              )]:
                relationship,
            },
          },
        },
      };
    }
  );

  return relationship;
}

export function adjustRelationship(
  fromCharacterId: string,
  toCharacterId: string,
  delta: number
): Relationship {
  const current =
    getRelationship(
      fromCharacterId,
      toCharacterId
    );

  return setRelationship(
    fromCharacterId,
    toCharacterId,
    current.value + delta
  );
}
