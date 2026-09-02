import {
  detectArmyContacts,
} from "@/lib/military/contact";

import type {
  SimulationInterrupt,
} from "@/types/simulation";

export function processArmyContactInterrupt():
  SimulationInterrupt | undefined {
  const contacts =
    detectArmyContacts();

  const contact =
    contacts[0];

  if (!contact) {
    return undefined;
  }

  return {
    eventId:
      contact.id,

    type:
      "ARMY_CONTACT",

    message:
      `Enemy armies ${contact.armyAId} and ${contact.armyBId} encountered each other at ${contact.nodeId}.`,
  };
}