import type { MapEdge, MapNode } from "@/types/map";

export const mapNodes: Record<string, MapNode> = {
  stoneford: {
    id: "stoneford",
    locationId: "stoneford",
  },

  riverhold: {
    id: "riverhold",
    locationId: "riverhold",
  },

  northwatch: {
    id: "northwatch",
    locationId: "northwatch",
  },

  highcrest: {
    id: "highcrest",
    locationId: "highcrest",
  },

  eastkeep: {
    id: "eastkeep",
    locationId: "eastkeep",
  },

  moorhall: {
    id: "moorhall",
    locationId: "moorhall",
  },

  sunspire: {
    id: "sunspire",
    locationId: "sunspire",
  },

  ironhold: {
    id: "ironhold",
    locationId: "ironhold",
  },
};

export const mapEdges: Record<string, MapEdge> = {
  stoneford_riverhold: {
    id: "stoneford_riverhold",
    fromNodeId: "stoneford",
    toNodeId: "riverhold",

    distanceKm: 160,
    travelModifier: 1,
  },

  riverhold_northwatch: {
    id: "riverhold_northwatch",
    fromNodeId: "riverhold",
    toNodeId: "northwatch",

    distanceKm: 220,
    travelModifier: 1,
  },

  riverhold_highcrest: {
    id: "riverhold_highcrest",
    fromNodeId: "riverhold",
    toNodeId: "highcrest",

    distanceKm: 130,
    travelModifier: 1,
  },

  highcrest_eastkeep: {
    id: "highcrest_eastkeep",
    fromNodeId: "highcrest",
    toNodeId: "eastkeep",

    distanceKm: 310,
    travelModifier: 1,
  },

  stoneford_moorhall: {
    id: "stoneford_moorhall",
    fromNodeId: "stoneford",
    toNodeId: "moorhall",

    distanceKm: 340,
    travelModifier: 1,
  },

  moorhall_sunspire: {
    id: "moorhall_sunspire",
    fromNodeId: "moorhall",
    toNodeId: "sunspire",

    distanceKm: 280,
    travelModifier: 1,
  },

  eastkeep_sunspire: {
    id: "eastkeep_sunspire",
    fromNodeId: "eastkeep",
    toNodeId: "sunspire",

    distanceKm: 260,
    travelModifier: 1,
  },

  eastkeep_ironhold: {
    id: "eastkeep_ironhold",
    fromNodeId: "eastkeep",
    toNodeId: "ironhold",

    distanceKm: 390,
    travelModifier: 1,
  },

  moorhall_ironhold: {
    id: "moorhall_ironhold",
    fromNodeId: "moorhall",
    toNodeId: "ironhold",

    distanceKm: 360,
    travelModifier: 1,
  },
};