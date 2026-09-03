import {
  getBattleTerrainForEdge,
  getBattleTerrainForNode,
} from "@/data/battle-terrain";

import {
  getConnectedEdges,
  getMapEdge,
  getMapNode,
  getOtherNodeId,
} from "@/lib/map/graph";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  BattleFeature,
  BattleTerrain,
} from "@/types/military";

export type ApproachDirection =
  | "from"
  | "to"
  | "unknown";

export interface BattlefieldAlternative {
  nodeId: string;
  terrain: BattleTerrain;
  features: BattleFeature[];
  defenderScore: number;
  attackerScore: number;
  reason: string;
}

export interface BattlefieldResolution {
  anchorNodeId: string;
  roadEdgeId?: string;
  roadProgress?: number;
  terrain: BattleTerrain;
  features: BattleFeature[];
  attackerApproach: ApproachDirection;
  defenderApproach: ApproachDirection;
  frontageMultiplier: number;
  bridgehead: boolean;
  riverCrossing: boolean;
  chokepoint: boolean;
  notes: string[];
  adjacentAlternatives: BattlefieldAlternative[];
}

function uniqueFeatures(
  values: BattleFeature[]
): BattleFeature[] {
  return [...new Set(values)];
}

function inferApproachOnEdge(
  armyId: string,
  edgeId: string
): ApproachDirection {
  const world =
    getRuntimeWorldState();

  const position =
    world.simulation
      .entityPositions[
        armyId
      ];

  if (
    position?.kind ===
      "edge" &&
    position.edgeId ===
      edgeId
  ) {
    return position.direction ===
      "forward"
      ? "from"
      : "to";
  }

  const movement =
    world.simulation
      .activeMovements[
        armyId
      ];

  if (!movement) {
    return "unknown";
  }

  const index =
    movement.routeEdgeIds
      .indexOf(
        edgeId
      );

  if (
    index <
    0
  ) {
    return "unknown";
  }

  const fromNode =
    movement.routeNodeIds[
      index
    ];

  const edge =
    getMapEdge(
      edgeId
    );

  if (!edge) {
    return "unknown";
  }

  return fromNode ===
    edge.fromNodeId
    ? "from"
    : "to";
}

function inferNodeArrivalEdge(
  armyId: string,
  nodeId: string
): string | undefined {
  const world =
    getRuntimeWorldState();

  const movement =
    world.simulation
      .activeMovements[
        armyId
      ];

  if (!movement) {
    return undefined;
  }

  const nodeIndex =
    movement.routeNodeIds
      .indexOf(
        nodeId
      );

  if (
    nodeIndex <=
    0
  ) {
    return undefined;
  }

  return movement.routeEdgeIds[
    nodeIndex - 1
  ];
}

function getFrontageMultiplier(
  terrain: BattleTerrain,
  features: BattleFeature[]
): number {
  let value =
    1;

  if (
    features.includes(
      "narrow_pass"
    )
  ) {
    value *=
      0.55;
  }

  if (
    features.includes(
      "bridge"
    )
  ) {
    value *=
      0.5;
  }

  if (
    terrain ===
    "mountain"
  ) {
    value *=
      0.72;
  }

  if (
    terrain ===
    "dense_forest"
  ) {
    value *=
      0.78;
  }

  if (
    terrain ===
      "marsh" ||
    terrain ===
      "river_crossing"
  ) {
    value *=
      0.75;
  }

  return Math.max(
    0.4,
    Math.round(
      value *
        100
    ) /
      100
  );
}

function scoreAlternative(
  nodeId: string
): BattlefieldAlternative {
  const resolved =
    getBattleTerrainForNode(
      nodeId
    );

  let defenderScore =
    1;

  let attackerScore =
    1;

  const reasons:
    string[] = [];

  if (
    resolved.terrain ===
    "hills"
  ) {
    defenderScore +=
      0.2;

    reasons.push(
      "hills"
    );
  }

  if (
    resolved.features.includes(
      "high_ground"
    )
  ) {
    defenderScore +=
      0.25;

    reasons.push(
      "high ground"
    );
  }

  if (
    resolved.features.includes(
      "narrow_pass"
    )
  ) {
    defenderScore +=
      0.3;

    attackerScore -=
      0.2;

    reasons.push(
      "narrow frontage"
    );
  }

  if (
    resolved.features.includes(
      "bridge"
    )
  ) {
    defenderScore +=
      0.35;

    attackerScore -=
      0.3;

    reasons.push(
      "bridge control"
    );
  }

  if (
    resolved.terrain ===
    "plains"
  ) {
    attackerScore +=
      0.12;

    reasons.push(
      "open maneuver"
    );
  }

  return {
    nodeId,
    terrain:
      resolved.terrain,
    features: [
      ...resolved.features,
    ],
    defenderScore:
      Math.round(
        defenderScore *
          100
      ) /
      100,
    attackerScore:
      Math.round(
        attackerScore *
          100
      ) /
      100,
    reason:
      reasons.length >
      0
        ? reasons.join(
            ", "
          )
        : "neutral ground",
  };
}

function getAdjacentAlternatives(
  nodeId: string
): BattlefieldAlternative[] {
  return getConnectedEdges(
    nodeId
  )
    .map(
      (edge) =>
        getOtherNodeId(
          edge,
          nodeId
        )
    )
    .filter(
      (
        candidate
      ): candidate is string =>
        Boolean(
          candidate
        )
    )
    .map(
      scoreAlternative
    )
    .sort(
      (a, b) =>
        (
          b.defenderScore -
          b.attackerScore
        ) -
          (
            a.defenderScore -
            a.attackerScore
          ) ||
        a.nodeId.localeCompare(
          b.nodeId
        )
    );
}

export function resolveBattlefield(
  attackerArmyId: string,
  defenderArmyId: string,
  input:
    | {
        kind: "node";
        nodeId: string;
      }
    | {
        kind: "edge";
        edgeId: string;
        progress: number;
      }
): BattlefieldResolution {
  if (
    input.kind ===
    "edge"
  ) {
    const edge =
      getMapEdge(
        input.edgeId
      );

    if (!edge) {
      throw new Error(
        `Unknown battlefield edge: ${input.edgeId}`
      );
    }

    const base =
      getBattleTerrainForEdge(
        input.edgeId
      );

    const features =
      [...base.features];

    const riverCrossing =
      edge.terrain ===
      "river_road";

    const bridgehead =
      riverCrossing ||
      features.includes(
        "bridge"
      );

    if (
      bridgehead &&
      !features.includes(
        "bridge"
      )
    ) {
      features.push(
        "bridge"
      );
    }

    const endpoint =
      input.progress <
      0.5
        ? edge.fromNodeId
        : edge.toNodeId;

    const endpointNode =
      getMapNode(
        endpoint
      );

    if (
      endpointNode
        ?.features.includes(
          "narrow_pass"
        )
    ) {
      features.push(
        "narrow_pass"
      );
    }

    const chokepoint =
      features.includes(
        "bridge"
      ) ||
      features.includes(
        "narrow_pass"
      ) ||
      base.terrain ===
        "mountain";

    const notes:
      string[] = [];

    if (
      bridgehead
    ) {
      notes.push(
        "The engagement occurs on or immediately around a bridgehead."
      );
    }

    if (
      chokepoint
    ) {
      notes.push(
        "Frontage is constrained; numerical superiority cannot deploy at full width."
      );
    }

    return {
      anchorNodeId:
        endpoint,
      roadEdgeId:
        input.edgeId,
      roadProgress:
        input.progress,
      terrain:
        base.terrain,
      features:
        uniqueFeatures(
          features
        ),
      attackerApproach:
        inferApproachOnEdge(
          attackerArmyId,
          input.edgeId
        ),
      defenderApproach:
        inferApproachOnEdge(
          defenderArmyId,
          input.edgeId
        ),
      frontageMultiplier:
        getFrontageMultiplier(
          base.terrain,
          uniqueFeatures(
            features
          )
        ),
      bridgehead,
      riverCrossing,
      chokepoint,
      notes,
      adjacentAlternatives:
        getAdjacentAlternatives(
          endpoint
        ),
    };
  }

  const base =
    getBattleTerrainForNode(
      input.nodeId
    );

  const attackerArrivalEdge =
    inferNodeArrivalEdge(
      attackerArmyId,
      input.nodeId
    );

  const defenderArrivalEdge =
    inferNodeArrivalEdge(
      defenderArmyId,
      input.nodeId
    );

  const arrivalEdges =
    [
      attackerArrivalEdge,
      defenderArrivalEdge,
    ]
      .filter(
        (
          edgeId
        ): edgeId is string =>
          Boolean(
            edgeId
          )
      )
      .map(
        (edgeId) =>
          getMapEdge(
            edgeId
          )
      )
      .filter(
        (
          edge
        ): edge is NonNullable<
          ReturnType<
            typeof getMapEdge
          >
        > =>
          Boolean(
            edge
          )
      );

  const features =
    [...base.features];

  const riverApproach =
    arrivalEdges.some(
      (edge) =>
        edge.terrain ===
        "river_road"
    );

  if (
    riverApproach &&
    !features.includes(
      "bridge"
    )
  ) {
    features.push(
      "bridge"
    );
  }

  const nodeDegree =
    getConnectedEdges(
      input.nodeId
    ).length;

  const chokepoint =
    features.includes(
      "bridge"
    ) ||
    features.includes(
      "narrow_pass"
    ) ||
    base.terrain ===
      "mountain" ||
    nodeDegree <=
      2 &&
      (
        base.terrain ===
          "hills" ||
        base.terrain ===
          "dense_forest"
      );

  if (
    chokepoint &&
    !features.includes(
      "narrow_pass"
    ) &&
    base.terrain ===
      "mountain"
  ) {
    features.push(
      "narrow_pass"
    );
  }

  const notes:
    string[] = [];

  if (
    riverApproach
  ) {
    notes.push(
      "At least one force is arriving through a river-road approach; the crossing becomes tactically relevant."
    );
  }

  if (
    chokepoint
  ) {
    notes.push(
      "The local road geometry and terrain create restricted frontage."
    );
  }

  if (
    attackerArrivalEdge
  ) {
    notes.push(
      `Attacker approach edge: ${attackerArrivalEdge}.`
    );
  }

  if (
    defenderArrivalEdge
  ) {
    notes.push(
      `Defender approach edge: ${defenderArrivalEdge}.`
    );
  }

  return {
    anchorNodeId:
      input.nodeId,
    terrain:
      base.terrain,
    features:
      uniqueFeatures(
        features
      ),
    attackerApproach:
      attackerArrivalEdge
        ? "from"
        : "unknown",
    defenderApproach:
      defenderArrivalEdge
        ? "from"
        : "unknown",
    frontageMultiplier:
      getFrontageMultiplier(
        base.terrain,
        uniqueFeatures(
          features
        )
      ),
    bridgehead:
      features.includes(
        "bridge"
      ),
    riverCrossing:
      riverApproach ||
      base.terrain ===
        "river_crossing",
    chokepoint,
    notes,
    adjacentAlternatives:
      getAdjacentAlternatives(
        input.nodeId
      ),
  };
}
