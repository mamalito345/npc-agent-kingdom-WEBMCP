import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  DirectorProposalDraft,
} from "@/types/director";

export type DirectorValidationResult =
  | {
      ok:
        true;
    }
  | {
      ok:
        false;

      error:
        string;
    };

function activePlayerControlsCharacter(
  characterId:
    string
): boolean {
  return Object.values(
    getRuntimeWorldState()
      .session
      .players
  ).some(
    (player) =>
      player.active &&
      player.characterId ===
        characterId
  );
}

function activePlayerControlsKingdom(
  kingdomId:
    string
): boolean {
  return Object.values(
    getRuntimeWorldState()
      .session
      .players
  ).some(
    (player) =>
      player.active &&
      player.kingdomId ===
        kingdomId
  );
}

function activePlayerControlsArmy(
  armyId:
    string
): boolean {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  if (!army) {
    return false;
  }

  if (
    activePlayerControlsKingdom(
      army.ownerId
    )
  ) {
    return true;
  }

  return (
    army.commanderId !==
      undefined &&
    activePlayerControlsCharacter(
      army.commanderId
    )
  );
}

export function validateDirectorProposal(
  draft:
    DirectorProposalDraft
): DirectorValidationResult {
  const world =
    getRuntimeWorldState();

  if (
    !draft.reason ||
    draft.reason.trim()
      .length <
      3
  ) {
    return {
      ok:
        false,

      error:
        "DIRECTOR_REASON_REQUIRED",
    };
  }

  switch (
    draft.type
  ) {
    case "npc_character_travel": {
      if (
        !(
          "characterId" in
            draft.payload &&
          "destinationNodeId" in
            draft.payload
        )
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_PAYLOAD",
        };
      }

      const character =
        world.characters[
          draft.payload
            .characterId
        ];

      if (!character) {
        return {
          ok:
            false,

          error:
            "CHARACTER_NOT_FOUND",
        };
      }

      if (
        activePlayerControlsCharacter(
          character.id
        )
      ) {
        return {
          ok:
            false,

          error:
            "DIRECTOR_CANNOT_CONTROL_PLAYER_CHARACTER",
        };
      }

      if (
        !world.locations[
          draft.payload
            .destinationNodeId
        ]
      ) {
        return {
          ok:
            false,

          error:
            "DESTINATION_NOT_FOUND",
        };
      }

      return {
        ok:
          true,
      };
    }

    case "npc_army_move": {
      if (
        !(
          "armyId" in
            draft.payload &&
          "destinationNodeId" in
            draft.payload
        )
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_PAYLOAD",
        };
      }

      const army =
        world.armies[
          draft.payload
            .armyId
        ];

      if (!army) {
        return {
          ok:
            false,

          error:
            "ARMY_NOT_FOUND",
        };
      }

      if (
        activePlayerControlsArmy(
          army.id
        )
      ) {
        return {
          ok:
            false,

          error:
            "DIRECTOR_CANNOT_CONTROL_PLAYER_ARMY",
        };
      }

      if (
        !world.locations[
          draft.payload
            .destinationNodeId
        ]
      ) {
        return {
          ok:
            false,

          error:
            "DESTINATION_NOT_FOUND",
        };
      }

      return {
        ok:
          true,
      };
    }

    case "npc_recruit_units": {
      if (
        !(
          "characterId" in
            draft.payload &&
          "settlementId" in
            draft.payload &&
          "unitType" in
            draft.payload &&
          "blocks" in
            draft.payload
        )
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_PAYLOAD",
        };
      }

      if (
        activePlayerControlsCharacter(
          draft.payload
            .characterId
        )
      ) {
        return {
          ok:
            false,

          error:
            "DIRECTOR_CANNOT_CONTROL_PLAYER_CHARACTER",
        };
      }

      if (
        !world.characters[
          draft.payload
            .characterId
        ]
      ) {
        return {
          ok:
            false,

          error:
            "CHARACTER_NOT_FOUND",
        };
      }

      if (
        !world.settlements[
          draft.payload
            .settlementId
        ]
      ) {
        return {
          ok:
            false,

          error:
            "SETTLEMENT_NOT_FOUND",
        };
      }

      if (
        !Number.isInteger(
          draft.payload
            .blocks
        ) ||
        draft.payload
          .blocks <=
          0
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_BLOCK_COUNT",
        };
      }

      return {
        ok:
          true,
      };
    }

    case "npc_start_siege": {
      if (
        !(
          "armyId" in
            draft.payload &&
          "settlementId" in
            draft.payload
        )
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_PAYLOAD",
        };
      }

      if (
        activePlayerControlsArmy(
          draft.payload
            .armyId
        )
      ) {
        return {
          ok:
            false,

          error:
            "DIRECTOR_CANNOT_CONTROL_PLAYER_ARMY",
        };
      }

      return {
        ok:
          true,
      };
    }

    case "npc_send_message": {
      if (
        !(
          "senderCharacterId" in
            draft.payload &&
          "recipientCharacterId" in
            draft.payload &&
          "content" in
            draft.payload
        )
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_PAYLOAD",
        };
      }

      if (
        activePlayerControlsCharacter(
          draft.payload
            .senderCharacterId
        )
      ) {
        return {
          ok:
            false,

          error:
            "DIRECTOR_CANNOT_SPEAK_AS_PLAYER_CHARACTER",
        };
      }

      if (
        !world.characters[
          draft.payload
            .senderCharacterId
        ] ||
        !world.characters[
          draft.payload
            .recipientCharacterId
        ]
      ) {
        return {
          ok:
            false,

          error:
            "CHARACTER_NOT_FOUND",
        };
      }

      if (
        draft.payload
          .content
          .trim()
          .length ===
        0
      ) {
        return {
          ok:
            false,

          error:
            "EMPTY_MESSAGE",
        };
      }

      return {
        ok:
          true,
      };
    }

    case "schedule_world_interrupt": {
      if (
        !(
          "executeAt" in
            draft.payload &&
          "interruptType" in
            draft.payload &&
          "message" in
            draft.payload
        )
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_PAYLOAD",
        };
      }

      if (
        draft.payload
          .executeAt <
        world.simulation
          .worldTimeMinutes
      ) {
        return {
          ok:
            false,

          error:
            "EVENT_CANNOT_BE_SCHEDULED_IN_PAST",
        };
      }

      return {
        ok:
          true,
      };
    }

    case "kingdom_relation_delta": {
      if (
        !(
          "kingdomId" in
            draft.payload &&
          "targetKingdomId" in
            draft.payload &&
          "delta" in
            draft.payload
        )
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_PAYLOAD",
        };
      }

      if (
        activePlayerControlsKingdom(
          draft.payload
            .kingdomId
        )
      ) {
        return {
          ok:
            false,

          error:
            "DIRECTOR_CANNOT_SET_PLAYER_KINGDOM_POLICY",
        };
      }

      if (
        !world.kingdoms[
          draft.payload
            .kingdomId
        ] ||
        !world.kingdoms[
          draft.payload
            .targetKingdomId
        ]
      ) {
        return {
          ok:
            false,

          error:
            "KINGDOM_NOT_FOUND",
        };
      }

      if (
        !Number.isFinite(
          draft.payload
            .delta
        ) ||
        Math.abs(
          draft.payload
            .delta
        ) >
          30
      ) {
        return {
          ok:
            false,

          error:
            "RELATION_DELTA_OUT_OF_RANGE",
        };
      }

      return {
        ok:
          true,
      };
    }

    case "player_knowledge_report": {
      if (
        !(
          "playerId" in
            draft.payload &&
          "subjectId" in
            draft.payload &&
          "kind" in
            draft.payload &&
          "source" in
            draft.payload &&
          "confidence" in
            draft.payload &&
          "summary" in
            draft.payload
        )
      ) {
        return {
          ok:
            false,

          error:
            "INVALID_PAYLOAD",
        };
      }

      if (
        !world.session
          .players[
            draft.payload
              .playerId
          ]
      ) {
        return {
          ok:
            false,

          error:
            "PLAYER_NOT_FOUND",
        };
      }

      return {
        ok:
          true,
      };
    }
  }
}