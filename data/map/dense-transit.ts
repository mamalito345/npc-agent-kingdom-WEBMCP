import type {
  GameMapDefinition,
  MapEdge,
  MapNode,
} from "@/types/map";

function normalizeNode(
  node: MapNode
): MapNode {
  const settlement =
    typeof node.locationId ===
    "string";

  return {
    ...node,
    kind:
      node.kind ??
      (
        settlement
          ? "settlement"
          : "transit"
      ),
    hidden:
      settlement
        ? false
        : (
            node.hidden ??
            true
          ),
  };
}

function validateEdge(
  edge: MapEdge,
  nodes: Record<string, MapNode>
): MapEdge {
  if (!nodes[edge.fromNodeId]) {
    throw new Error(
      `MAP_EDGE_FROM_NODE_NOT_FOUND: ${edge.id} -> ${edge.fromNodeId}`
    );
  }

  if (!nodes[edge.toNodeId]) {
    throw new Error(
      `MAP_EDGE_TO_NODE_NOT_FOUND: ${edge.id} -> ${edge.toNodeId}`
    );
  }

  if (
    edge.distanceKm <=
    0
  ) {
    throw new Error(
      `MAP_EDGE_DISTANCE_INVALID: ${edge.id}`
    );
  }

  return {
    ...edge,
    points:
      edge.points.length >=
      2
        ? edge.points
        : [
            {
              x:
                nodes[
                  edge.fromNodeId
                ].x,
              y:
                nodes[
                  edge.fromNodeId
                ].y,
            },
            {
              x:
                nodes[
                  edge.toNodeId
                ].x,
              y:
                nodes[
                  edge.toNodeId
                ].y,
            },
          ],
  };
}

/**
 * Historical name retained so the registry and old imports do not break.
 *
 * The final campaign map is already authored as a dense strategic graph.
 * This function now only normalizes and validates it. It deliberately does
 * NOT invent extra transit nodes, because tactical positions should be
 * hand-authored and understandable to both humans and LLM players.
 */
export function buildDenseFiveKingdomsMap(
  base: GameMapDefinition
): GameMapDefinition {
  const nodes =
    Object.fromEntries(
      Object.entries(
        base.nodes
      ).map(
        ([
          id,
          node,
        ]) => [
          id,
          normalizeNode(
            node
          ),
        ]
      )
    );

  const edges =
    Object.fromEntries(
      Object.entries(
        base.edges
      ).map(
        ([
          id,
          edge,
        ]) => [
          id,
          validateEdge(
            edge,
            nodes
          ),
        ]
      )
    );

  return {
    ...base,
    nodes,
    edges,
  };
}
