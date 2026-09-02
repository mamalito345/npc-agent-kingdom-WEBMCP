import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getMovementEdgeTraversalWindows,
} from "@/lib/world/movement";

import {
  getMapEdge,
} from "@/lib/map/graph";

import {
  hasCanonicalMilitaryAccess,
} from "@/lib/map/border-access";

import {
  getPlayerIdForKingdom,
} from "@/lib/session/players";

import {
  addPlayerKnowledge,
} from "@/lib/session/knowledge";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import type {
  BorderIncident,
} from "@/types/borders";

import type {
  SimulationInterrupt,
  WorldMinute,
} from "@/types/simulation";

const BORDER_RELATION_PENALTY = -12;

function relationKey(
  fromCharacterId: string,
  toCharacterId: string
): string {
  return `${fromCharacterId}->${toCharacterId}`;
}

function applyRulerRelationPenalty(
  fromKingdomId: string,
  toKingdomId: string
): void {
  const world =
    getRuntimeWorldState();

  const fromPlayerId =
    getPlayerIdForKingdom(
      fromKingdomId
    );

  const toPlayerId =
    getPlayerIdForKingdom(
      toKingdomId
    );

  const fromCharacterId =
    fromPlayerId
      ? world.session.players[
          fromPlayerId
        ]?.characterId
      : undefined;

  const toCharacterId =
    toPlayerId
      ? world.session.players[
          toPlayerId
        ]?.characterId
      : undefined;

  if (
    !fromCharacterId ||
    !toCharacterId
  ) {
    return;
  }

  updateRuntimeWorldState(
    (current) => {
      const key =
        relationKey(
          toCharacterId,
          fromCharacterId
        );

      const existing =
        current.session.politics
          .relationships[key];

      const currentValue =
        existing?.value ??
        current.characters[
          toCharacterId
        ]?.relationships[
          fromCharacterId
        ] ??
        0;

      return {
        ...current,
        session: {
          ...current.session,
          politics: {
            ...current.session.politics,
            relationships: {
              ...current.session.politics.relationships,
              [key]: {
                fromCharacterId:
                  toCharacterId,
                toCharacterId:
                  fromCharacterId,
                value:
                  Math.max(
                    -100,
                    Math.min(
                      100,
                      currentValue +
                        BORDER_RELATION_PENALTY
                    )
                  ),
              },
            },
          },
        },
      };
    }
  );
}

function incidentAlreadyRecorded(
  movementId: string,
  edgeId: string
): boolean {
  return Object.values(
    getRuntimeWorldState()
      .session.borders.incidents
  ).some(
    (incident) =>
      incident.movementId === movementId &&
      incident.edgeId === edgeId
  );
}

function orderAllowsViolation(
  movementId: string
): {
  allowed: boolean;
  orderId?: string;
} {
  const order =
    Object.values(
      getRuntimeWorldState()
        .session.orders
    ).find(
      (candidate) =>
        candidate.movementId ===
        movementId
    );

  if (
    !order ||
    order.type !== "move_army" ||
    !(
      "allowBorderViolation"
      in order.payload
    )
  ) {
    return {
      allowed: false,
      orderId:
        order?.id,
    };
  }

  return {
    allowed:
      order.payload
        .allowBorderViolation ===
      true,
    orderId:
      order.id,
  };
}

function createIncident(
  armyId: string,
  movementId: string,
  orderId: string | undefined,
  edgeId: string,
  fromKingdomId: string,
  toKingdomId: string,
  crossingNodeId: string | undefined,
  occurredAt: WorldMinute
): BorderIncident {
  const sequence =
    allocateSimulationSequence();

  const incident:
    BorderIncident = {
    id:
      `border-incident-${sequence
        .toString()
        .padStart(6, "0")}`,
    armyId,
    movementId,
    orderId,
    fromKingdomId,
    toKingdomId,
    edgeId,
    crossingNodeId,
    occurredAt,
    status: "OPEN",
    relationPenalty:
      BORDER_RELATION_PENALTY,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        borders: {
          ...current.session.borders,
          incidents: {
            ...current.session.borders.incidents,
            [incident.id]:
              incident,
          },
        },
      },
    })
  );

  return incident;
}

export function processBorderIncidentsAt(
  worldTime: WorldMinute
): SimulationInterrupt | undefined {
  const world =
    getRuntimeWorldState();

  for (
    const movement
    of Object.values(
      world.simulation.activeMovements
    )
  ) {
    const army =
      getRuntimeWorldState()
        .armies[
          movement.entityId
        ];

    if (!army) {
      continue;
    }

    const windows =
      getMovementEdgeTraversalWindows(
        movement
      );

    for (
      const window
      of windows
    ) {
      if (
        window.startsAt >
          worldTime ||
        window.endsAt <
          worldTime
      ) {
        continue;
      }

      const edge =
        getMapEdge(
          window.edgeId
        );

      if (
        !edge?.borderCrossing ||
        incidentAlreadyRecorded(
          movement.id,
          edge.id
        )
      ) {
        continue;
      }

      const fromKingdomId =
        window.direction ===
        "forward"
          ? edge.borderCrossing
              .fromKingdomId
          : edge.borderCrossing
              .toKingdomId;

      const toKingdomId =
        window.direction ===
        "forward"
          ? edge.borderCrossing
              .toKingdomId
          : edge.borderCrossing
              .fromKingdomId;

      if (
        army.ownerId !==
          fromKingdomId ||
        army.ownerId ===
          toKingdomId
      ) {
        continue;
      }

      if (
        hasCanonicalMilitaryAccess(
          army.ownerId,
          toKingdomId
        )
      ) {
        continue;
      }

      const permission =
        orderAllowsViolation(
          movement.id
        );

      if (!permission.allowed) {
        continue;
      }

      const incident =
        createIncident(
          army.id,
          movement.id,
          permission.orderId,
          edge.id,
          fromKingdomId,
          toKingdomId,
          edge.borderCrossing
            .crossingNodeId,
          worldTime
        );

      applyRulerRelationPenalty(
        fromKingdomId,
        toKingdomId
      );

      const defenderPlayerId =
        getPlayerIdForKingdom(
          toKingdomId
        );

      if (defenderPlayerId) {
        addPlayerKnowledge({
          playerId:
            defenderPlayerId,
          subjectId:
            incident.id,
          kind: "event",
          observedAt:
            worldTime,
          deliveredAt:
            worldTime,
          source:
            "system",
          confidence:
            "confirmed",
          summary:
            `${fromKingdomId} army ${army.id} crossed the ${toKingdomId} border without military access.`,
          data: {
            borderIncidentId:
              incident.id,
            armyId:
              army.id,
            fromKingdomId,
            toKingdomId,
            edgeId:
              edge.id,
          },
        });

        openCommandInterrupt({
          type:
            "IMPORTANT_MESSAGE",
          affectedPlayerIds: [
            defenderPlayerId,
          ],
          message:
            `${fromKingdomId} forces violated the ${toKingdomId} border.`,
        });
      }

      return {
        eventId:
          incident.id,
        type:
          "BORDER_VIOLATION",
        message:
          `${fromKingdomId} forces crossed into ${toKingdomId} without military access.`,
        affectedPlayerIds:
          defenderPlayerId
            ? [defenderPlayerId]
            : [],
      };
    }
  }

  return undefined;
}
