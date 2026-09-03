import type { Kingdom } from "@/types/world";

export const kingdoms: Record<string, Kingdom> = {
  "northreach": {
    id: "northreach", name: "Northreach", rulerId: "king_aldric",
    lordIds: ["lord_edwyn", "lord_merek", "lord_rowan"],
    settlementIds: ["northwatch", "stoneford", "riverhold", "highcrest", "frostmere", "wolfpine", "frostfield", "ironfrost", "icewatch"], armyIds: [],
    treasury: 24000, army: 5200, food: 78, stability: 72,
    relations: {"eastvale": 20, "westmoor": -15, "southmark": 5, "ironhollow": -35},
  },
  "eastvale": {
    id: "eastvale", name: "Eastvale", rulerId: "king_roderic",
    lordIds: ["lord_theon", "lord_beric"],
    settlementIds: ["eastkeep", "greenharbor", "elmstead", "dawnfort", "suncrest", "greencrest", "eastbrook", "hillstead", "coastfield", "greencrest-fort"], armyIds: [],
    treasury: 19500, army: 4100, food: 85, stability: 80,
    relations: {"northreach": 20, "westmoor": 10, "southmark": 25, "ironhollow": -10},
  },
  "westmoor": {
    id: "westmoor", name: "Westmoor", rulerId: "king_garran",
    lordIds: ["lord_corvin", "lord_harlan"],
    settlementIds: ["moorhall", "blackfen", "greywatch", "reedmere", "deepwood", "oakmarket", "blackpine", "oakrest", "greenfield-west", "oakshield"], armyIds: [],
    treasury: 17000, army: 4600, food: 61, stability: 66,
    relations: {"northreach": -15, "eastvale": 10, "southmark": 0, "ironhollow": 15},
  },
  "southmark": {
    id: "southmark", name: "Southmark", rulerId: "king_osric",
    lordIds: ["lord_cedric", "lord_tavian"],
    settlementIds: ["sunspire", "goldmeadow", "redfield", "southgate", "kingscross", "highfield", "wheatbrook", "stonebrook", "greenmead", "stonehill"], armyIds: [],
    treasury: 21500, army: 3900, food: 92, stability: 76,
    relations: {"northreach": 5, "eastvale": 25, "westmoor": 0, "ironhollow": -5},
  },
  "ironhollow": {
    id: "ironhollow", name: "Ironhollow", rulerId: "king_varren",
    lordIds: ["lord_durand", "lord_malric"],
    settlementIds: ["ironhold", "emberfall", "stonevein", "ashguard", "redhaven", "oasisfall", "dustmarket", "sunwell", "sandbrook", "redstone", "dunefield", "caravan-rest", "dunegate", "sunwatch"], armyIds: [],
    treasury: 29000, army: 6100, food: 54, stability: 58,
    relations: {"northreach": -35, "eastvale": -10, "westmoor": 15, "southmark": -5},
  },
};
