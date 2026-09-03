import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  beginCharacterTravel,
} from "@/lib/world/actions";

import {
  moveArmy,
} from "@/lib/military/army-movement";

import {
  recruitUnits,
} from "@/lib/military/recruitment";

import {
  startSiege,
} from "@/lib/military/siege";

import {
  spawnCourier,
} from "@/lib/world/couriers";

import {
  scheduleInterruptEvent,
} from "@/lib/world/events";

import {
  addPlayerKnowledge,
} from "@/lib/session/knowledge";

import type {
  DirectorProposal,
} from "@/types/director";

export type ApplyDirectorProposalResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      summary: string;
    };

function applyNpcMessage(
  proposal: DirectorProposal
): ApplyDirectorProposalResult {
  if (
    !(
      "senderCharacterId" in
        proposal.payload &&
      "recipientCharacterId" in
        proposal.payload &&
      "content" in
        proposal.payload
    )
  ) {
    return {
      ok: false,
      error: "INVALID_PAYLOAD",
    };
  }

  const senderCharacterId =
    proposal.payload
      .senderCharacterId;

  const recipientCharacterId =
    proposal.payload
      .recipientCharacterId;

  const content =
    proposal.payload.content;

  const world =
    getRuntimeWorldState();

  const senderPosition =
    world.simulation
      .entityPositions[
        senderCharacterId
      ];

  const recipientPosition =
    world.simulation
      .entityPositions[
        recipientCharacterId
      ];

  if (
    !senderPosition ||
    senderPosition.kind !==
      "node"
  ) {
    return {
      ok: false,
      error: "SENDER_NOT_AT_NODE",
    };
  }

  if (
    !recipientPosition ||
    recipientPosition.kind !==
      "node"
  ) {
    return {
      ok: false,
      error: "RECIPIENT_NOT_AT_NODE",
    };
  }

  const result =
    spawnCourier(
      senderCharacterId,
      recipientCharacterId,
      content,
      senderPosition.nodeId,
      recipientPosition.nodeId
    );

  if (
    result.ok ===
    false
  ) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,

    summary:
      `Courier ${result.courier.id} dispatched with message ${result.message.id}.`,
  };
}

export function applyAcceptedDirectorProposal(
  proposal: DirectorProposal
): ApplyDirectorProposalResult {
  switch (
    proposal.type
  ) {
    //
    // =====================================================
    // NPC CHARACTER MOVEMENT
    // =====================================================
    //

    case "npc_character_travel": {
      if (
        !(
          "characterId" in
            proposal.payload &&
          "destinationNodeId" in
            proposal.payload
        )
      ) {
        return {
          ok: false,
          error: "INVALID_PAYLOAD",
        };
      }

      const characterId =
        proposal.payload
          .characterId;

      const destinationNodeId =
        proposal.payload
          .destinationNodeId;

      const result =
        beginCharacterTravel(
          characterId,
          destinationNodeId
        );

      if (
        result.ok ===
        false
      ) {
        return {
          ok: false,
          error: result.error,
        };
      }

      return {
        ok: true,

        summary:
          `${characterId} began physical travel to ${destinationNodeId}.`,
      };
    }

    //
    // =====================================================
    // NPC ARMY MOVEMENT
    // =====================================================
    //

    case "npc_army_move": {
      if (
        !(
          "armyId" in
            proposal.payload &&
          "destinationNodeId" in
            proposal.payload
        )
      ) {
        return {
          ok: false,
          error: "INVALID_PAYLOAD",
        };
      }

      const armyId =
        proposal.payload
          .armyId;

      const destinationNodeId =
        proposal.payload
          .destinationNodeId;

      const result =
        moveArmy(
          armyId,
          destinationNodeId
        );

      if (
        result.ok ===
        false
      ) {
        return {
          ok: false,
          error: result.error,
        };
      }

      return {
        ok: true,

        summary:
          `${armyId} began canonical movement to ${destinationNodeId}.`,
      };
    }

    //
    // =====================================================
    // NPC RECRUITMENT
    // =====================================================
    //

    case "npc_recruit_units": {
      if (
        !(
          "characterId" in
            proposal.payload &&
          "settlementId" in
            proposal.payload &&
          "unitType" in
            proposal.payload &&
          "blocks" in
            proposal.payload
        )
      ) {
        return {
          ok: false,
          error: "INVALID_PAYLOAD",
        };
      }

      const characterId =
        proposal.payload
          .characterId;

      const settlementId =
        proposal.payload
          .settlementId;

      const unitType =
        proposal.payload
          .unitType;

      const blocks =
        proposal.payload.blocks;

      const result =
        recruitUnits({
          settlementId,
          unitType,
          blocks,

          actorId:
            characterId,
        });

      if (
        result.ok ===
        false
      ) {
        return {
          ok: false,
          error: result.error,
        };
      }

      return {
        ok: true,

        summary:
          `Recruitment ${result.order.id} started.`,
      };
    }

    //
    // =====================================================
    // NPC SIEGE
    // =====================================================
    //

    case "npc_start_siege": {
      if (
        !(
          "armyId" in
            proposal.payload &&
          "settlementId" in
            proposal.payload
        )
      ) {
        return {
          ok: false,
          error: "INVALID_PAYLOAD",
        };
      }

      const armyId =
        proposal.payload
          .armyId;

      const settlementId =
        proposal.payload
          .settlementId;

      const result =
        startSiege({
          armyId,
          settlementId,
        });

      if (
        result.ok ===
        false
      ) {
        return {
          ok: false,
          error: result.error,
        };
      }

      return {
        ok: true,

        summary:
          `Siege ${result.siege.id} started.`,
      };
    }

    //
    // =====================================================
    // NPC MESSAGE / COURIER
    // =====================================================
    //

    case "npc_send_message": {
      return applyNpcMessage(
        proposal
      );
    }

    //
    // =====================================================
    // SCHEDULED WORLD EVENT
    // =====================================================
    //

    case "schedule_world_interrupt": {
      if (
        !(
          "executeAt" in
            proposal.payload &&
          "interruptType" in
            proposal.payload &&
          "message" in
            proposal.payload
        )
      ) {
        return {
          ok: false,
          error: "INVALID_PAYLOAD",
        };
      }

      const executeAt =
        proposal.payload
          .executeAt;

      const interruptType =
        proposal.payload
          .interruptType;

      const message =
        proposal.payload.message;

      const event =
        scheduleInterruptEvent(
          executeAt,
          interruptType,
          message
        );

      return {
        ok: true,

        summary:
          `Scheduled world event ${event.id}.`,
      };
    }

    //
    // =====================================================
    // KINGDOM RELATIONS
    // =====================================================
    //

    case "kingdom_relation_delta": {
      if (
        !(
          "kingdomId" in
            proposal.payload &&
          "targetKingdomId" in
            proposal.payload &&
          "delta" in
            proposal.payload
        )
      ) {
        return {
          ok: false,
          error: "INVALID_PAYLOAD",
        };
      }

      /*
       * IMPORTANT:
       *
       * Capture narrowed union values BEFORE
       * entering the runtime updater callback.
       *
       * TypeScript does not preserve property
       * narrowing reliably through closures.
       */
      const kingdomId =
        proposal.payload
          .kingdomId;

      const targetKingdomId =
        proposal.payload
          .targetKingdomId;

      const delta =
        proposal.payload.delta;

      const world =
        getRuntimeWorldState();

      const kingdom =
        world.kingdoms[
          kingdomId
        ];

      if (!kingdom) {
        return {
          ok: false,
          error: "KINGDOM_NOT_FOUND",
        };
      }

      const before =
        kingdom.relations[
          targetKingdomId
        ] ??
        0;

      const after =
        Math.max(
          -100,
          Math.min(
            100,
            before +
              delta
          )
        );

      updateRuntimeWorldState(
        (current) => {
          const currentKingdom =
            current.kingdoms[
              kingdomId
            ];

          if (!currentKingdom) {
            return current;
          }

          return {
            ...current,

            kingdoms: {
              ...current.kingdoms,

              [kingdomId]: {
                ...currentKingdom,

                relations: {
                  ...currentKingdom
                    .relations,

                  [targetKingdomId]:
                    after,
                },
              },
            },
          };
        }
      );

      return {
        ok: true,

        summary:
          `${kingdomId} relation toward ${targetKingdomId} changed ${before} -> ${after}.`,
      };
    }

    //
    // =====================================================
    // PLAYER KNOWLEDGE DELIVERY
    // =====================================================
    //

    case "player_knowledge_report": {
      if (
        !(
          "playerId" in
            proposal.payload &&
          "subjectId" in
            proposal.payload &&
          "kind" in
            proposal.payload &&
          "source" in
            proposal.payload &&
          "confidence" in
            proposal.payload &&
          "summary" in
            proposal.payload
        )
      ) {
        return {
          ok: false,
          error: "INVALID_PAYLOAD",
        };
      }

      /*
       * Capture all values before calling
       * another function so the union stays
       * completely narrowed.
       */
      const playerId =
        proposal.payload
          .playerId;

      const subjectId =
        proposal.payload
          .subjectId;

      const kind =
        proposal.payload.kind;

      const source =
        proposal.payload.source;

      const confidence =
        proposal.payload
          .confidence;

      const summary =
        proposal.payload.summary;

      const observedAt =
        proposal.payload
          .observedAt;

      const deliveredAt =
        proposal.payload
          .deliveredAt;

      const data =
        proposal.payload.data;

      const now =
        getRuntimeWorldState()
          .simulation
          .worldTimeMinutes;

      const fact =
        addPlayerKnowledge({
          playerId,
          subjectId,
          kind,

          observedAt:
            observedAt ??
            now,

          deliveredAt:
            deliveredAt ??
            now,

          source,
          confidence,
          summary,

          data:
            data ??
            {},
        });

      if (!fact) {
        return {
          ok: false,

          error:
            "PLAYER_KNOWLEDGE_NOT_FOUND",
        };
      }

      return {
        ok: true,

        summary:
          `Knowledge fact ${fact.id} added for ${playerId}.`,
      };
    }
  }
}