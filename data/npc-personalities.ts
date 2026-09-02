import type { NpcPersonalityProfile } from "@/types/conversation";

const DEFAULT_PROFILE: NpcPersonalityProfile = {
  temperament: "measured",
  ambition: 50,
  caution: 50,
  honor: 50,
};

export const npcPersonalities: Record<string, NpcPersonalityProfile> = {
  king_aldric: { temperament: "reserved", ambition: 55, caution: 72, honor: 78 },
  lord_merek: { temperament: "pragmatic", ambition: 64, caution: 61, honor: 52 },
  lord_theon: { temperament: "calculating", ambition: 67, caution: 58, honor: 48 },
  lord_beric: { temperament: "stern", ambition: 48, caution: 66, honor: 71 },
};

export function getNpcPersonality(characterId: string): NpcPersonalityProfile {
  return npcPersonalities[characterId] ?? DEFAULT_PROFILE;
}
