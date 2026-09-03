import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getDeliveredPlayerKnowledge,
} from "@/lib/session/knowledge";

import {
  getRealmBudgetSnapshot,
} from "@/lib/economy/realm-budget";

import {
  getKingdomTerritoryEconomy,
} from "@/lib/economy/territory-economy";

import type {
  KnownWorldFact,
} from "@/types/session";

import type {
  WorldMinute,
} from "@/types/simulation";

export type StrategicBriefingSeverity =
  | "routine"
  | "attention"
  | "urgent"
  | "critical";

export interface StrategicBriefingItem {
  id: string;
  category:
    | "military"
    | "territory"
    | "economy"
    | "diplomacy"
    | "message"
    | "operations";
  severity:
    StrategicBriefingSeverity;
  summary: string;
  sourceFactId?: string;
}

export interface PlayerStrategicBriefing {
  playerId: string;
  kingdomId: string;
  generatedAt: WorldMinute;
  since: WorldMinute;
  severity:
    StrategicBriefingSeverity;
  meaningful: boolean;
  newFactCount: number;
  items:
    StrategicBriefingItem[];
  economy: {
    treasury: number;
    dailyIncomeGold: number;
    dailyArmyCostGold: number;
    projectedDailyNetGold: number;
    recommendedReserveGold: number;
    spendableGold: number;
    reserveCoverageDays: number;
  };
  territory: {
    homeNodeCount: number;
    contestedNodeCount: number;
    occupiedNodeCount: number;
    dailyTerritoryGold: number;
    disruptedGold: number;
  };
}

const SEVERITY_WEIGHT:
  Record<
    StrategicBriefingSeverity,
    number
  > = {
  routine: 0,
  attention: 1,
  urgent: 2,
  critical: 3,
};

function maxSeverity(
  values:
    StrategicBriefingSeverity[]
): StrategicBriefingSeverity {
  return values.sort(
    (a, b) =>
      SEVERITY_WEIGHT[b] -
      SEVERITY_WEIGHT[a]
  )[0] ??
    "routine";
}

function classifyFact(
  fact:
    KnownWorldFact
): StrategicBriefingItem {
  if (
    fact.kind ===
    "battle"
  ) {
    return {
      id:
        `brief-${fact.id}`,
      category:
        "military",
      severity:
        "critical",
      summary:
        fact.summary,
      sourceFactId:
        fact.id,
    };
  }

  if (
    fact.kind ===
    "army"
  ) {
    return {
      id:
        `brief-${fact.id}`,
      category:
        "military",
      severity:
        fact.confidence ===
          "confirmed" ||
        fact.confidence ===
          "high"
          ? "urgent"
          : "attention",
      summary:
        fact.summary,
      sourceFactId:
        fact.id,
    };
  }

  if (
    fact.kind ===
    "message"
  ) {
    return {
      id:
        `brief-${fact.id}`,
      category:
        "message",
      severity:
        "attention",
      summary:
        fact.summary,
      sourceFactId:
        fact.id,
    };
  }

  if (
    fact.kind ===
    "event"
  ) {
    const text =
      fact.summary
        .toLowerCase();

    const critical =
      text.includes(
        "battle"
      ) ||
      text.includes(
        "siege"
      ) ||
      text.includes(
        "captur"
      );

    const urgent =
      text.includes(
        "border"
      ) ||
      text.includes(
        "war"
      ) ||
      text.includes(
        "attack"
      ) ||
      text.includes(
        "threat"
      );

    return {
      id:
        `brief-${fact.id}`,
      category:
        urgent ||
        critical
          ? "diplomacy"
          : "operations",
      severity:
        critical
          ? "critical"
          : urgent
            ? "urgent"
            : "attention",
      summary:
        fact.summary,
      sourceFactId:
        fact.id,
    };
  }

  return {
    id:
      `brief-${fact.id}`,
    category:
      "operations",
    severity:
      "attention",
    summary:
      fact.summary,
    sourceFactId:
      fact.id,
  };
}

function deduplicateLatestFacts(
  facts:
    KnownWorldFact[]
): KnownWorldFact[] {
  const latest =
    new Map<
      string,
      KnownWorldFact
    >();

  for (
    const fact
    of facts
  ) {
    const key =
      `${fact.kind}:${fact.subjectId}`;

    const current =
      latest.get(
        key
      );

    if (
      !current ||
      fact.deliveredAt >
        current.deliveredAt ||
      (
        fact.deliveredAt ===
          current.deliveredAt &&
        fact.observedAt >
          current.observedAt
      )
    ) {
      latest.set(
        key,
        fact
      );
    }
  }

  return [
    ...latest.values(),
  ].sort(
    (a, b) =>
      b.deliveredAt -
        a.deliveredAt ||
      b.observedAt -
        a.observedAt ||
      a.id.localeCompare(
        b.id
      )
  );
}

export function buildPlayerStrategicBriefing(
  playerId:
    string,
  worldTime =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes
): PlayerStrategicBriefing | undefined {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[
      playerId
    ];

  const knowledge =
    world.session.knowledge[
      playerId
    ];

  if (
    !player ||
    !knowledge
  ) {
    return undefined;
  }

  const since =
    knowledge
      .lastStrategicBriefingAt;

  /*
   * Player-safe rule:
   * only already-delivered knowledge is summarized.
   * No scan of canonical enemy armies, positions, routes or politics occurs.
   */
  const newFacts =
    deduplicateLatestFacts(
      getDeliveredPlayerKnowledge(
        playerId
      ).filter(
        (fact) =>
          fact.deliveredAt >
            since &&
          !(
            fact.kind ===
              "event" &&
            fact.data[
              "strategicBriefing"
            ] ===
              true
          )
      )
    );

  const items =
    newFacts
      .map(
        classifyFact
      )
      .slice(
        0,
        10
      );

  const budget =
    getRealmBudgetSnapshot(
      player.kingdomId
    );

  const territory =
    getKingdomTerritoryEconomy(
      player.kingdomId
    );

  if (
    territory
      .occupiedHomeNodeCount >
    0
  ) {
    items.unshift({
      id:
        `brief-territory-occupied-${worldTime}`,
      category:
        "territory",
      severity:
        "critical",
      summary:
        `${territory.occupiedHomeNodeCount} home strategic node(s) are under hostile occupation.`,
    });
  } else if (
    territory
      .contestedNodeCount >
    0
  ) {
    items.unshift({
      id:
        `brief-territory-contested-${worldTime}`,
      category:
        "territory",
      severity:
        "urgent",
      summary:
        `${territory.contestedNodeCount} home strategic node(s) are contested.`,
    });
  }

  if (
    budget
      .projectedDailyNetGold <
    0
  ) {
    items.unshift({
      id:
        `brief-economy-deficit-${worldTime}`,
      category:
        "economy",
      severity:
        budget
          .reserveCoverageDays <
        3
          ? "critical"
          : "urgent",
      summary:
        `Realm finances are running a daily deficit of ${Math.abs(
          budget
            .projectedDailyNetGold
        ).toFixed(
          1
        )} gold.`,
    });
  } else if (
    budget
      .reserveCoverageDays <
    3
  ) {
    items.unshift({
      id:
        `brief-economy-reserve-${worldTime}`,
      category:
        "economy",
      severity:
        "urgent",
      summary:
        `Treasury covers less than three days of current army upkeep.`,
    });
  }

  const ownActiveBattles =
    Object.values(
      world.battles
    ).filter(
      (battle) =>
        battle.status ===
          "active" &&
        [
          ...battle
            .attackerArmyIds,
          ...battle
            .defenderArmyIds,
        ].some(
          (armyId) =>
            world.armies[
              armyId
            ]?.ownerId ===
            player.kingdomId
        )
    );

  if (
    ownActiveBattles.length >
    0
  ) {
    items.unshift({
      id:
        `brief-own-battles-${worldTime}`,
      category:
        "military",
      severity:
        "critical",
      summary:
        `${ownActiveBattles.length} battle(s) involving your forces remain active.`,
    });
  }

  const failedOrders =
    Object.values(
      world.session.orders
    ).filter(
      (order) =>
        order.playerId ===
          playerId &&
        order.status ===
          "failed" &&
        order.updatedAt >
          since
    );

  if (
    failedOrders.length >
    0
  ) {
    items.unshift({
      id:
        `brief-failed-orders-${worldTime}`,
      category:
        "operations",
      severity:
        "urgent",
      summary:
        `${failedOrders.length} strategic order(s) failed since the previous briefing.`,
    });
  }

  const trimmed =
    items.slice(
      0,
      12
    );

  const severity =
    maxSeverity(
      trimmed.map(
        (item) =>
          item.severity
      )
    );

  /*
   * Routine reports are recorded without interrupting command flow.
   * New delivered facts count as meaningful only when at least one classified
   * item exists. Existing critical own-state conditions also remain meaningful.
   */
  const meaningful =
    trimmed.some(
      (item) =>
        SEVERITY_WEIGHT[
          item.severity
        ] >=
        SEVERITY_WEIGHT[
          "attention"
        ]
    );

  return {
    playerId,
    kingdomId:
      player.kingdomId,
    generatedAt:
      worldTime,
    since,
    severity,
    meaningful,
    newFactCount:
      newFacts.length,
    items:
      trimmed,

    economy: {
      treasury:
        budget.treasury,
      dailyIncomeGold:
        budget
          .dailyIncomeGold,
      dailyArmyCostGold:
        budget
          .dailyArmyExpenseGold,
      projectedDailyNetGold:
        budget
          .projectedDailyNetGold,
      recommendedReserveGold:
        budget
          .recommendedReserveGold,
      spendableGold:
        budget
          .spendableGold,
      reserveCoverageDays:
        budget
          .reserveCoverageDays,
    },

    territory: {
      homeNodeCount:
        territory
          .homeNodeCount,
      contestedNodeCount:
        territory
          .contestedNodeCount,
      occupiedNodeCount:
        territory
          .occupiedHomeNodeCount,
      dailyTerritoryGold:
        territory
          .dailyTerritoryGold,
      disruptedGold:
        territory
          .disruptedGold,
    },
  };
}

export function encodeStrategicBriefing(
  briefing:
    PlayerStrategicBriefing
): string {
  return JSON.stringify(
    briefing
  );
}

export function decodeStrategicBriefing(
  value:
    unknown
): PlayerStrategicBriefing | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  try {
    const parsed =
      JSON.parse(
        value
      ) as
        PlayerStrategicBriefing;

    return parsed &&
      typeof parsed ===
        "object" &&
      Array.isArray(
        parsed.items
      )
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

export function getLatestDeliveredStrategicBriefing(
  playerId:
    string
): PlayerStrategicBriefing | undefined {
  const fact =
    getDeliveredPlayerKnowledge(
      playerId
    )
      .filter(
        (candidate) =>
          candidate.kind ===
            "event" &&
          candidate.data[
            "strategicBriefing"
          ] ===
            true
      )
      .sort(
        (a, b) =>
          b.deliveredAt -
            a.deliveredAt ||
          b.id.localeCompare(
            a.id
          )
      )[0];

  return fact
    ? decodeStrategicBriefing(
        fact.data[
          "briefingJson"
        ]
      )
    : undefined;
}
