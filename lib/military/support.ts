import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

export type SupportArmyError =
  | "ARMY_NOT_FOUND"
  | "SAME_ARMY"
  | "NOT_SAME_OWNER"
  | "SUPPORTER_DESTROYED"
  | "TARGET_DESTROYED";

export type SupportArmyResult =
  | {
      ok: false;
      error:
        SupportArmyError;
    }
  | {
      ok: true;
      supporterArmyId:
        string;
      targetArmyId:
        string;
    };

export function supportArmy(
  supporterArmyId:
    string,
  targetArmyId:
    string
): SupportArmyResult {
  if (
    supporterArmyId ===
    targetArmyId
  ) {
    return {
      ok: false,
      error:
        "SAME_ARMY",
    };
  }

  const world =
    getRuntimeWorldState();

  const supporter =
    world.armies[
      supporterArmyId
    ];

  const target =
    world.armies[
      targetArmyId
    ];

  if (
    !supporter ||
    !target
  ) {
    return {
      ok: false,
      error:
        "ARMY_NOT_FOUND",
    };
  }

  if (
    supporter.ownerId !==
    target.ownerId
  ) {
    return {
      ok: false,
      error:
        "NOT_SAME_OWNER",
    };
  }

  if (
    supporter.status ===
    "destroyed"
  ) {
    return {
      ok: false,
      error:
        "SUPPORTER_DESTROYED",
    };
  }

  if (
    target.status ===
    "destroyed"
  ) {
    return {
      ok: false,
      error:
        "TARGET_DESTROYED",
    };
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      armies: {
        ...current.armies,

        [supporterArmyId]: {
          ...current.armies[
            supporterArmyId
          ],

          supportTargetArmyId:
            targetArmyId,
        },
      },
    })
  );

  return {
    ok: true,
    supporterArmyId,
    targetArmyId,
  };
}