/*
 * Turns an army's assigned commander (a lord, via Army.commanderId) into
 * a CommanderRating that actually feeds live battle power, instead of
 * assigning a commander being purely cosmetic. There is no dedicated
 * "martial skill" stat on a lord (LordTraits only has ambition, honor,
 * aggression, caution, diplomacy, intrigue), so competence is derived
 * from a blend of political standing and martial disposition: ambition
 * and aggression carry a leader's drive to press an advantage, honor and
 * diplomacy reflect how well they hold an army together, and political
 * power reflects real standing and experience. An unassigned army (no
 * commanderId, or a commanderId with no lord profile -- e.g. the ruler
 * personally leads it) rates as "average": present, but no better or
 * worse than a competent professional officer corps.
 */

import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  CommanderRating,
} from "@/types/military";

function competenceToRating(
  score: number
): CommanderRating {
  if (score >= 78) {
    return "excellent";
  }

  if (score >= 60) {
    return "good";
  }

  if (score >= 40) {
    return "average";
  }

  return "poor";
}

export function getArmyCommanderRating(
  armyId: string
): CommanderRating {
  const world =
    getRuntimeWorldState();

  const army =
    world.armies[
      armyId
    ];

  const commanderId =
    army?.commanderId;

  if (!commanderId) {
    return "average";
  }

  const lord =
    world.session.lords
      .profiles[
      commanderId
    ];

  if (!lord) {
    return "average";
  }

  const traits =
    lord.basicTraits;

  const score =
    traits.ambition *
      0.28 +
    traits.aggression *
      0.24 +
    traits.honor *
      0.16 +
    traits.diplomacy *
      0.12 +
    lord.politicalPower *
      0.2;

  return competenceToRating(
    score
  );
}
