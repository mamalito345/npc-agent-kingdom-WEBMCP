export interface RoadVisualPoint {
  x: number;
  y: number;
}

export interface RoadVisualDefinition {
  edgeId: string;

  points: RoadVisualPoint[];
}

export const roadVisuals: Record<
  string,
  RoadVisualDefinition
> = {
  stoneford_riverhold: {
    edgeId:
      "stoneford_riverhold",

    points: [
      { x: 1450, y: 980 },
      { x: 1520, y: 900 },
      { x: 1600, y: 820 },
      { x: 1700, y: 760 },
    ],
  },

  riverhold_northwatch: {
    edgeId:
      "riverhold_northwatch",

    points: [
      { x: 1700, y: 760 },
      { x: 1740, y: 650 },
      { x: 1770, y: 520 },
      { x: 1800, y: 420 },
    ],
  },

  riverhold_highcrest: {
    edgeId:
      "riverhold_highcrest",

    points: [
      { x: 1700, y: 760 },
      { x: 1830, y: 750 },
      { x: 1990, y: 770 },
      { x: 2150, y: 820 },
    ],
  },

  highcrest_frostmere: {
    edgeId:
      "highcrest_frostmere",

    points: [
      { x: 2150, y: 820 },
      { x: 2250, y: 720 },
      { x: 2350, y: 620 },
      { x: 2450, y: 540 },
    ],
  },

  highcrest_eastkeep: {
    edgeId:
      "highcrest_eastkeep",

    points: [
      { x: 2150, y: 820 },
      { x: 2500, y: 780 },
      { x: 2900, y: 840 },
      { x: 3300, y: 980 },
    ],
  },

  eastkeep_greenharbor: {
    edgeId:
      "eastkeep_greenharbor",

    points: [
      { x: 3300, y: 980 },
      { x: 3500, y: 940 },
      { x: 3700, y: 910 },
      { x: 3850, y: 900 },
    ],
  },

  greenharbor_elmstead: {
    edgeId:
      "greenharbor_elmstead",

    points: [
      { x: 3850, y: 900 },
      { x: 3960, y: 970 },
      { x: 4080, y: 1040 },
      { x: 4200, y: 1120 },
    ],
  },

  eastkeep_dawnfort: {
    edgeId:
      "eastkeep_dawnfort",

    points: [
      { x: 3300, y: 980 },
      { x: 3360, y: 1100 },
      { x: 3430, y: 1230 },
      { x: 3500, y: 1350 },
    ],
  },

  stoneford_moorhall: {
    edgeId:
      "stoneford_moorhall",

    points: [
      { x: 1450, y: 980 },
      { x: 1380, y: 1250 },
      { x: 1250, y: 1550 },
      { x: 1150, y: 1900 },
    ],
  },

  moorhall_blackfen: {
    edgeId:
      "moorhall_blackfen",

    points: [
      { x: 1150, y: 1900 },
      { x: 1000, y: 1930 },
      { x: 850, y: 1990 },
      { x: 700, y: 2050 },
    ],
  },

  blackfen_reedmere: {
    edgeId:
      "blackfen_reedmere",

    points: [
      { x: 700, y: 2050 },
      { x: 620, y: 2140 },
      { x: 530, y: 2250 },
      { x: 450, y: 2350 },
    ],
  },

  moorhall_greywatch: {
    edgeId:
      "moorhall_greywatch",

    points: [
      { x: 1150, y: 1900 },
      { x: 1220, y: 2010 },
      { x: 1340, y: 2140 },
      { x: 1450, y: 2250 },
    ],
  },

  moorhall_sunspire: {
    edgeId:
      "moorhall_sunspire",

    points: [
      { x: 1150, y: 1900 },
      { x: 1700, y: 1980 },
      { x: 2300, y: 2150 },
      { x: 2800, y: 2350 },
    ],
  },

  sunspire_goldmeadow: {
    edgeId:
      "sunspire_goldmeadow",

    points: [
      { x: 2800, y: 2350 },
      { x: 2880, y: 2470 },
      { x: 2970, y: 2600 },
      { x: 3050, y: 2700 },
    ],
  },

  goldmeadow_redfield: {
    edgeId:
      "goldmeadow_redfield",

    points: [
      { x: 3050, y: 2700 },
      { x: 2930, y: 2800 },
      { x: 2820, y: 2890 },
      { x: 2700, y: 2950 },
    ],
  },

  sunspire_southgate: {
    edgeId:
      "sunspire_southgate",

    points: [
      { x: 2800, y: 2350 },
      { x: 3000, y: 2450 },
      { x: 3250, y: 2580 },
      { x: 3500, y: 2700 },
    ],
  },

  eastkeep_sunspire: {
    edgeId:
      "eastkeep_sunspire",

    points: [
      { x: 3300, y: 980 },
      { x: 3200, y: 1400 },
      { x: 3000, y: 1900 },
      { x: 2800, y: 2350 },
    ],
  },

  eastkeep_ironhold: {
    edgeId:
      "eastkeep_ironhold",

    points: [
      { x: 3300, y: 980 },
      { x: 3600, y: 1200 },
      { x: 4000, y: 1500 },
      { x: 4300, y: 1900 },
    ],
  },

  moorhall_ironhold: {
    edgeId:
      "moorhall_ironhold",

    points: [
      { x: 1150, y: 1900 },
      { x: 2200, y: 1850 },
      { x: 3300, y: 1870 },
      { x: 4300, y: 1900 },
    ],
  },

  ironhold_emberfall: {
    edgeId:
      "ironhold_emberfall",

    points: [
      { x: 4300, y: 1900 },
      { x: 4400, y: 2000 },
      { x: 4480, y: 2100 },
      { x: 4550, y: 2200 },
    ],
  },

  emberfall_stonevein: {
    edgeId:
      "emberfall_stonevein",

    points: [
      { x: 4550, y: 2200 },
      { x: 4610, y: 2310 },
      { x: 4660, y: 2430 },
      { x: 4700, y: 2550 },
    ],
  },

  ironhold_ashguard: {
    edgeId:
      "ironhold_ashguard",

    points: [
      { x: 4300, y: 1900 },
      { x: 4220, y: 2080 },
      { x: 4140, y: 2270 },
      { x: 4050, y: 2450 },
    ],
  },
};