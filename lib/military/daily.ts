import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmyDailyCosts,
} from "@/lib/military/army-queries";

import {
  getFundingStateForUnpaidDays,
} from "@/lib/military/funding";

import {
  getSupplyStateForDays,
} from "@/lib/military/supply";

export function processDailyMilitaryEconomy():
  void {
  const snapshot =
    getRuntimeWorldState();

  const armyIds =
    Object.keys(
      snapshot.armies
    ).sort();

  for (
    const armyId
    of armyIds
  ) {
    const current =
      getRuntimeWorldState();

    const army =
      current.armies[
        armyId
      ];

    if (
      !army ||
      army.status ===
        "destroyed"
    ) {
      continue;
    }

    const kingdom =
      current.kingdoms[
        army.ownerId
      ];

    if (!kingdom) {
      throw new Error(
        `Army ${armyId} references unknown kingdom ${army.ownerId}.`
      );
    }

    const upkeep =
      getArmyDailyCosts(
        armyId
      );

    const availableGold =
      kingdom.treasury;

    const paidGold =
      Math.min(
        availableGold,
        upkeep.gold
      );

    const fullyPaid =
      paidGold >=
      upkeep.gold;

    const unpaidDays =
      fullyPaid
        ? 0
        : army.funding
            .unpaidDays +
          1;

    const availableFood =
      army.supply
        .foodSupply;

    const consumedFood =
      Math.min(
        availableFood,
        upkeep.food
      );

    const remainingFood =
      Math.max(
        0,
        availableFood -
          consumedFood
      );

    const supplyDays =
      upkeep.food <= 0
        ? Number.POSITIVE_INFINITY
        : remainingFood /
          upkeep.food;

    updateRuntimeWorldState(
      (state) => {
        const latestArmy =
          state.armies[
            armyId
          ];

        const latestKingdom =
          state.kingdoms[
            army.ownerId
          ];

        return {
          ...state,

          kingdoms: {
            ...state.kingdoms,

            [army.ownerId]: {
              ...latestKingdom,

              treasury:
                Math.max(
                  0,
                  latestKingdom
                    .treasury -
                    paidGold
                ),
            },
          },

          armies: {
            ...state.armies,

            [armyId]: {
              ...latestArmy,

              funding: {
                unpaidDays,

                state:
                  getFundingStateForUnpaidDays(
                    unpaidDays
                  ),
              },

              supply: {
                foodSupply:
                  remainingFood,

                state:
                  getSupplyStateForDays(
                    supplyDays
                  ),
              },
            },
          },
        };
      }
    );
  }
}