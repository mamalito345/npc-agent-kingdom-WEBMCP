import type {
  MapEdge,
  MapNode,
} from "@/types/map";

export const mapNodes: Record<
  string,
  MapNode
> = {
  northwatch: {
    id: "northwatch",
    locationId:
      "northwatch",
  },

  stoneford: {
    id: "stoneford",
    locationId:
      "stoneford",
  },

  riverhold: {
    id: "riverhold",
    locationId:
      "riverhold",
  },

  highcrest: {
    id: "highcrest",
    locationId:
      "highcrest",
  },

  frostmere: {
    id: "frostmere",
    locationId:
      "frostmere",
  },

  eastkeep: {
    id: "eastkeep",
    locationId:
      "eastkeep",
  },

  greenharbor: {
    id: "greenharbor",
    locationId:
      "greenharbor",
  },

  elmstead: {
    id: "elmstead",
    locationId:
      "elmstead",
  },

  dawnfort: {
    id: "dawnfort",
    locationId:
      "dawnfort",
  },

  moorhall: {
    id: "moorhall",
    locationId:
      "moorhall",
  },

  blackfen: {
    id: "blackfen",
    locationId:
      "blackfen",
  },

  greywatch: {
    id: "greywatch",
    locationId:
      "greywatch",
  },

  reedmere: {
    id: "reedmere",
    locationId:
      "reedmere",
  },

  sunspire: {
    id: "sunspire",
    locationId:
      "sunspire",
  },

  goldmeadow: {
    id: "goldmeadow",
    locationId:
      "goldmeadow",
  },

  redfield: {
    id: "redfield",
    locationId:
      "redfield",
  },

  southgate: {
    id: "southgate",
    locationId:
      "southgate",
  },

  ironhold: {
    id: "ironhold",
    locationId:
      "ironhold",
  },

  emberfall: {
    id: "emberfall",
    locationId:
      "emberfall",
  },

  stonevein: {
    id: "stonevein",
    locationId:
      "stonevein",
  },

  ashguard: {
    id: "ashguard",
    locationId:
      "ashguard",
  },
};

export const mapEdges: Record<
  string,
  MapEdge
> = {
  stoneford_riverhold: {
    id: "stoneford_riverhold",
    fromNodeId:
      "stoneford",
    toNodeId:
      "riverhold",
    distanceKm: 160,
    travelModifier: 1,
  },

  riverhold_northwatch: {
    id: "riverhold_northwatch",
    fromNodeId:
      "riverhold",
    toNodeId:
      "northwatch",
    distanceKm: 220,
    travelModifier: 1,
  },

  riverhold_highcrest: {
    id: "riverhold_highcrest",
    fromNodeId:
      "riverhold",
    toNodeId:
      "highcrest",
    distanceKm: 130,
    travelModifier: 1,
  },

  highcrest_frostmere: {
    id: "highcrest_frostmere",
    fromNodeId:
      "highcrest",
    toNodeId:
      "frostmere",
    distanceKm: 120,
    travelModifier: 1,
  },

  highcrest_eastkeep: {
    id: "highcrest_eastkeep",
    fromNodeId:
      "highcrest",
    toNodeId:
      "eastkeep",
    distanceKm: 310,
    travelModifier: 1,
  },

  eastkeep_greenharbor: {
    id: "eastkeep_greenharbor",
    fromNodeId:
      "eastkeep",
    toNodeId:
      "greenharbor",
    distanceKm: 145,
    travelModifier: 1,
  },

  greenharbor_elmstead: {
    id: "greenharbor_elmstead",
    fromNodeId:
      "greenharbor",
    toNodeId:
      "elmstead",
    distanceKm: 95,
    travelModifier: 1,
  },

  eastkeep_dawnfort: {
    id: "eastkeep_dawnfort",
    fromNodeId:
      "eastkeep",
    toNodeId:
      "dawnfort",
    distanceKm: 170,
    travelModifier: 1,
  },

  stoneford_moorhall: {
    id: "stoneford_moorhall",
    fromNodeId:
      "stoneford",
    toNodeId:
      "moorhall",
    distanceKm: 340,
    travelModifier: 1,
  },

  moorhall_blackfen: {
    id: "moorhall_blackfen",
    fromNodeId:
      "moorhall",
    toNodeId:
      "blackfen",
    distanceKm: 130,
    travelModifier: 1,
  },

  blackfen_reedmere: {
    id: "blackfen_reedmere",
    fromNodeId:
      "blackfen",
    toNodeId:
      "reedmere",
    distanceKm: 85,
    travelModifier: 1,
  },

  moorhall_greywatch: {
    id: "moorhall_greywatch",
    fromNodeId:
      "moorhall",
    toNodeId:
      "greywatch",
    distanceKm: 165,
    travelModifier: 1,
  },

  moorhall_sunspire: {
    id: "moorhall_sunspire",
    fromNodeId:
      "moorhall",
    toNodeId:
      "sunspire",
    distanceKm: 280,
    travelModifier: 1,
  },

  sunspire_goldmeadow: {
    id: "sunspire_goldmeadow",
    fromNodeId:
      "sunspire",
    toNodeId:
      "goldmeadow",
    distanceKm: 125,
    travelModifier: 1,
  },

  goldmeadow_redfield: {
    id: "goldmeadow_redfield",
    fromNodeId:
      "goldmeadow",
    toNodeId:
      "redfield",
    distanceKm: 90,
    travelModifier: 1,
  },

  sunspire_southgate: {
    id: "sunspire_southgate",
    fromNodeId:
      "sunspire",
    toNodeId:
      "southgate",
    distanceKm: 175,
    travelModifier: 1,
  },

  eastkeep_sunspire: {
    id: "eastkeep_sunspire",
    fromNodeId:
      "eastkeep",
    toNodeId:
      "sunspire",
    distanceKm: 260,
    travelModifier: 1,
  },

  eastkeep_ironhold: {
    id: "eastkeep_ironhold",
    fromNodeId:
      "eastkeep",
    toNodeId:
      "ironhold",
    distanceKm: 390,
    travelModifier: 1,
  },

  moorhall_ironhold: {
    id: "moorhall_ironhold",
    fromNodeId:
      "moorhall",
    toNodeId:
      "ironhold",
    distanceKm: 360,
    travelModifier: 1,
  },

  ironhold_emberfall: {
    id: "ironhold_emberfall",
    fromNodeId:
      "ironhold",
    toNodeId:
      "emberfall",
    distanceKm: 140,
    travelModifier: 1,
  },

  emberfall_stonevein: {
    id: "emberfall_stonevein",
    fromNodeId:
      "emberfall",
    toNodeId:
      "stonevein",
    distanceKm: 105,
    travelModifier: 1,
  },

  ironhold_ashguard: {
    id: "ironhold_ashguard",
    fromNodeId:
      "ironhold",
    toNodeId:
      "ashguard",
    distanceKm: 180,
    travelModifier: 1,
  },
};