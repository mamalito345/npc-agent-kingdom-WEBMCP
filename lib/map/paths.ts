import type {
  Route,
} from "@/types/map";

import {
  getConnectedEdges,
  getEffectiveEdgeDistance,
  getMapEdge,
  getMapNode,
  getOtherNodeId,
  getPhysicalEdgeDistance,
} from "@/lib/map/graph";

interface NodeDistance {
  nodeId: string;

  effectiveDistanceKm:
    number;
}

export function findRoute(
  fromNodeId: string,
  toNodeId: string
): Route | null {
  if (
    !getMapNode(
      fromNodeId
    ) ||
    !getMapNode(
      toNodeId
    )
  ) {
    return null;
  }

  if (
    fromNodeId ===
    toNodeId
  ) {
    return {
      nodeIds: [
        fromNodeId,
      ],

      edgeIds: [],

      totalDistanceKm:
        0,

      effectiveDistanceKm:
        0,
    };
  }

  const distances =
    new Map<
      string,
      number
    >();

  const previousNode =
    new Map<
      string,
      string
    >();

  const previousEdge =
    new Map<
      string,
      string
    >();

  const unvisited =
    new Set<
      string
    >();

  const allNodes =
    new Set<
      string
    >();

  function collectNode(
    nodeId: string
  ): void {
    if (
      allNodes.has(
        nodeId
      )
    ) {
      return;
    }

    allNodes.add(
      nodeId
    );

    for (
      const edge
      of getConnectedEdges(
        nodeId
      )
    ) {
      const otherNodeId =
        getOtherNodeId(
          edge,
          nodeId
        );

      if (
        otherNodeId &&
        !allNodes.has(
          otherNodeId
        )
      ) {
        collectNode(
          otherNodeId
        );
      }
    }
  }

  collectNode(
    fromNodeId
  );

  for (
    const nodeId
    of allNodes
  ) {
    distances.set(
      nodeId,

      nodeId ===
      fromNodeId
        ? 0
        : Number
            .POSITIVE_INFINITY
    );

    unvisited.add(
      nodeId
    );
  }

  while (
    unvisited.size >
    0
  ) {
    const candidates:
      NodeDistance[] =
      [
        ...unvisited,
      ].map(
        (nodeId) => ({
          nodeId,

          effectiveDistanceKm:
            distances.get(
              nodeId
            ) ??
            Number
              .POSITIVE_INFINITY,
        })
      );

    candidates.sort(
      (a, b) => {
        if (
          a.effectiveDistanceKm !==
          b.effectiveDistanceKm
        ) {
          return (
            a.effectiveDistanceKm -
            b.effectiveDistanceKm
          );
        }

        return a.nodeId.localeCompare(
          b.nodeId
        );
      }
    );

    const current =
      candidates[0];

    if (!current) {
      break;
    }

    if (
      !Number.isFinite(
        current.effectiveDistanceKm
      )
    ) {
      break;
    }

    unvisited.delete(
      current.nodeId
    );

    if (
      current.nodeId ===
      toNodeId
    ) {
      break;
    }

    for (
      const edge
      of getConnectedEdges(
        current.nodeId
      )
    ) {
      const neighbourId =
        getOtherNodeId(
          edge,
          current.nodeId
        );

      if (
        !neighbourId ||
        !unvisited.has(
          neighbourId
        )
      ) {
        continue;
      }

      const candidateDistance =
        current
          .effectiveDistanceKm +
        getEffectiveEdgeDistance(
          edge
        );

      const knownDistance =
        distances.get(
          neighbourId
        ) ??
        Number
          .POSITIVE_INFINITY;

      const shouldReplace =
        candidateDistance <
        knownDistance;

      const deterministicTie =
        candidateDistance ===
          knownDistance &&
        edge.id.localeCompare(
          previousEdge.get(
            neighbourId
          ) ??
            "\uffff"
        ) <
          0;

      if (
        shouldReplace ||
        deterministicTie
      ) {
        distances.set(
          neighbourId,
          candidateDistance
        );

        previousNode.set(
          neighbourId,
          current.nodeId
        );

        previousEdge.set(
          neighbourId,
          edge.id
        );
      }
    }
  }

  const finalDistance =
    distances.get(
      toNodeId
    );

  if (
    finalDistance ===
      undefined ||
    !Number.isFinite(
      finalDistance
    )
  ) {
    return null;
  }

  const nodeIds:
    string[] = [
    toNodeId,
  ];

  const edgeIds:
    string[] = [];

  let cursor =
    toNodeId;

  while (
    cursor !==
    fromNodeId
  ) {
    const previous =
      previousNode.get(
        cursor
      );

    const edgeId =
      previousEdge.get(
        cursor
      );

    if (
      !previous ||
      !edgeId
    ) {
      return null;
    }

    nodeIds.push(
      previous
    );

    edgeIds.push(
      edgeId
    );

    cursor =
      previous;
  }

  nodeIds.reverse();

  edgeIds.reverse();

  let totalDistanceKm =
    0;

  let effectiveDistanceKm =
    0;

  for (
    const edgeId
    of edgeIds
  ) {
    const edge =
      getMapEdge(
        edgeId
      );

    if (!edge) {
      throw new Error(
        `Resolved route references unknown edge: ${edgeId}`
      );
    }

    totalDistanceKm +=
      getPhysicalEdgeDistance(
        edge
      );

    effectiveDistanceKm +=
      getEffectiveEdgeDistance(
        edge
      );
  }

  return {
    nodeIds,

    edgeIds,

    totalDistanceKm,

    effectiveDistanceKm,
  };
}