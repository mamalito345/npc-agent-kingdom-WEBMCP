import type { Character } from "@/types/world";

export const characters: Record<string, Character> = {
  king_aldric: {
    id: "king_aldric",
    name: "King Aldric",
    kingdomId: "northreach",
    rank: "king",
    locationId: "northwatch",

    treasury: 7000,
    army: 1200,

    relationships: {
      lord_edwyn: 35,
      lord_merek: 62,
    },
  },

  lord_edwyn: {
    id: "lord_edwyn",
    name: "Lord Edwyn",
    kingdomId: "northreach",
    rank: "lord",
    locationId: "stoneford",

    treasury: 3200,
    army: 850,

    relationships: {
      king_aldric: 35,
      lord_merek: -20,
    },
  },

  lord_merek: {
    id: "lord_merek",
    name: "Lord Merek",
    kingdomId: "northreach",
    rank: "lord",
    locationId: "highcrest",

    treasury: 4100,
    army: 1050,

    relationships: {
      king_aldric: 62,
      lord_edwyn: -20,
    },
  },

  king_roderic: {
    id: "king_roderic",
    name: "King Roderic",
    kingdomId: "eastvale",
    rank: "king",
    locationId: "eastkeep",

    treasury: 6000,
    army: 1000,

    relationships: {},
  },

  king_garran: {
    id: "king_garran",
    name: "King Garran",
    kingdomId: "westmoor",
    rank: "king",
    locationId: "moorhall",

    treasury: 5200,
    army: 900,

    relationships: {},
  },

  king_osric: {
    id: "king_osric",
    name: "King Osric",
    kingdomId: "southmark",
    rank: "king",
    locationId: "sunspire",

    treasury: 6500,
    army: 950,

    relationships: {},
  },

  king_varren: {
    id: "king_varren",
    name: "King Varren",
    kingdomId: "ironhollow",
    rank: "king",
    locationId: "ironhold",

    treasury: 8000,
    army: 1400,

    relationships: {},
  },
};