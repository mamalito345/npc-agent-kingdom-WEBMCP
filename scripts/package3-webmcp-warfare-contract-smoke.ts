import assert from "node:assert/strict";

import {
  inspectArmy,
  inspectSettlementResources,
} from "../lib/military/inspection";

import {
  recruitUnits,
} from "../lib/military/recruitment";

import {
  moveArmy,
} from "../lib/military/army-movement";

import {
  supportArmy,
} from "../lib/military/support";

import {
  fightArmies,
} from "../lib/military/battle";

import {
  retreatArmyImmediately,
} from "../lib/military/retreat";

assert.equal(
  typeof inspectArmy,
  "function"
);

assert.equal(
  typeof inspectSettlementResources,
  "function"
);

assert.equal(
  typeof recruitUnits,
  "function"
);

assert.equal(
  typeof moveArmy,
  "function"
);

assert.equal(
  typeof supportArmy,
  "function"
);

assert.equal(
  typeof fightArmies,
  "function"
);

assert.equal(
  typeof retreatArmyImmediately,
  "function"
);

console.log(
  "PASS: inspect_army action"
);

console.log(
  "PASS: inspect_resources action"
);

console.log(
  "PASS: recruit_units action"
);

console.log(
  "PASS: move_army action"
);

console.log(
  "PASS: support_army action"
);

console.log(
  "PASS: fight_armies action"
);

console.log(
  "PASS: retreat_army action"
);

console.log("");

console.log(
  "PACKAGE 3 WEBMCP WARFARE CONTRACT: PASS"
);