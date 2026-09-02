import {
  getMapEdge,
} from "@/lib/map/graph";

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  RoadSecurityResult,
  RoadSecurityState,
} from "@/types/economy";

function getNodeSettlementController(
  nodeId: string
): string | undefined {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      nodeId
    ];

  if (!settlement) {
    return undefined;
  }

  return (
    settlement.controllerKingdomId ??
    settlement.kingdomId
  );
}

function getActiveArmyIdsAtNode(
  nodeId: string
): string[] {
  const world =
    getRuntimeWorldState();

  return Object.keys(
    world.armies
  )
    .filter(
      (armyId) => {
        const army =
          world.armies[
            armyId
          ];

        const position =
          world.simulation
            .entityPositions[
              armyId
            ];

        return (
          army !== undefined &&
          army.status !==
            "destroyed" &&
          position?.kind ===
            "node" &&
          position.nodeId ===
            nodeId
        );
      }
    )
    .sort();
}

function nodeHasActiveBattle(
  nodeId: string
): boolean {
  return Object.values(
    getRuntimeWorldState()
      .battles
  ).some(
    (battle) =>
      battle.status ===
        "active" &&
      battle.nodeId ===
        nodeId
  );
}

function nodeHasActiveSiege(
  nodeId: string
): boolean {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.sieges
  ).some(
    (siege) => {
      if (
        siege.status !==
        "active"
      ) {
        return false;
      }

      const settlement =
        world.settlements[
          siege.settlementId
        ];

      return (
        settlement?.locationId ===
        nodeId
      );
    }
  );
}

function nodeHasActiveRaid(
  nodeId: string
): boolean {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.settlementOperations
  ).some(
    (operation) => {
      if (
        operation.status !==
          "active" ||
        operation.type !==
          "raid"
      ) {
        return false;
      }

      const settlement =
        world.settlements[
          operation.settlementId
        ];

      return (
        settlement?.locationId ===
        nodeId
      );
    }
  );
}

function nodeIsOccupied(
  nodeId: string
): boolean {
  const settlement =
    getRuntimeWorldState()
      .settlements[
        nodeId
      ];

  if (!settlement) {
    return false;
  }

  const controller =
    settlement.controllerKingdomId ??
    settlement.kingdomId;

  return (
    controller !==
    settlement.kingdomId
  );
}

function nodeHasForeignArmy(
  nodeId: string
): boolean {
  const world =
    getRuntimeWorldState();

  const controller =
    getNodeSettlementController(
      nodeId
    );

  if (!controller) {
    return false;
  }

  return getActiveArmyIdsAtNode(
    nodeId
  ).some(
    (armyId) =>
      world.armies[
        armyId
      ].ownerId !==
      controller
  );
}

function getSecurityPriority(
  state:
    RoadSecurityState
): number {
  switch (state) {
    case "safe":
      return 0;

    case "threatened":
      return 1;

    case "raided":
      return 2;

    case "blocked":
      return 3;
  }
}

function getSecurityMultiplier(
  state:
    RoadSecurityState
): number {
  switch (state) {
    case "safe":
      return 1;

    case "threatened":
      return 0.75;

    case "raided":
      return 0.4;

    case "blocked":
      return 0;
  }
}

function evaluateNodeSecurity(
  nodeId: string
): {
  state:
    RoadSecurityState;

  reasons:
    string[];
} {
  const reasons:
    string[] = [];

  let state:
    RoadSecurityState =
      "safe";

  const promote = (
    candidate:
      RoadSecurityState,
    reason: string
  ) => {
    reasons.push(
      reason
    );

    if (
      getSecurityPriority(
        candidate
      ) >
      getSecurityPriority(
        state
      )
    ) {
      state =
        candidate;
    }
  };

  if (
    nodeHasActiveBattle(
      nodeId
    )
  ) {
    promote(
      "blocked",
      `active battle at ${nodeId}`
    );
  }

  if (
    nodeHasActiveSiege(
      nodeId
    )
  ) {
    promote(
      "blocked",
      `active siege at ${nodeId}`
    );
  }

  if (
    nodeHasActiveRaid(
      nodeId
    )
  ) {
    promote(
      "raided",
      `active raid at ${nodeId}`
    );
  }

  if (
    nodeIsOccupied(
      nodeId
    )
  ) {
    promote(
      "threatened",
      `foreign occupation at ${nodeId}`
    );
  }

  if (
    nodeHasForeignArmy(
      nodeId
    )
  ) {
    promote(
      "threatened",
      `foreign army presence at ${nodeId}`
    );
  }

  return {
    state,
    reasons,
  };
}

export function getRoadSecurity(
  edgeId: string
): RoadSecurityResult {
  const edge =
    getMapEdge(
      edgeId
    );

  if (!edge) {
    throw new Error(
      `Unknown road edge: ${edgeId}`
    );
  }

  const from =
    evaluateNodeSecurity(
      edge.fromNodeId
    );

  const to =
    evaluateNodeSecurity(
      edge.toNodeId
    );

  const state =
    getSecurityPriority(
      from.state
    ) >=
    getSecurityPriority(
      to.state
    )
      ? from.state
      : to.state;

  return {
    edgeId,

    state,

    multiplier:
      getSecurityMultiplier(
        state
      ),

    reasons: [
      ...from.reasons,
      ...to.reasons,
    ],
  };
}