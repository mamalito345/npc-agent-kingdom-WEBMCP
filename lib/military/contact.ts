import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  ArmyContact,
} from "@/types/military";

function contactAlreadyExists(
  armyAId: string,
  armyBId: string,
  nodeId: string
): boolean {
  const world =
    getRuntimeWorldState();

  return Object.values(
    world.armyContacts
  ).some(
    (contact) =>
      contact.status ===
        "pending" &&
      contact.nodeId ===
        nodeId &&
      (
        (
          contact.armyAId ===
            armyAId &&
          contact.armyBId ===
            armyBId
        ) ||
        (
          contact.armyAId ===
            armyBId &&
          contact.armyBId ===
            armyAId
        )
      )
  );
}

export function detectArmyContacts():
  ArmyContact[] {
  const world =
    getRuntimeWorldState();

  const armies =
    Object.values(
      world.armies
    )
      .filter(
        (army) =>
          army.status !==
          "destroyed"
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id
          )
      );

  const created:
    ArmyContact[] = [];

  for (
    let leftIndex = 0;
    leftIndex <
    armies.length;
    leftIndex += 1
  ) {
    for (
      let rightIndex =
        leftIndex + 1;
      rightIndex <
      armies.length;
      rightIndex += 1
    ) {
      const left =
        armies[
          leftIndex
        ];

      const right =
        armies[
          rightIndex
        ];

      if (
        left.ownerId ===
        right.ownerId
      ) {
        continue;
      }

      const leftPosition =
        world.simulation
          .entityPositions[
            left.id
          ];

      const rightPosition =
        world.simulation
          .entityPositions[
            right.id
          ];

      if (
        !leftPosition ||
        !rightPosition ||
        leftPosition.kind !==
          "node" ||
        rightPosition.kind !==
          "node"
      ) {
        continue;
      }

      if (
        leftPosition.nodeId !==
        rightPosition.nodeId
      ) {
        continue;
      }

      if (
        contactAlreadyExists(
          left.id,
          right.id,
          leftPosition.nodeId
        )
      ) {
        continue;
      }

      const sequence =
        allocateSimulationSequence();

      const contact:
        ArmyContact = {
        id:
          `army-contact-${sequence
            .toString()
            .padStart(
              6,
              "0"
            )}`,

        armyAId:
          left.id,

        armyBId:
          right.id,

        nodeId:
          leftPosition
            .nodeId,

        detectedAt:
          getRuntimeWorldState()
            .simulation
            .worldTimeMinutes,

        status:
          "pending",
      };

      updateRuntimeWorldState(
        (current) => ({
          ...current,

          armyContacts: {
            ...current
              .armyContacts,

            [contact.id]:
              contact,
          },
        })
      );

      created.push(
        contact
      );
    }
  }

  return created;
}