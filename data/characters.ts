import type {
  Character,
} from "@/types/world";

export const characters: Record<
  string,
  Character
> = {
  // NORTHREACH

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
    locationId: "riverhold",
    treasury: 4100,
    army: 1050,

    relationships: {
      king_aldric: 62,
      lord_edwyn: -20,
    },
  },

  // EASTVALE

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

  lord_theon: {
    id: "lord_theon",
    name: "Lord Theon",
    kingdomId: "eastvale",
    rank: "lord",
    locationId: "greenharbor",
    treasury: 2800,
    army: 720,
    relationships: {
      king_roderic: 48,
    },
  },

  lord_beric: {
    id: "lord_beric",
    name: "Lord Beric",
    kingdomId: "eastvale",
    rank: "lord",
    locationId: "dawnfort",
    treasury: 2500,
    army: 810,
    relationships: {
      king_roderic: 30,
    },
  },

  // WESTMOOR

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

  lord_corvin: {
    id: "lord_corvin",
    name: "Lord Corvin",
    kingdomId: "westmoor",
    rank: "lord",
    locationId: "blackfen",
    treasury: 2300,
    army: 680,
    relationships: {
      king_garran: 20,
    },
  },

  lord_harlan: {
    id: "lord_harlan",
    name: "Lord Harlan",
    kingdomId: "westmoor",
    rank: "lord",
    locationId: "greywatch",
    treasury: 2700,
    army: 760,
    relationships: {
      king_garran: 44,
    },
  },

  // SOUTHMARK

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

  lord_cedric: {
    id: "lord_cedric",
    name: "Lord Cedric",
    kingdomId: "southmark",
    rank: "lord",
    locationId: "goldmeadow",
    treasury: 3000,
    army: 690,
    relationships: {
      king_osric: 55,
    },
  },

  lord_tavian: {
    id: "lord_tavian",
    name: "Lord Tavian",
    kingdomId: "southmark",
    rank: "lord",
    locationId: "southgate",
    treasury: 2600,
    army: 740,
    relationships: {
      king_osric: 26,
    },
  },

  // IRONHOLLOW

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

  lord_durand: {
    id: "lord_durand",
    name: "Lord Durand",
    kingdomId: "ironhollow",
    rank: "lord",
    locationId: "emberfall",
    treasury: 3500,
    army: 980,
    relationships: {
      king_varren: 40,
    },
  },

  lord_malric: {
    id: "lord_malric",
    name: "Lord Malric",
    kingdomId: "ironhollow",
    rank: "lord",
    locationId: "ashguard",
    treasury: 3700,
    army: 1020,
    relationships: {
      king_varren: 18,
    },
  },
};