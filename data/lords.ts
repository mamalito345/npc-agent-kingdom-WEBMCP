import type {
  LordProfile,
  LordRuntimeState,
} from "@/types/lords";

function armyId(
  characterId: string
): string {
  return `army-house-${characterId.replace(/^lord_/, "")}`;
}

export const initialLordProfiles: Record<string, LordProfile> = {
  lord_merek: {
    characterId: "lord_merek",
    kingdomId: "northreach",
    title: "Lord of Riverhold",
    homeSettlementId: "riverhold",
    controlledSettlementIds: ["riverhold", "highcrest"],
    controlledArmyIds: [armyId("lord_merek")],
    loyalty: 78,
    politicalPower: 72,
    relationshipToRuler: 62,
    basicTraits: {
      ambition: 56,
      honor: 68,
      aggression: 58,
      caution: 61,
      diplomacy: 55,
      intrigue: 42,
    },
  },

  lord_rowan: {
    characterId: "lord_rowan",
    kingdomId: "northreach",
    title: "Lord of Frostmere",
    homeSettlementId: "frostmere",
    controlledSettlementIds: ["frostmere"],
    controlledArmyIds: [armyId("lord_rowan")],
    loyalty: 48,
    politicalPower: 46,
    relationshipToRuler: 18,
    basicTraits: {
      ambition: 72,
      honor: 51,
      aggression: 44,
      caution: 78,
      diplomacy: 63,
      intrigue: 67,
    },
  },

  lord_theon: {
    characterId: "lord_theon",
    kingdomId: "eastvale",
    title: "Lord of Greenharbor",
    homeSettlementId: "greenharbor",
    controlledSettlementIds: ["greenharbor", "elmstead"],
    controlledArmyIds: [armyId("lord_theon")],
    loyalty: 69,
    politicalPower: 63,
    relationshipToRuler: 48,
    basicTraits: {
      ambition: 66,
      honor: 58,
      aggression: 53,
      caution: 62,
      diplomacy: 74,
      intrigue: 57,
    },
  },

  lord_beric: {
    characterId: "lord_beric",
    kingdomId: "eastvale",
    title: "Lord of Dawnfort",
    homeSettlementId: "dawnfort",
    controlledSettlementIds: ["dawnfort"],
    controlledArmyIds: [armyId("lord_beric")],
    loyalty: 84,
    politicalPower: 58,
    relationshipToRuler: 30,
    basicTraits: {
      ambition: 35,
      honor: 86,
      aggression: 71,
      caution: 48,
      diplomacy: 39,
      intrigue: 25,
    },
  },

  lord_corvin: {
    characterId: "lord_corvin",
    kingdomId: "westmoor",
    title: "Lord of Blackfen",
    homeSettlementId: "blackfen",
    controlledSettlementIds: ["blackfen", "reedmere"],
    controlledArmyIds: [armyId("lord_corvin")],
    loyalty: 42,
    politicalPower: 68,
    relationshipToRuler: 20,
    basicTraits: {
      ambition: 81,
      honor: 39,
      aggression: 65,
      caution: 49,
      diplomacy: 52,
      intrigue: 79,
    },
  },

  lord_harlan: {
    characterId: "lord_harlan",
    kingdomId: "westmoor",
    title: "Lord of Greywatch",
    homeSettlementId: "greywatch",
    controlledSettlementIds: ["greywatch"],
    controlledArmyIds: [armyId("lord_harlan")],
    loyalty: 76,
    politicalPower: 61,
    relationshipToRuler: 44,
    basicTraits: {
      ambition: 43,
      honor: 79,
      aggression: 62,
      caution: 55,
      diplomacy: 46,
      intrigue: 31,
    },
  },

  lord_cedric: {
    characterId: "lord_cedric",
    kingdomId: "southmark",
    title: "Lord of Goldmeadow",
    homeSettlementId: "goldmeadow",
    controlledSettlementIds: ["goldmeadow", "redfield"],
    controlledArmyIds: [armyId("lord_cedric")],
    loyalty: 81,
    politicalPower: 70,
    relationshipToRuler: 55,
    basicTraits: {
      ambition: 51,
      honor: 77,
      aggression: 49,
      caution: 58,
      diplomacy: 72,
      intrigue: 38,
    },
  },

  lord_tavian: {
    characterId: "lord_tavian",
    kingdomId: "southmark",
    title: "Lord of Southgate",
    homeSettlementId: "southgate",
    controlledSettlementIds: ["southgate"],
    controlledArmyIds: [armyId("lord_tavian")],
    loyalty: 57,
    politicalPower: 56,
    relationshipToRuler: 26,
    basicTraits: {
      ambition: 64,
      honor: 61,
      aggression: 78,
      caution: 37,
      diplomacy: 41,
      intrigue: 48,
    },
  },

  lord_durand: {
    characterId: "lord_durand",
    kingdomId: "ironhollow",
    title: "Lord of Emberfall",
    homeSettlementId: "emberfall",
    controlledSettlementIds: ["emberfall", "stonevein"],
    controlledArmyIds: [armyId("lord_durand")],
    loyalty: 71,
    politicalPower: 74,
    relationshipToRuler: 40,
    basicTraits: {
      ambition: 59,
      honor: 66,
      aggression: 73,
      caution: 44,
      diplomacy: 45,
      intrigue: 52,
    },
  },

  lord_malric: {
    characterId: "lord_malric",
    kingdomId: "ironhollow",
    title: "Lord of Ashguard",
    homeSettlementId: "ashguard",
    controlledSettlementIds: ["ashguard"],
    controlledArmyIds: [armyId("lord_malric")],
    loyalty: 22,
    politicalPower: 77,
    relationshipToRuler: 18,
    basicTraits: {
      ambition: 88,
      honor: 31,
      aggression: 69,
      caution: 72,
      diplomacy: 58,
      intrigue: 91,
    },
  },
};

export function createInitialLordRuntimeState(): LordRuntimeState {
  return {
    profiles: Object.fromEntries(
      Object.entries(initialLordProfiles).map(([id, profile]) => [
        id,
        {
          ...profile,
          controlledSettlementIds: [...profile.controlledSettlementIds],
          controlledArmyIds: [...profile.controlledArmyIds],
          basicTraits: { ...profile.basicTraits },
        },
      ])
    ),
    orders: {},
  };
}
