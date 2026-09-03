import type {
  JsonSchemaForInference,
} from "@mcp-b/webmcp-types";

import {
  getIdentityBoundWebMcpModelContext,
} from "@/lib/webmcp/identity-guard";

import {
  isWebMCPAvailable,
} from "@/lib/webmcp/support";

import {
  validatePlayerAccess,
} from "@/lib/session/access";

import {
  getActiveGameMap,
} from "@/lib/map/map-registry";

import {
  findRoute,
} from "@/lib/map/paths";

import {
  getConnectedEdges,
  getMapEdge,
  getMapNode,
  getOtherNodeId,
} from "@/lib/map/graph";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

const identityProperties = {
  session_id: {
    type:
      "string",
  },

  player_id: {
    type:
      "string",
  },
} as const;

const strategicMapSchema = {
  type:
    "object",

  properties: {
    ...identityProperties,

    focus_node_id: {
      type:
        "string",
    },

    hops: {
      type:
        "number",
    },
  },

  required: [
    "session_id",
    "player_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

const routeSchema = {
  type:
    "object",

  properties: {
    ...identityProperties,

    from_node_id: {
      type:
        "string",
    },

    to_node_id: {
      type:
        "string",
    },
  },

  required: [
    "session_id",
    "player_id",
    "from_node_id",
    "to_node_id",
  ],

  additionalProperties:
    false,
} as const satisfies JsonSchemaForInference;

function publicNode(
  nodeId:
    string
) {
  const node =
    getMapNode(
      nodeId
    );

  if (!node) {
    return undefined;
  }

  const world =
    getRuntimeWorldState();

  return {
    id:
      node.id,
    name:
      node.displayName ??
      (
        node.locationId
          ? world
              .locations[
                node.locationId
              ]?.name
          : undefined
      ) ??
      node.id,
    kind:
      node.kind,
    transitType:
      node.transitType,
    territoryKingdomId:
      node
        .territoryKingdomId,
    terrain:
      node.terrain,
    features:
      node.features,
    importance:
      node.importance ??
      "regional",
    strategicRole:
      node.strategicRole ??
      null,
  };
}

function focusedArea(
  focusNodeId:
    string,
  hops:
    number
) {
  if (
    !getMapNode(
      focusNodeId
    )
  ) {
    return {
      ok:
        false as const,
      error:
        "MAP_NODE_NOT_FOUND" as const,
    };
  }

  const maxHops =
    Math.max(
      1,
      Math.min(
        3,
        Math.floor(
          hops
        )
      )
    );

  const visited =
    new Set<
      string
    >([
      focusNodeId,
    ]);

  let frontier =
    new Set<
      string
    >([
      focusNodeId,
    ]);

  for (
    let depth =
      0;
    depth <
    maxHops;
    depth +=
      1
  ) {
    const next =
      new Set<
        string
      >();

    for (
      const nodeId
      of frontier
    ) {
      for (
        const edge
        of getConnectedEdges(
          nodeId
        )
      ) {
        const other =
          getOtherNodeId(
            edge,
            nodeId
          );

        if (
          other &&
          !visited.has(
            other
          )
        ) {
          visited.add(
            other
          );
          next.add(
            other
          );
        }
      }
    }

    frontier =
      next;
  }

  const nodes =
    [
      ...visited,
    ]
      .map(
        publicNode
      )
      .filter(
        Boolean
      );

  const edges =
    [
      ...new Map(
        [
          ...visited,
        ]
          .flatMap(
            (
              nodeId
            ) =>
              getConnectedEdges(
                nodeId
              )
          )
          .filter(
            (
              edge
            ) =>
              visited.has(
                edge.fromNodeId
              ) &&
              visited.has(
                edge.toNodeId
              )
          )
          .map(
            (
              edge
            ) => [
              edge.id,
              edge,
            ]
          )
      ).values(),
    ].map(
      (
        edge
      ) => ({
        id:
          edge.id,
        fromNodeId:
          edge.fromNodeId,
        toNodeId:
          edge.toNodeId,
        distanceKm:
          edge.distanceKm,
        travelModifier:
          edge.travelModifier,
        terrain:
          edge.terrain,
        roadClass:
          edge.roadClass ??
          null,
        borderCrossing:
          edge.borderCrossing ??
          null,
      })
    );

  return {
    ok:
      true as const,
    focusNodeId,
    hops:
      maxHops,
    nodes,
    edges,
  };
}

let registrationController:
  AbortController |
  null =
  null;

export async function registerMapWebMCPTools():
  Promise<boolean> {
  if (
    !isWebMCPAvailable()
  ) {
    return false;
  }

  const modelContext =
    getIdentityBoundWebMcpModelContext();

  if (!modelContext) {
    return false;
  }

  if (
    registrationController
  ) {
    return true;
  }

  const controller =
    new AbortController();

  registrationController =
    controller;

  try {
    await modelContext.registerTool(
      {
        name:
          "inspect_strategic_map",

        description:
          "Inspect public campaign geography: settlements, roads, passes, hills, bridges, junctions and terrain. With focus_node_id, returns a local multi-hop area. This reveals map geography only, never hidden enemy state.",

        inputSchema:
          strategicMapSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
            focus_node_id,
            hops,
          }) => {
            const access =
              validatePlayerAccess(
                session_id,
                player_id
              );

            if (
              access.ok ===
              false
            ) {
              return access;
            }

            if (
              typeof focus_node_id ===
              "string"
            ) {
              return focusedArea(
                focus_node_id,
                typeof hops ===
                  "number"
                  ? hops
                  : 2
              );
            }

            const map =
              getActiveGameMap();

            const nodes =
              Object.values(
                map.nodes
              )
                .filter(
                  (
                    node
                  ) =>
                    node.kind ===
                      "settlement" ||
                    node.importance ===
                      "critical" ||
                    node.importance ===
                      "major"
                )
                .map(
                  (
                    node
                  ) =>
                    publicNode(
                      node.id
                    )
                )
                .filter(
                  Boolean
                );

            return {
              ok:
                true as const,
              map: {
                id:
                  map.id,
                name:
                  map.name,
                width:
                  map.image
                    .width,
                height:
                  map.image
                    .height,
                nodeCount:
                  Object.keys(
                    map.nodes
                  ).length,
                edgeCount:
                  Object.keys(
                    map.edges
                  ).length,
              },
              nodes,
              note:
                "Use focus_node_id with hops 1-3 to inspect the road web around a position before issuing movement orders.",
            };
          },
      },
      {
        signal:
          controller.signal,
      }
    );

    await modelContext.registerTool(
      {
        name:
          "inspect_route",

        description:
          "Inspect the canonical shortest physical route between two public map nodes, including terrain, road class, distance and border crossings. This does not reveal enemy positions.",

        inputSchema:
          routeSchema,

        annotations: {
          readOnlyHint:
            true,
        },

        execute:
          async ({
            session_id,
            player_id,
            from_node_id,
            to_node_id,
          }) => {
            const access =
              validatePlayerAccess(
                session_id,
                player_id
              );

            if (
              access.ok ===
              false
            ) {
              return access;
            }

            const route =
              findRoute(
                from_node_id,
                to_node_id
              );

            if (!route) {
              return {
                ok:
                  false as const,
                error:
                  "ROUTE_NOT_FOUND" as const,
              };
            }

            return {
              ok:
                true as const,
              route: {
                ...route,
                nodes:
                  route.nodeIds
                    .map(
                      publicNode
                    )
                    .filter(
                      Boolean
                    ),
                edges:
                  route.edgeIds
                    .map(
                      (
                        edgeId
                      ) =>
                        getMapEdge(
                          edgeId
                        )
                    )
                    .filter(
                      (
                        edge
                      ): edge is
                        NonNullable<
                          ReturnType<
                            typeof getMapEdge
                          >
                        > =>
                          Boolean(
                            edge
                          )
                    )
                    .map(
                      (
                        edge
                      ) => ({
                        id:
                          edge.id,
                        fromNodeId:
                          edge.fromNodeId,
                        toNodeId:
                          edge.toNodeId,
                        distanceKm:
                          edge.distanceKm,
                        travelModifier:
                          edge.travelModifier,
                        terrain:
                          edge.terrain,
                        roadClass:
                          edge.roadClass ??
                          null,
                        borderCrossing:
                          edge.borderCrossing ??
                          null,
                      })
                    ),
              },
            };
          },
      },
      {
        signal:
          controller.signal,
      }
    );

    return true;
  } catch (
    error
  ) {
    registrationController =
      null;

    console.error(
      "[WebMCP] strategic map tool registration failed:",
      error
    );

    return false;
  }
}
