import type { Location } from "@/types/world";

export const locations: Record<string, Location> = {
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

  eastkeep: {
    id: "eastkeep",
    name: "Eastkeep",
    kingdomId: "eastvale",
    type: "capital",
  },

  moorhall: {
    id: "moorhall",
    name: "Moorhall",
    kingdomId: "westmoor",
    type: "capital",
  },

  sunspire: {
    id: "sunspire",
    name: "Sunspire",
    kingdomId: "southmark",
    type: "capital",
  },

  ironhold: {
    id: "ironhold",
    name: "Ironhold",
    kingdomId: "ironhollow",
    type: "capital",
  },
};