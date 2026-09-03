import assert from "node:assert/strict";

import {
  getRuntimeWorldState,
} from "../lib/world/runtime";

const world =
  getRuntimeWorldState();

const kingdoms =
  Object.values(world.kingdoms);

assert.equal(
  kingdoms.length,
  5,
  "Demo world must contain exactly five kingdoms."
);

for (const kingdom of kingdoms) {
  assert.ok(
    world.characters[
      kingdom.rulerId
    ],
    `Missing ruler ${kingdom.rulerId}`
  );

  for (
    const lordId of kingdom.lordIds
  ) {
    assert.ok(
      world.characters[lordId],
      `Missing lord ${lordId}`
    );
  }

  for (
    const settlementId of
      kingdom.settlementIds
  ) {
    const settlement =
      world.settlements[
        settlementId
      ];

    assert.ok(
      settlement,
      `Missing settlement ${settlementId}`
    );

    assert.equal(
      settlement.kingdomId,
      kingdom.id,
      `Settlement ${settlementId} has wrong kingdom`
    );

    assert.ok(
      world.locations[
        settlement.locationId
      ],
      `Settlement ${settlementId} references missing location`
    );
  }
}

for (
  const settlement of
    Object.values(
      world.settlements
    )
) {
  assert.ok(
    world.kingdoms[
      settlement.kingdomId
    ],
    `Invalid settlement kingdom: ${settlement.id}`
  );

  assert.ok(
    world.locations[
      settlement.locationId
    ],
    `Invalid settlement location: ${settlement.id}`
  );

  if (settlement.ownerId) {
    assert.ok(
      world.characters[
        settlement.ownerId
      ],
      `Invalid owner ${settlement.ownerId}`
    );
  }
}

const politicalCharacters =
  Object.values(
    world.characters
  );

assert.equal(
  politicalCharacters.length,
  15
);

assert.equal(
  Object.keys(
    world.settlements
  ).length,
  21
);

console.log(
  "PASS: exactly five kingdoms"
);

console.log(
  "PASS: all rulers exist"
);

console.log(
  "PASS: all lords exist"
);

console.log(
  "PASS: settlement kingdom references"
);

console.log(
  "PASS: settlement location references"
);

console.log(
  "PASS: settlement owner references"
);

console.log(
  `PASS: ${politicalCharacters.length} major characters`
);

console.log(
  `PASS: ${
    Object.keys(
      world.settlements
    ).length
  } settlements`
);

console.log("");
console.log(
  "PACKAGE 2 WORLD DATA: PASS"
);