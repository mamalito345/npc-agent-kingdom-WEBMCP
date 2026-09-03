import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  ResourceStockpile,
} from "@/types/resources";

const ZERO: ResourceStockpile = {
  food: 0,
  gold: 0,
  wood: 0,
  stone: 0,
  metal: 0,
};

export function getReservedResources(
  settlementId: string
): ResourceStockpile {
  const world =
    getRuntimeWorldState();

  return (
    world
      .settlementResourceReservations[
        settlementId
      ] ?? ZERO
  );
}

export function subtractResources(
  total: ResourceStockpile,
  amount: ResourceStockpile
): ResourceStockpile {
  return {
    food:
      total.food -
      amount.food,

    gold:
      total.gold -
      amount.gold,

    wood:
      total.wood -
      amount.wood,

    stone:
      total.stone -
      amount.stone,

    metal:
      total.metal -
      amount.metal,
  };
}

export function addResourceAmounts(
  left: ResourceStockpile,
  right: ResourceStockpile
): ResourceStockpile {
  return {
    food:
      left.food +
      right.food,

    gold:
      left.gold +
      right.gold,

    wood:
      left.wood +
      right.wood,

    stone:
      left.stone +
      right.stone,

    metal:
      left.metal +
      right.metal,
  };
}

export function multiplyResources(
  resources:
    ResourceStockpile,
  multiplier: number
): ResourceStockpile {
  return {
    food:
      resources.food *
      multiplier,

    gold:
      resources.gold *
      multiplier,

    wood:
      resources.wood *
      multiplier,

    stone:
      resources.stone *
      multiplier,

    metal:
      resources.metal *
      multiplier,
  };
}

export function hasEnoughResources(
  available:
    ResourceStockpile,
  required:
    ResourceStockpile
): boolean {
  return (
    available.food >=
      required.food &&
    available.gold >=
      required.gold &&
    available.wood >=
      required.wood &&
    available.stone >=
      required.stone &&
    available.metal >=
      required.metal
  );
}

export function getAvailableSettlementResources(
  settlementId: string
): ResourceStockpile | undefined {
  const world =
    getRuntimeWorldState();

  const settlement =
    world.settlements[
      settlementId
    ];

  if (!settlement) {
    return undefined;
  }

  const reserved =
    world
      .settlementResourceReservations[
        settlementId
      ] ?? ZERO;

  return subtractResources(
    settlement.resources,
    reserved
  );
}

export function reserveSettlementResources(
  settlementId: string,
  amount: ResourceStockpile
): boolean {
  const available =
    getAvailableSettlementResources(
      settlementId
    );

  if (
    !available ||
    !hasEnoughResources(
      available,
      amount
    )
  ) {
    return false;
  }

  updateRuntimeWorldState(
    (current) => {
      const currentReserved =
        current
          .settlementResourceReservations[
            settlementId
          ] ?? ZERO;

      return {
        ...current,

        settlementResourceReservations:
          {
            ...current
              .settlementResourceReservations,

            [settlementId]:
              addResourceAmounts(
                currentReserved,
                amount
              ),
          },
      };
    }
  );

  return true;
}

export function releaseSettlementReservation(
  settlementId: string,
  amount: ResourceStockpile
): void {
  updateRuntimeWorldState(
    (current) => {
      const currentReserved =
        current
          .settlementResourceReservations[
            settlementId
          ] ?? ZERO;

      const next =
        subtractResources(
          currentReserved,
          amount
        );

      if (
        next.food < 0 ||
        next.gold < 0 ||
        next.wood < 0 ||
        next.stone < 0 ||
        next.metal < 0
      ) {
        throw new Error(
          `Reservation underflow at settlement ${settlementId}.`
        );
      }

      return {
        ...current,

        settlementResourceReservations:
          {
            ...current
              .settlementResourceReservations,

            [settlementId]:
              next,
          },
      };
    }
  );
}

export function consumeSettlementReservation(
  settlementId: string,
  amount: ResourceStockpile
): void {
  updateRuntimeWorldState(
    (current) => {
      const settlement =
        current.settlements[
          settlementId
        ];

      if (!settlement) {
        throw new Error(
          `Settlement not found: ${settlementId}`
        );
      }

      const currentReserved =
        current
          .settlementResourceReservations[
            settlementId
          ] ?? ZERO;

      if (
        !hasEnoughResources(
          currentReserved,
          amount
        )
      ) {
        throw new Error(
          `Reservation invariant broken at ${settlementId}.`
        );
      }

      if (
        !hasEnoughResources(
          settlement.resources,
          amount
        )
      ) {
        throw new Error(
          `Physical resource invariant broken at ${settlementId}.`
        );
      }

      const nextResources =
        subtractResources(
          settlement.resources,
          amount
        );

      const nextReserved =
        subtractResources(
          currentReserved,
          amount
        );

      return {
        ...current,

        settlements: {
          ...current.settlements,

          [settlementId]: {
            ...settlement,

            resources:
              nextResources,
          },
        },

        settlementResourceReservations:
          {
            ...current
              .settlementResourceReservations,

            [settlementId]:
              nextReserved,
          },
      };
    }
  );
}