import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  RealmControlRole,
} from "@/types/session";

export function getRealmControlRole(
  kingdomId: string
): RealmControlRole {
  return (
    getRuntimeWorldState()
      .session
      .campaignControl
      .roleByKingdomId[
        kingdomId
      ] ??
    "GM"
  );
}

export function getPlayerControlRole(
  playerId: string
): RealmControlRole {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[
      playerId
    ];

  if (!player) {
    return "GM";
  }

  return getRealmControlRole(
    player.kingdomId
  );
}

export function getRealmControlLabel(
  kingdomId: string
): string {
  const role =
    getRealmControlRole(
      kingdomId
    );

  switch (role) {
    case "HUMAN":
      return "HUMAN PLAYER";
    case "ACTOR_LLM":
      return "ACTOR LLM";
    case "GM":
      return "GM CONTROLLED";
  }
}
