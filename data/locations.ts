import type {
  Location,
} from "@/types/world";

export const locations: Record<
  string,
  Location
> = {
  // NORTHREACH

  northwatch: {
    id: "northwatch",
    name: "Northwatch",
    kingdomId: "northreach",
    type: "capital",
  },

  stoneford: {
    id: "stoneford",
    name: "Stoneford",
    kingdomId: "northreach",
    type: "castle",
  },

  riverhold: {
    id: "riverhold",
    name: "Riverhold",
    kingdomId: "northreach",
    type: "town",
  },

  highcrest: {
    id: "highcrest",
    name: "Highcrest",
    kingdomId: "northreach",
    type: "town",
  },

  frostmere: {
    id: "frostmere",
    name: "Frostmere",
    kingdomId: "northreach",
    type: "village",
  },

  // EASTVALE

  eastkeep: {
    id: "eastkeep",
    name: "Eastkeep",
    kingdomId: "eastvale",
    type: "capital",
  },

  greenharbor: {
    id: "greenharbor",
    name: "Greenharbor",
    kingdomId: "eastvale",
    type: "town",
  },

  elmstead: {
    id: "elmstead",
    name: "Elmstead",
    kingdomId: "eastvale",
    type: "village",
  },

  dawnfort: {
    id: "dawnfort",
    name: "Dawnfort",
    kingdomId: "eastvale",
    type: "castle",
  },

  // WESTMOOR

  moorhall: {
    id: "moorhall",
    name: "Moorhall",
    kingdomId: "westmoor",
    type: "capital",
  },

  blackfen: {
    id: "blackfen",
    name: "Blackfen",
    kingdomId: "westmoor",
    type: "town",
  },

  greywatch: {
    id: "greywatch",
    name: "Greywatch",
    kingdomId: "westmoor",
    type: "castle",
  },

  reedmere: {
    id: "reedmere",
    name: "Reedmere",
    kingdomId: "westmoor",
    type: "village",
  },

  // SOUTHMARK

  sunspire: {
    id: "sunspire",
    name: "Sunspire",
    kingdomId: "southmark",
    type: "capital",
  },

  goldmeadow: {
    id: "goldmeadow",
    name: "Goldmeadow",
    kingdomId: "southmark",
    type: "town",
  },

  redfield: {
    id: "redfield",
    name: "Redfield",
    kingdomId: "southmark",
    type: "village",
  },

  southgate: {
    id: "southgate",
    name: "Southgate",
    kingdomId: "southmark",
    type: "castle",
  },

  // IRONHOLLOW

  ironhold: {
    id: "ironhold",
    name: "Ironhold",
    kingdomId: "ironhollow",
    type: "capital",
  },

  emberfall: {
    id: "emberfall",
    name: "Emberfall",
    kingdomId: "ironhollow",
    type: "town",
  },

  stonevein: {
    id: "stonevein",
    name: "Stonevein",
    kingdomId: "ironhollow",
    type: "village",
  },

  ashguard: {
    id: "ashguard",
    name: "Ashguard",
    kingdomId: "ironhollow",
    type: "castle",
  },
};