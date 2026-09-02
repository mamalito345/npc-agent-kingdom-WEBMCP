export interface SettlementMilitaryProfile {
  settlementId: string;
  level: number;
}

export const settlementMilitaryProfiles: Record<
  string,
  SettlementMilitaryProfile
> = {
  // NORTHREACH

  northwatch: {
    settlementId: "northwatch",
    level: 8,
  },

  stoneford: {
    settlementId: "stoneford",
    level: 6,
  },

  riverhold: {
    settlementId: "riverhold",
    level: 4,
  },

  highcrest: {
    settlementId: "highcrest",
    level: 4,
  },

  frostmere: {
    settlementId: "frostmere",
    level: 2,
  },

  // EASTVALE

  eastkeep: {
    settlementId: "eastkeep",
    level: 8,
  },

  greenharbor: {
    settlementId: "greenharbor",
    level: 4,
  },

  elmstead: {
    settlementId: "elmstead",
    level: 2,
  },

  dawnfort: {
    settlementId: "dawnfort",
    level: 6,
  },

  // WESTMOOR

  moorhall: {
    settlementId: "moorhall",
    level: 8,
  },

  blackfen: {
    settlementId: "blackfen",
    level: 4,
  },

  greywatch: {
    settlementId: "greywatch",
    level: 6,
  },

  reedmere: {
    settlementId: "reedmere",
    level: 2,
  },

  // SOUTHMARK

  sunspire: {
    settlementId: "sunspire",
    level: 8,
  },

  goldmeadow: {
    settlementId: "goldmeadow",
    level: 4,
  },

  redfield: {
    settlementId: "redfield",
    level: 2,
  },

  southgate: {
    settlementId: "southgate",
    level: 6,
  },

  // IRONHOLLOW

  ironhold: {
    settlementId: "ironhold",
    level: 8,
  },

  emberfall: {
    settlementId: "emberfall",
    level: 4,
  },

  stonevein: {
    settlementId: "stonevein",
    level: 2,
  },

  ashguard: {
    settlementId: "ashguard",
    level: 6,
  },
};

export function getSettlementMilitaryProfile(
  settlementId: string
): SettlementMilitaryProfile | undefined {
  return settlementMilitaryProfiles[
    settlementId
  ];
}