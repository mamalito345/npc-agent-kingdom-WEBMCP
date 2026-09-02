import type {
  Army,
  UnitBlock,
} from "@/types/military";

import type {
  Position,
} from "@/types/simulation";

export const demoUnitBlocks: Record<
  string,
  UnitBlock
> = {
  // =========================================================
  // NORTHREACH
  // =========================================================

  "unit-northreach-inf-1": {
    id: "unit-northreach-inf-1",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-northreach-inf-2": {
    id: "unit-northreach-inf-2",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-northreach-cav-1": {
    id: "unit-northreach-cav-1",
    type: "cavalry",
    currentSoldiers: 250,
  },

  "unit-northreach-siege-1": {
    id: "unit-northreach-siege-1",
    type: "siege",
    currentSoldiers: 1,
  },

  // =========================================================
  // EASTVALE
  // =========================================================

  "unit-eastvale-inf-1": {
    id: "unit-eastvale-inf-1",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-eastvale-inf-2": {
    id: "unit-eastvale-inf-2",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-eastvale-cav-1": {
    id: "unit-eastvale-cav-1",
    type: "cavalry",
    currentSoldiers: 250,
  },

  "unit-eastvale-siege-1": {
    id: "unit-eastvale-siege-1",
    type: "siege",
    currentSoldiers: 1,
  },

  // =========================================================
  // WESTMOOR
  // =========================================================

  "unit-westmoor-inf-1": {
    id: "unit-westmoor-inf-1",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-westmoor-inf-2": {
    id: "unit-westmoor-inf-2",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-westmoor-cav-1": {
    id: "unit-westmoor-cav-1",
    type: "cavalry",
    currentSoldiers: 250,
  },

  "unit-westmoor-siege-1": {
    id: "unit-westmoor-siege-1",
    type: "siege",
    currentSoldiers: 1,
  },

  // =========================================================
  // SOUTHMARK
  // =========================================================

  "unit-southmark-inf-1": {
    id: "unit-southmark-inf-1",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-southmark-inf-2": {
    id: "unit-southmark-inf-2",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-southmark-cav-1": {
    id: "unit-southmark-cav-1",
    type: "cavalry",
    currentSoldiers: 250,
  },

  "unit-southmark-siege-1": {
    id: "unit-southmark-siege-1",
    type: "siege",
    currentSoldiers: 1,
  },

  // =========================================================
  // IRONHOLLOW
  // =========================================================

  "unit-ironhollow-inf-1": {
    id: "unit-ironhollow-inf-1",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-ironhollow-inf-2": {
    id: "unit-ironhollow-inf-2",
    type: "infantry",
    currentSoldiers: 250,
  },

  "unit-ironhollow-cav-1": {
    id: "unit-ironhollow-cav-1",
    type: "cavalry",
    currentSoldiers: 250,
  },

  "unit-ironhollow-siege-1": {
    id: "unit-ironhollow-siege-1",
    type: "siege",
    currentSoldiers: 1,
  },
};

export const demoArmies: Record<
  string,
  Army
> = {
  "army-northreach-edwyn": {
    id: "army-northreach-edwyn",

    ownerId:
      "northreach",

    commanderId:
      "lord_edwyn",

    unitIds: [
      "unit-northreach-inf-1",
      "unit-northreach-inf-2",
      "unit-northreach-cav-1",
      "unit-northreach-siege-1",
    ],

    morale:
      "normal",

    supply: {
      foodSupply:
        1800,

      state:
        "supplied",
    },

    funding: {
      unpaidDays:
        0,

      state:
        "funded",
    },

    status:
      "field",
  },

  "army-eastvale-roderic": {
    id: "army-eastvale-roderic",

    ownerId:
      "eastvale",

    commanderId:
      "king_roderic",

    unitIds: [
      "unit-eastvale-inf-1",
      "unit-eastvale-inf-2",
      "unit-eastvale-cav-1",
      "unit-eastvale-siege-1",
    ],

    morale:
      "normal",

    supply: {
      foodSupply:
        1800,

      state:
        "supplied",
    },

    funding: {
      unpaidDays:
        0,

      state:
        "funded",
    },

    status:
      "field",
  },

  "army-westmoor-garran": {
    id: "army-westmoor-garran",

    ownerId:
      "westmoor",

    commanderId:
      "king_garran",

    unitIds: [
      "unit-westmoor-inf-1",
      "unit-westmoor-inf-2",
      "unit-westmoor-cav-1",
      "unit-westmoor-siege-1",
    ],

    morale:
      "normal",

    supply: {
      foodSupply:
        1800,

      state:
        "supplied",
    },

    funding: {
      unpaidDays:
        0,

      state:
        "funded",
    },

    status:
      "field",
  },

  "army-southmark-osric": {
    id: "army-southmark-osric",

    ownerId:
      "southmark",

    commanderId:
      "king_osric",

    unitIds: [
      "unit-southmark-inf-1",
      "unit-southmark-inf-2",
      "unit-southmark-cav-1",
      "unit-southmark-siege-1",
    ],

    morale:
      "normal",

    supply: {
      foodSupply:
        1800,

      state:
        "supplied",
    },

    funding: {
      unpaidDays:
        0,

      state:
        "funded",
    },

    status:
      "field",
  },

  "army-ironhollow-varren": {
    id: "army-ironhollow-varren",

    ownerId:
      "ironhollow",

    commanderId:
      "king_varren",

    unitIds: [
      "unit-ironhollow-inf-1",
      "unit-ironhollow-inf-2",
      "unit-ironhollow-cav-1",
      "unit-ironhollow-siege-1",
    ],

    morale:
      "normal",

    supply: {
      foodSupply:
        1800,

      state:
        "supplied",
    },

    funding: {
      unpaidDays:
        0,

      state:
        "funded",
    },

    status:
      "field",
  },
};

export const demoArmyPositions: Record<
  string,
  Position
> = {
  //
  // Player / Northreach starts here.
  //
  "army-northreach-edwyn": {
    kind:
      "node",

    nodeId:
      "stoneford",
  },

  //
  // Deliberately close hostile army.
  // Useful for the demo battle.
  //
  "army-ironhollow-varren": {
    kind:
      "node",

    nodeId:
      "riverhold",
  },

  "army-eastvale-roderic": {
    kind:
      "node",

    nodeId:
      "eastkeep",
  },

  "army-westmoor-garran": {
    kind:
      "node",

    nodeId:
      "moorhall",
  },

  "army-southmark-osric": {
    kind:
      "node",

    nodeId:
      "sunspire",
  },
};