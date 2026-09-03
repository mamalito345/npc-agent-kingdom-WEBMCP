import type {
  BattlePhase,
} from "@/types/military";

export const BATTLE_PHASE_DURATION_MINUTES:
  Record<
    Exclude<
      BattlePhase,
      "ended"
    >,
    number
  > = {
  contact: 45,

  deployment: 75,

  engagement: 180,

  crisis: 150,

  resolution: 90,

  retreat: 60,
};

export function getNextBattlePhase(
  phase:
    BattlePhase
): BattlePhase {
  switch (phase) {
    case "contact":
      return "deployment";

    case "deployment":
      return "engagement";

    case "engagement":
      return "crisis";

    case "crisis":
      return "resolution";

    case "resolution":
      return "retreat";

    case "retreat":
      return "ended";

    case "ended":
      return "ended";
  }
}

export function getBattlePhaseDuration(
  phase:
    BattlePhase
): number {
  if (
    phase ===
    "ended"
  ) {
    return 0;
  }

  return (
    BATTLE_PHASE_DURATION_MINUTES[
      phase
    ]
  );
}