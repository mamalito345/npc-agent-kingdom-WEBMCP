import {
  getConnectedEdges,
  getOtherNodeId,
} from "@/lib/map/graph";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

export function findDeterministicRetreatNode(
  armyId: string
): string | undefined {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  const position =
    world.simulation
      .entityPositions[
        armyId
      ];

  if (
    !army ||
    !position ||
    position.kind !==
      "node"
  ) {
    return undefined;
  }

  const candidates =
    getConnectedEdges(
      position.nodeId
    )
      .map(
        (edge) =>
          getOtherNodeId(
            edge,
            position.nodeId
          )
      )
      .filter(
        (
          nodeId
        ): nodeId is string =>
          Boolean(
            nodeId
          )
      )
      .filter(
        (nodeId) => {
          const settlement =
            world.settlements[
              nodeId
            ];

          return (
            !settlement ||
            settlement.kingdomId ===
              army.ownerId
          );
        }
      )
      .sort();

  return candidates[
    0
  ];
}

export function retreatArmyImmediately(
  armyId: string
):
  | {
      ok: true;
      nodeId: string;
    }
  | {
      ok: false;
      error:
        "NO_RETREAT_ROUTE" |
        "ARMY_NOT_FOUND";
    } {
  const world =
    getRuntimeWorldState();

  if (
    !world.armies[
      armyId
    ]
  ) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  const nodeId =
    findDeterministicRetreatNode(
      armyId
    );

  if (!nodeId) {
    return {
      ok: false,
      error:
        "NO_RETREAT_ROUTE",
    };
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      armies: {
        ...current.armies,

        [armyId]: {
          ...current.armies[
            armyId
          ],

          status:
            "retreating",
        },
      },

      simulation: {
        ...current.simulation,

        entityPositions: {
          ...current
            .simulation
            .entityPositions,

          [armyId]: {
            kind:
              "node",

            nodeId,
          },
        },
      },
    })
  );

  return {
    ok: true,
    nodeId,
  };
}