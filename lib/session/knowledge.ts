import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  STRATEGIC_BRIEFING_INTERVAL_MINUTES,
} from "@/data/session";

import type {
  KnowledgeConfidence,
  KnowledgeSource,
  KnownWorldFact,
} from "@/types/session";

import type {
  WorldMinute,
} from "@/types/simulation";

export interface AddKnowledgeInput {
  playerId:
    string;

  subjectId:
    string;

  kind:
    KnownWorldFact[
      "kind"
    ];

  observedAt:
    WorldMinute;

  deliveredAt?:
    WorldMinute;

  source:
    KnowledgeSource;

  confidence:
    KnowledgeConfidence;

  summary:
    string;

  data?:
    KnownWorldFact[
      "data"
    ];
}

export function addPlayerKnowledge(
  input:
    AddKnowledgeInput
): KnownWorldFact | undefined {
  const world =
    getRuntimeWorldState();

  const knowledge =
    world.session
      .knowledge[
        input.playerId
      ];

  if (!knowledge) {
    return undefined;
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const fact:
    KnownWorldFact = {
    id:
      `knowledge-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    subjectId:
      input.subjectId,

    kind:
      input.kind,

    observedAt:
      input.observedAt,

    deliveredAt:
      input.deliveredAt ??
      now,

    source:
      input.source,

    confidence:
      input.confidence,

    summary:
      input.summary,

    data:
      input.data ??
      {},
  };

  updateRuntimeWorldState(
    (current) => {
      const existing =
        current.session
          .knowledge[
            input.playerId
          ];

      if (!existing) {
        return current;
      }

      return {
        ...current,

        session: {
          ...current.session,

          knowledge: {
            ...current
              .session
              .knowledge,

            [input.playerId]: {
              ...existing,

              facts: [
                ...existing.facts,
                fact,
              ],
            },
          },
        },
      };
    }
  );

  return fact;
}

export function getDeliveredPlayerKnowledge(
  playerId:
    string
): KnownWorldFact[] {
  const world =
    getRuntimeWorldState();

  const knowledge =
    world.session
      .knowledge[
        playerId
      ];

  if (!knowledge) {
    return [];
  }

  const now =
    world.simulation
      .worldTimeMinutes;

  return knowledge
    .facts
    .filter(
      (fact) =>
        fact.deliveredAt <=
        now
    )
    .sort(
      (a, b) =>
        a.deliveredAt -
          b.deliveredAt ||
        a.id.localeCompare(
          b.id
        )
    );
}

export function playerNeedsStrategicBriefing(
  playerId:
    string,
  worldTime:
    WorldMinute
): boolean {
  const knowledge =
    getRuntimeWorldState()
      .session
      .knowledge[
        playerId
      ];

  if (!knowledge) {
    return false;
  }

  return (
    worldTime >=
    knowledge
      .nextStrategicBriefingAt
  );
}

export function markStrategicBriefingDelivered(
  playerId:
    string,
  worldTime:
    WorldMinute
): void {
  updateRuntimeWorldState(
    (current) => {
      const knowledge =
        current.session
          .knowledge[
            playerId
          ];

      if (!knowledge) {
        return current;
      }

      return {
        ...current,

        session: {
          ...current.session,

          knowledge: {
            ...current
              .session
              .knowledge,

            [playerId]: {
              ...knowledge,

              lastStrategicBriefingAt:
                worldTime,

              nextStrategicBriefingAt:
                worldTime +
                STRATEGIC_BRIEFING_INTERVAL_MINUTES,
            },
          },
        },
      };
    }
  );
}