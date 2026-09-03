import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  STRATEGIC_BRIEFING_INTERVAL_MINUTES,
} from "@/data/session";

import {
  getInitialStrategicIntelligenceFacts,
} from "@/lib/intelligence/strategic-intelligence";

import type {
  KnowledgeConfidence,
  KnowledgeSource,
  KnownWorldFact,
} from "@/types/session";

import type {
  WorldMinute,
} from "@/types/simulation";

export interface AddKnowledgeInput {
  playerId: string;
  subjectId: string;
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

function agedConfidence(
  fact:
    KnownWorldFact,
  ageMinutes:
    number
): KnowledgeConfidence {
  if (
    fact.kind !==
    "army"
  ) {
    return fact.confidence;
  }

  if (
    fact.source ===
      "direct_observation" &&
    ageMinutes <=
      120
  ) {
    return "confirmed";
  }

  if (
    ageMinutes <=
    6 *
      60
  ) {
    return fact.confidence ===
      "confirmed"
      ? "high"
      : fact.confidence;
  }

  if (
    ageMinutes <=
    24 *
      60
  ) {
    return fact.confidence ===
        "rumor" ||
      fact.confidence ===
        "low"
      ? fact.confidence
      : "medium";
  }

  if (
    ageMinutes <=
    3 *
      24 *
      60
  ) {
    return fact.confidence ===
      "rumor"
      ? "rumor"
      : "low";
  }

  return "rumor";
}

function ageFact(
  fact:
    KnownWorldFact,
  now:
    number
):
  KnownWorldFact {
  if (
    fact.kind !==
    "army"
  ) {
    return fact;
  }

  const ageMinutes =
    Math.max(
      0,
      now -
        fact.observedAt
    );

  return {
    ...fact,
    confidence:
      agedConfidence(
        fact,
        ageMinutes
      ),
    data: {
      ...fact.data,
      ageMinutes,
      visibility:
        ageMinutes <=
            120 &&
          fact.source ===
            "direct_observation"
          ? "observed"
          : "ghost",
      stale:
        ageMinutes >
        120,
    },
  };
}

export function getDeliveredPlayerKnowledge(
  playerId: string
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

  const bootstrap =
    knowledge.facts.some(
      (fact) =>
        fact.data
          .bootstrapIntel ===
        true
    )
      ? []
      : getInitialStrategicIntelligenceFacts(
          playerId
        );

  return [
    ...knowledge.facts,
    ...bootstrap,
  ]
    .filter(
      (fact) =>
        fact.deliveredAt <=
        now
    )
    .map(
      (fact) =>
        ageFact(
          fact,
          now
        )
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
