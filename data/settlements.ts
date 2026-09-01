import type {
  Settlement,
} from "@/types/settlement";

export const settlements: Record<
  string,
  Settlement
> = {
  // NORTHREACH

  northwatch: {
    id: "northwatch",
    locationId: "northwatch",
    name: "Northwatch",
    kingdomId: "northreach",
    ownerId: "king_aldric",
    type: "capital",

    resources: {
      food: 520,
      gold: 410,
      wood: 280,
      stone: 350,
      metal: 180,
    },

    dailyProduction: {
      food: 18,
      gold: 15,
      wood: 8,
      stone: 7,
      metal: 4,
    },
  },

  stoneford: {
    id: "stoneford",
    locationId: "stoneford",
    name: "Stoneford",
    kingdomId: "northreach",
    ownerId: "lord_edwyn",
    type: "castle",

    resources: {
      food: 300,
      gold: 160,
      wood: 180,
      stone: 420,
      metal: 95,
    },

    dailyProduction: {
      food: 10,
      gold: 5,
      wood: 5,
      stone: 12,
      metal: 3,
    },
  },

  riverhold: {
    id: "riverhold",
    locationId: "riverhold",
    name: "Riverhold",
    kingdomId: "northreach",
    ownerId: "lord_merek",
    type: "town",

    resources: {
      food: 390,
      gold: 220,
      wood: 240,
      stone: 120,
      metal: 40,
    },

    dailyProduction: {
      food: 15,
      gold: 8,
      wood: 9,
      stone: 3,
      metal: 1,
    },
  },

  highcrest: {
    id: "highcrest",
    locationId: "highcrest",
    name: "Highcrest",
    kingdomId: "northreach",
    ownerId: "lord_merek",
    type: "town",

    resources: {
      food: 260,
      gold: 190,
      wood: 110,
      stone: 210,
      metal: 70,
    },

    dailyProduction: {
      food: 8,
      gold: 8,
      wood: 3,
      stone: 6,
      metal: 2,
    },
  },

  frostmere: {
    id: "frostmere",
    locationId: "frostmere",
    name: "Frostmere",
    kingdomId: "northreach",
    type: "village",

    resources: {
      food: 240,
      gold: 45,
      wood: 130,
      stone: 40,
      metal: 10,
    },

    dailyProduction: {
      food: 14,
      gold: 1,
      wood: 6,
      stone: 1,
      metal: 0,
    },
  },

  // EASTVALE

  eastkeep: {
    id: "eastkeep",
    locationId: "eastkeep",
    name: "Eastkeep",
    kingdomId: "eastvale",
    ownerId: "king_roderic",
    type: "capital",

    resources: {
      food: 620,
      gold: 440,
      wood: 300,
      stone: 260,
      metal: 120,
    },

    dailyProduction: {
      food: 22,
      gold: 16,
      wood: 9,
      stone: 6,
      metal: 3,
    },
  },

  greenharbor: {
    id: "greenharbor",
    locationId: "greenharbor",
    name: "Greenharbor",
    kingdomId: "eastvale",
    ownerId: "lord_theon",
    type: "town",

    resources: {
      food: 410,
      gold: 280,
      wood: 260,
      stone: 80,
      metal: 35,
    },

    dailyProduction: {
      food: 16,
      gold: 11,
      wood: 10,
      stone: 2,
      metal: 1,
    },
  },

  elmstead: {
    id: "elmstead",
    locationId: "elmstead",
    name: "Elmstead",
    kingdomId: "eastvale",
    type: "village",

    resources: {
      food: 350,
      gold: 55,
      wood: 190,
      stone: 35,
      metal: 8,
    },

    dailyProduction: {
      food: 18,
      gold: 2,
      wood: 8,
      stone: 1,
      metal: 0,
    },
  },

  dawnfort: {
    id: "dawnfort",
    locationId: "dawnfort",
    name: "Dawnfort",
    kingdomId: "eastvale",
    ownerId: "lord_beric",
    type: "castle",

    resources: {
      food: 250,
      gold: 130,
      wood: 130,
      stone: 360,
      metal: 100,
    },

    dailyProduction: {
      food: 7,
      gold: 4,
      wood: 4,
      stone: 10,
      metal: 4,
    },
  },

  // WESTMOOR

  moorhall: {
    id: "moorhall",
    locationId: "moorhall",
    name: "Moorhall",
    kingdomId: "westmoor",
    ownerId: "king_garran",
    type: "capital",

    resources: {
      food: 420,
      gold: 350,
      wood: 340,
      stone: 190,
      metal: 95,
    },

    dailyProduction: {
      food: 13,
      gold: 13,
      wood: 12,
      stone: 5,
      metal: 3,
    },
  },

  blackfen: {
    id: "blackfen",
    locationId: "blackfen",
    name: "Blackfen",
    kingdomId: "westmoor",
    ownerId: "lord_corvin",
    type: "town",

    resources: {
      food: 330,
      gold: 170,
      wood: 300,
      stone: 70,
      metal: 30,
    },

    dailyProduction: {
      food: 12,
      gold: 6,
      wood: 13,
      stone: 2,
      metal: 1,
    },
  },

  greywatch: {
    id: "greywatch",
    locationId: "greywatch",
    name: "Greywatch",
    kingdomId: "westmoor",
    ownerId: "lord_harlan",
    type: "castle",

    resources: {
      food: 210,
      gold: 110,
      wood: 150,
      stone: 390,
      metal: 115,
    },

    dailyProduction: {
      food: 6,
      gold: 4,
      wood: 4,
      stone: 11,
      metal: 5,
    },
  },

  reedmere: {
    id: "reedmere",
    locationId: "reedmere",
    name: "Reedmere",
    kingdomId: "westmoor",
    type: "village",

    resources: {
      food: 290,
      gold: 35,
      wood: 180,
      stone: 20,
      metal: 5,
    },

    dailyProduction: {
      food: 15,
      gold: 1,
      wood: 7,
      stone: 0,
      metal: 0,
    },
  },

  // SOUTHMARK

  sunspire: {
    id: "sunspire",
    locationId: "sunspire",
    name: "Sunspire",
    kingdomId: "southmark",
    ownerId: "king_osric",
    type: "capital",

    resources: {
      food: 700,
      gold: 460,
      wood: 210,
      stone: 230,
      metal: 85,
    },

    dailyProduction: {
      food: 25,
      gold: 17,
      wood: 6,
      stone: 5,
      metal: 2,
    },
  },

  goldmeadow: {
    id: "goldmeadow",
    locationId: "goldmeadow",
    name: "Goldmeadow",
    kingdomId: "southmark",
    ownerId: "lord_cedric",
    type: "town",

    resources: {
      food: 520,
      gold: 260,
      wood: 120,
      stone: 60,
      metal: 20,
    },

    dailyProduction: {
      food: 22,
      gold: 10,
      wood: 4,
      stone: 2,
      metal: 1,
    },
  },

  redfield: {
    id: "redfield",
    locationId: "redfield",
    name: "Redfield",
    kingdomId: "southmark",
    type: "village",

    resources: {
      food: 430,
      gold: 45,
      wood: 90,
      stone: 30,
      metal: 5,
    },

    dailyProduction: {
      food: 20,
      gold: 1,
      wood: 3,
      stone: 1,
      metal: 0,
    },
  },

  southgate: {
    id: "southgate",
    locationId: "southgate",
    name: "Southgate",
    kingdomId: "southmark",
    ownerId: "lord_tavian",
    type: "castle",

    resources: {
      food: 260,
      gold: 140,
      wood: 100,
      stone: 380,
      metal: 90,
    },

    dailyProduction: {
      food: 8,
      gold: 4,
      wood: 3,
      stone: 11,
      metal: 3,
    },
  },

  // IRONHOLLOW

  ironhold: {
    id: "ironhold",
    locationId: "ironhold",
    name: "Ironhold",
    kingdomId: "ironhollow",
    ownerId: "king_varren",
    type: "capital",

    resources: {
      food: 360,
      gold: 510,
      wood: 180,
      stone: 480,
      metal: 390,
    },

    dailyProduction: {
      food: 10,
      gold: 18,
      wood: 4,
      stone: 14,
      metal: 16,
    },
  },

  emberfall: {
    id: "emberfall",
    locationId: "emberfall",
    name: "Emberfall",
    kingdomId: "ironhollow",
    ownerId: "lord_durand",
    type: "town",

    resources: {
      food: 280,
      gold: 240,
      wood: 120,
      stone: 250,
      metal: 260,
    },

    dailyProduction: {
      food: 8,
      gold: 9,
      wood: 3,
      stone: 7,
      metal: 11,
    },
  },

  stonevein: {
    id: "stonevein",
    locationId: "stonevein",
    name: "Stonevein",
    kingdomId: "ironhollow",
    type: "village",

    resources: {
      food: 180,
      gold: 90,
      wood: 80,
      stone: 360,
      metal: 210,
    },

    dailyProduction: {
      food: 5,
      gold: 3,
      wood: 2,
      stone: 13,
      metal: 9,
    },
  },

  ashguard: {
    id: "ashguard",
    locationId: "ashguard",
    name: "Ashguard",
    kingdomId: "ironhollow",
    ownerId: "lord_malric",
    type: "castle",

    resources: {
      food: 220,
      gold: 160,
      wood: 90,
      stone: 440,
      metal: 280,
    },

    dailyProduction: {
      food: 6,
      gold: 5,
      wood: 2,
      stone: 12,
      metal: 10,
    },
  },
};