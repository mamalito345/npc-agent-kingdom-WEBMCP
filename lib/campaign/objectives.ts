import {
  addWorldPauseReason,
  getRuntimeWorldState,
  hasWorldPauseReason,
} from "@/lib/world/runtime";

import {
  validatePlayerAccess,
} from "@/lib/session/access";

export const CAMPAIGN_ENDED_PAUSE_REASON = "campaign-ended";

export type CampaignOutcome =
  | "ONGOING"
  | "VICTORY"
  | "DEFEAT";

export type ObjectiveStatus =
  | "ACTIVE"
  | "COMPLETE"
  | "FAILED";

export interface CampaignObjective {
  id:
    string;

  title:
    string;

  description:
    string;

  status:
    ObjectiveStatus;

  current:
    number;

  target:
    number;

  summary:
    string;
}

export interface CampaignStatus {
  outcome:
    CampaignOutcome;

  playerId:
    string;

  kingdomId:
    string;

  ownCapitalId?:
    string;

  ownCapitalHeld:
    boolean;

  capitalsControlled:
    number;

  totalCapitals:
    number;

  activeOwnArmies:
    number;

  treasury:
    number;

  stability:
    number;

  objectives:
    CampaignObjective[];

  summary:
    string;
}

export function getCampaignStatus(
  sessionId:
    string,
  playerId:
    string
):
  | {
      ok:
        false;

      error:
        string;
    }
  | {
      ok:
        true;

      status:
        CampaignStatus;
    } {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (
    access.ok ===
    false
  ) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const kingdomId =
    access.player
      .kingdomId;

  const kingdom =
    world.kingdoms[
      kingdomId
    ];

  if (!kingdom) {
    return {
      ok:
        false,

      error:
        "KINGDOM_NOT_FOUND",
    };
  }

  const capitals =
    Object.values(
      world.settlements
    )
      .filter(
        (settlement) =>
          settlement.type ===
          "capital"
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id
          )
      );

  const ownCapital =
    capitals.find(
      (settlement) =>
        settlement
          .kingdomId ===
        kingdomId
    );

  const controllerOf = (
    settlement:
      (typeof capitals)[number]
  ) =>
    settlement
      .controllerKingdomId ??
    settlement.kingdomId;

  const capitalsControlled =
    capitals.filter(
      (settlement) =>
        controllerOf(
          settlement
        ) ===
        kingdomId
    ).length;

  const ownCapitalHeld =
    ownCapital
      ? controllerOf(
          ownCapital
        ) ===
        kingdomId
      : true;

  const activeOwnArmies =
    Object.values(
      world.armies
    ).filter(
      (army) =>
        army.ownerId ===
          kingdomId &&
        army.status !==
          "destroyed"
    ).length;

  /*
   * Demo campaign law:
   *
   * VICTORY:
   *   Hold your own capital and militarily control at least 3 realm capitals.
   *
   * DEFEAT:
   *   Lose your own capital and have no surviving realm army.
   *
   * This is derived from canonical world state; there is no separate hidden
   * "winner flag" that can drift out of sync with the simulation.
   */
  const victory =
    ownCapitalHeld &&
    capitalsControlled >=
      Math.min(
        3,
        capitals.length
      );

  const defeat =
    !ownCapitalHeld &&
    activeOwnArmies ===
      0;

  const outcome:
    CampaignOutcome =
    victory
      ? "VICTORY"
      : defeat
        ? "DEFEAT"
        : "ONGOING";

  const objectives:
    CampaignObjective[] = [
      {
        id:
          "hold-crown",

        title:
          "Hold the Crown",

        description:
          "Keep your realm capital under your military control.",

        status:
          ownCapitalHeld
            ? "COMPLETE"
            : "FAILED",

        current:
          ownCapitalHeld
            ? 1
            : 0,

        target:
          1,

        summary:
          ownCapitalHeld
            ? "Capital secure."
            : "Capital lost.",
      },

      {
        id:
          "regional-power",

        title:
          "Become a Regional Power",

        description:
          "Control at least two realm capitals.",

        status:
          capitalsControlled >=
            2
            ? "COMPLETE"
            : "ACTIVE",

        current:
          capitalsControlled,

        target:
          Math.min(
            2,
            capitals.length
          ),

        summary:
          `${capitalsControlled}/${Math.min(
            2,
            capitals.length
          )} capitals controlled.`,
      },

      {
        id:
          "hegemony",

        title:
          "Claim Hegemony",

        description:
          "Control three realm capitals while retaining your own.",

        status:
          victory
            ? "COMPLETE"
            : ownCapitalHeld
              ? "ACTIVE"
              : "FAILED",

        current:
          capitalsControlled,

        target:
          Math.min(
            3,
            capitals.length
          ),

        summary:
          `${capitalsControlled}/${Math.min(
            3,
            capitals.length
          )} capitals controlled.`,
      },

      {
        id:
          "realm-cohesion",

        title:
          "Preserve Realm Cohesion",

        description:
          "Keep stability at or above 40 while maintaining a non-negative treasury.",

        status:
          kingdom.stability >=
              40 &&
            kingdom.treasury >=
              0
            ? "COMPLETE"
            : "ACTIVE",

        current:
          Math.max(
            0,
            Math.min(
              100,
              kingdom.stability
            )
          ),

        target:
          40,

        summary:
          `Stability ${kingdom.stability} · Treasury ${kingdom.treasury}.`,
      },
    ];

  return {
    ok:
      true,

    status: {
      outcome,

      playerId,

      kingdomId,

      ownCapitalId:
        ownCapital?.id,

      ownCapitalHeld,

      capitalsControlled,

      totalCapitals:
        capitals.length,

      activeOwnArmies,

      treasury:
        kingdom.treasury,

      stability:
        kingdom.stability,

      objectives,

      summary:
        outcome ===
          "VICTORY"
          ? "Your realm has achieved regional hegemony."
          : outcome ===
              "DEFEAT"
            ? "The crown has fallen and no field army remains."
            : `${capitalsControlled}/${capitals.length} capitals under control.`,
    },
  };
}


/*
 * Victory/defeat used to be purely informational: getCampaignStatus()
 * computed an outcome that the UI/audio could read, but nothing ever
 * acted on it, so the simulation kept advancing turns and time forever
 * after the campaign was effectively over. This checks the local human
 * player's outcome and, once it resolves to VICTORY or DEFEAT, pauses
 * the world clock so the campaign actually ends instead of continuing
 * to run in the background. Idempotent: once the pause reason is set it
 * is never re-applied, and it is never auto-removed here (a human can
 * still resume manually, e.g. to keep playing past a "soft" ending).
 */
export function checkAndApplyCampaignEnd(): void {
  if (
    hasWorldPauseReason(
      CAMPAIGN_ENDED_PAUSE_REASON
    )
  ) {
    return;
  }

  const world =
    getRuntimeWorldState();

  const localPlayerId =
    world.session
      .localPlayerId;

  if (!localPlayerId) {
    return;
  }

  const result =
    getCampaignStatus(
      world.session.id,
      localPlayerId
    );

  if (!result.ok) {
    return;
  }

  if (
    result.status
      .outcome !==
    "ONGOING"
  ) {
    addWorldPauseReason(
      CAMPAIGN_ENDED_PAUSE_REASON
    );
  }
}
