import {
  configureKingdomControllers,
  setDemoConfig,
} from "@/lib/demo/config";

import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

export interface CampaignSelection {
  humanPlayerId: string;
  actorPlayerId: string;
}

export function validateCampaignSelection(
  selection:
    CampaignSelection
): {
  ok: true;
} | {
  ok: false;
  error:
    | "HUMAN_PLAYER_NOT_FOUND"
    | "ACTOR_PLAYER_NOT_FOUND"
    | "SAME_KINGDOM_SELECTED";
} {
  const world =
    getRuntimeWorldState();

  if (
    !world.session.players[
      selection.humanPlayerId
    ]
  ) {
    return {
      ok: false,
      error:
        "HUMAN_PLAYER_NOT_FOUND",
    };
  }

  if (
    !world.session.players[
      selection.actorPlayerId
    ]
  ) {
    return {
      ok: false,
      error:
        "ACTOR_PLAYER_NOT_FOUND",
    };
  }

  if (
    selection.humanPlayerId ===
    selection.actorPlayerId
  ) {
    return {
      ok: false,
      error:
        "SAME_KINGDOM_SELECTED",
    };
  }

  return {
    ok: true,
  };
}

export function beginCampaign(
  selection:
    CampaignSelection
) {
  const validation =
    validateCampaignSelection(
      selection
    );

  if (!validation.ok) {
    return validation;
  }

  const world =
    getRuntimeWorldState();

  const controllers =
    Object.fromEntries(
      Object.values(
        world.session.players
      ).map(
        (player) => [
          player.id,
          player.id ===
          selection.humanPlayerId
            ? "HUMAN"
            : "LLM",
        ]
      )
    ) as Record<
      string,
      "HUMAN" | "LLM"
    >;

  /*
   * The chosen Actor LLM is the realm deliberately surfaced in the main
   * campaign UX. The other three realms remain world-controlled in the
   * presentation layer, but still use the existing canonical LLM controller
   * machinery until a separate GM-realm controller transport is introduced.
   *
   * No gameplay rule changes here.
   */
  configureKingdomControllers(
    controllers
  );

  updateRuntimeWorldState(
    (current) => {
      const humanKingdomId =
        current.session.players[
          selection.humanPlayerId
        ]?.kingdomId;

      const actorKingdomId =
        current.session.players[
          selection.actorPlayerId
        ]?.kingdomId;

      const roleByKingdomId =
        Object.fromEntries(
          Object.values(
            current.session.players
          )
            .filter(
              (player) =>
                player.active
            )
            .map(
              (player) => [
                player.kingdomId,
                player.kingdomId ===
                  humanKingdomId
                  ? "HUMAN"
                  : player.kingdomId ===
                      actorKingdomId
                    ? "ACTOR_LLM"
                    : "GM",
              ])
        ) as Record<
          string,
          "HUMAN" |
          "ACTOR_LLM" |
          "GM"
        >;

      return {
        ...current,
        session: {
          ...current.session,
          campaignControl: {
            humanPlayerId:
              selection.humanPlayerId,
            actorPlayerId:
              selection.actorPlayerId,
            roleByKingdomId,
          },
        },
        simulation: {
          ...current.simulation,
          paused: false,
          pauseReasons: [],
        },
      };
    }
  );

  setDemoConfig({
    mode: "player",
    speed: 1,
    running: true,
    gmEnabled: true,
  });

  return {
    ok: true as const,
    humanPlayerId:
      selection.humanPlayerId,
    actorPlayerId:
      selection.actorPlayerId,
  };
}
