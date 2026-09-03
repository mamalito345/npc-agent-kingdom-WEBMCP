import {
  getMapEdges,
  getMapNodes,
} from "@/lib/map/graph";

import {
  getArmySoldierCount,
} from "@/lib/military/army-queries";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  KnownWorldFact,
  PlayerSlot,
} from "@/types/session";

function stableHash(
  value: string
): number {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return hash >>> 0;
}

function neighboringKingdomIds(
  kingdomId: string
): string[] {
  const nodes =
    getMapNodes();

  const byId =
    new Map(
      nodes.map(
        (node) => [
          node.id,
          node,
        ]
      )
    );

  const found =
    new Set<string>();

  for (
    const edge
    of getMapEdges()
  ) {
    if (
      edge.borderCrossing
    ) {
      const {
        fromKingdomId,
        toKingdomId,
      } =
        edge.borderCrossing;

      if (
        fromKingdomId ===
          kingdomId &&
        toKingdomId !==
          kingdomId
      ) {
        found.add(
          toKingdomId
        );
      }

      if (
        toKingdomId ===
          kingdomId &&
        fromKingdomId !==
          kingdomId
      ) {
        found.add(
          fromKingdomId
        );
      }
    }

    const from =
      byId.get(
        edge.fromNodeId
      )?.territoryKingdomId;

    const to =
      byId.get(
        edge.toNodeId
      )?.territoryKingdomId;

    if (
      from ===
        kingdomId &&
      to &&
      to !==
        kingdomId
    ) {
      found.add(
        to
      );
    }

    if (
      to ===
        kingdomId &&
      from &&
      from !==
        kingdomId
    ) {
      found.add(
        from
      );
    }
  }

  return [
    ...found,
  ].sort();
}

function frontierNodesFor(
  homeKingdomId: string,
  foreignKingdomId: string
): string[] {
  const nodes =
    getMapNodes();

  const byId =
    new Map(
      nodes.map(
        (node) => [
          node.id,
          node,
        ]
      )
    );

  const result =
    new Set<string>();

  for (
    const edge
    of getMapEdges()
  ) {
    const from =
      byId.get(
        edge.fromNodeId
      );

    const to =
      byId.get(
        edge.toNodeId
      );

    if (
      from?.territoryKingdomId ===
        homeKingdomId &&
      to?.territoryKingdomId ===
        foreignKingdomId
    ) {
      result.add(
        to.id
      );
    }

    if (
      to?.territoryKingdomId ===
        homeKingdomId &&
      from?.territoryKingdomId ===
        foreignKingdomId
    ) {
      result.add(
        from.id
      );
    }
  }

  if (
    result.size >
    0
  ) {
    return [
      ...result,
    ].sort();
  }

  return nodes
    .filter(
      (node) =>
        node.territoryKingdomId ===
        foreignKingdomId
    )
    .map(
      (node) =>
        node.id
    )
    .sort();
}

function strengthBand(
  soldiers: number
): string {
  if (
    soldiers <
    500
  ) {
    return "small force";
  }

  if (
    soldiers <
    1200
  ) {
    return "modest host";
  }

  if (
    soldiers <
    2500
  ) {
    return "field army";
  }

  if (
    soldiers <
    5000
  ) {
    return "large army";
  }

  return "great host";
}

function approximateSoldiers(
  armyId: string,
  soldiers: number
): number {
  const hash =
    stableHash(
      armyId
    );

  const variation =
    0.82 +
    (
      hash %
      37
    ) /
      100;

  return Math.max(
    100,
    Math.round(
      soldiers *
        variation /
        250
    ) *
      250
  );
}

function makeBootstrapFacts(
  player:
    PlayerSlot,
  now:
    number
): KnownWorldFact[] {
  const world =
    getRuntimeWorldState();

  const neighbors =
    neighboringKingdomIds(
      player.kingdomId
    );

  const facts:
    KnownWorldFact[] =
    [];

  for (
    const neighborId
    of neighbors
  ) {
    const frontier =
      frontierNodesFor(
        player.kingdomId,
        neighborId
      );

    const armies =
      Object.values(
        world.armies
      )
        .filter(
          (army) =>
            army.ownerId ===
              neighborId &&
            army.status !==
              "destroyed"
        )
        .sort(
          (a, b) =>
            a.id.localeCompare(
              b.id
            )
        );

    for (
      const army
      of armies
    ) {
      const hash =
        stableHash(
          `${player.id}:${army.id}`
        );

      const ageMinutes =
        6 *
          60 +
        (
          hash %
          (
            18 *
            60
          )
        );

      const observedAt =
        Math.max(
          0,
          now -
            ageMinutes
        );

      const approximateNodeId =
        frontier.length >
        0
          ? frontier[
              hash %
                frontier.length
            ]
          : undefined;

      const approximate =
        approximateSoldiers(
          army.id,
          getArmySoldierCount(
            army.id
          )
        );

      facts.push({
        id:
          `bootstrap-intel-${player.id}-${army.id}`,
        subjectId:
          army.id,
        kind:
          "army",
        observedAt,
        deliveredAt:
          now,
        source:
          "strategic_briefing",
        confidence:
          ageMinutes <=
            12 *
              60
            ? "medium"
            : "low",
        summary:
          `Border scouts report a ${strengthBand(
            approximate
          )} of ${neighborId} near the frontier. The report is approximate and ${Math.max(
            1,
            Math.round(
              ageMinutes /
                60
            )
          )} hours old.`,
        data: {
          nodeId:
            approximateNodeId ??
            null,
          approximate:
            true,
          bootstrapIntel:
            true,
          ownerKingdomId:
            neighborId,
          approximateSoldiers:
            approximate,
          strengthBand:
            strengthBand(
              approximate
            ),
          ageMinutes,
        },
      });
    }
  }

  return facts;
}

export function getInitialStrategicIntelligenceFacts(
  playerId: string
): KnownWorldFact[] {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[
      playerId
    ];

  if (!player) {
    return [];
  }

  return makeBootstrapFacts(
    player,
    world.simulation
      .worldTimeMinutes
  );
}
