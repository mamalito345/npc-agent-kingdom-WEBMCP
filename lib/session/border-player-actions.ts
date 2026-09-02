import {
  validatePlayerCommandAccess,
} from "@/lib/session/access";

import {
  issueStrategicOrder,
} from "@/lib/session/orders";

export function forcePlayerArmyBorderMove(
  sessionId: string,
  playerId: string,
  armyId: string,
  destinationNodeId: string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  return issueStrategicOrder({
    playerId,
    type: "move_army",
    payload: {
      armyId,
      destinationNodeId,
      allowBorderViolation: true,
    },
  });
}
