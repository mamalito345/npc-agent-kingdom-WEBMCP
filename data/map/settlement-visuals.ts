export interface SettlementVisualDefinition {
  settlementId: string;

  x: number;
  y: number;

  iconUrl: string;

  scale?: number;

  labelOffsetX?: number;
  labelOffsetY?: number;
}

export const settlementVisuals: Record<
  string,
  SettlementVisualDefinition
> = {
  northwatch: {
    settlementId:
      "northwatch",
    x: 1800,
    y: 420,
    iconUrl:
      "/assets/map/capital.png",
    scale: 1.15,
  },

  stoneford: {
    settlementId:
      "stoneford",
    x: 1450,
    y: 980,
    iconUrl:
      "/assets/map/castle.png",
  },

  riverhold: {
    settlementId:
      "riverhold",
    x: 1700,
    y: 760,
    iconUrl:
      "/assets/map/city.png",
  },

  highcrest: {
    settlementId:
      "highcrest",
    x: 2150,
    y: 820,
    iconUrl:
      "/assets/map/city.png",
  },

  frostmere: {
    settlementId:
      "frostmere",
    x: 2450,
    y: 540,
    iconUrl:
      "/assets/map/village.png",
  },

  eastkeep: {
    settlementId:
      "eastkeep",
    x: 3300,
    y: 980,
    iconUrl:
      "/assets/map/capital.png",
    scale: 1.15,
  },

  greenharbor: {
    settlementId:
      "greenharbor",
    x: 3850,
    y: 900,
    iconUrl:
      "/assets/map/city.png",
  },

  elmstead: {
    settlementId:
      "elmstead",
    x: 4200,
    y: 1120,
    iconUrl:
      "/assets/map/village.png",
  },

  dawnfort: {
    settlementId:
      "dawnfort",
    x: 3500,
    y: 1350,
    iconUrl:
      "/assets/map/castle.png",
  },

  moorhall: {
    settlementId:
      "moorhall",
    x: 1150,
    y: 1900,
    iconUrl:
      "/assets/map/capital.png",
    scale: 1.15,
  },

  blackfen: {
    settlementId:
      "blackfen",
    x: 700,
    y: 2050,
    iconUrl:
      "/assets/map/city.png",
  },

  greywatch: {
    settlementId:
      "greywatch",
    x: 1450,
    y: 2250,
    iconUrl:
      "/assets/map/castle.png",
  },

  reedmere: {
    settlementId:
      "reedmere",
    x: 450,
    y: 2350,
    iconUrl:
      "/assets/map/village.png",
  },

  sunspire: {
    settlementId:
      "sunspire",
    x: 2800,
    y: 2350,
    iconUrl:
      "/assets/map/capital.png",
    scale: 1.15,
  },

  goldmeadow: {
    settlementId:
      "goldmeadow",
    x: 3050,
    y: 2700,
    iconUrl:
      "/assets/map/city.png",
  },

  redfield: {
    settlementId:
      "redfield",
    x: 2700,
    y: 2950,
    iconUrl:
      "/assets/map/village.png",
  },

  southgate: {
    settlementId:
      "southgate",
    x: 3500,
    y: 2700,
    iconUrl:
      "/assets/map/castle.png",
  },

  ironhold: {
    settlementId:
      "ironhold",
    x: 4300,
    y: 1900,
    iconUrl:
      "/assets/map/capital.png",
    scale: 1.15,
  },

  emberfall: {
    settlementId:
      "emberfall",
    x: 4550,
    y: 2200,
    iconUrl:
      "/assets/map/city.png",
  },

  stonevein: {
    settlementId:
      "stonevein",
    x: 4700,
    y: 2550,
    iconUrl:
      "/assets/map/village.png",
  },

  ashguard: {
    settlementId:
      "ashguard",
    x: 4050,
    y: 2450,
    iconUrl:
      "/assets/map/castle.png",
  },
};