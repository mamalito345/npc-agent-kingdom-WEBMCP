"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  getSelectedArmyId,
  selectArmy,
  subscribeArmySelection,
} from "@/lib/ui/army-selection";

import {
  advanceWorldBy,
} from "@/lib/world/simulation";

import {
  getArmySoldierCount,
} from "@/lib/military/army-queries";

import {
  getKingdomStrategicEconomy,
} from "@/lib/economy/strategic-metrics";

import {
  submitBattleOrder,
} from "@/lib/military/battle-orders";

import {
  moveArmy,
} from "@/lib/military/army-movement";

import {
  startBattle,
} from "@/lib/military/battle-state";

import {
  startSiege,
} from "@/lib/military/siege";

import type {
  BattleOrderType,
} from "@/types/military";

const ORDER_LABELS: Record<
  BattleOrderType,
  string
> = {
  hold_position:
    "Hold",

  commit_reserve:
    "Commit Reserve",

  press_attack:
    "Press Attack",

  order_retreat:
    "Retreat",
};

export default function OperationalPanel() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

    const selectedArmyId =
    useSyncExternalStore(
        subscribeArmySelection,
        getSelectedArmyId,
        getSelectedArmyId
    );
  const [
    destinationId,
    setDestinationId,
  ] = useState(
    "riverhold"
  );

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string | null
  >(null);

  const playerCharacter =
    world.characters[
      world.player
        .characterId
    ];

  const kingdomId =
    playerCharacter
      ?.kingdomId;

  const economy =
    useMemo(
      () =>
        kingdomId
          ? getKingdomStrategicEconomy(
              kingdomId
            )
          : null,
      [
        kingdomId,
        world,
      ]
    );

  const ownArmies =
    kingdomId
      ? Object.values(
          world.armies
        ).filter(
          (army) =>
            army.ownerId ===
              kingdomId &&
            army.status !==
              "destroyed"
        )
      : [];

  const enemyArmies =
    kingdomId
      ? Object.values(
          world.armies
        ).filter(
          (army) =>
            army.ownerId !==
              kingdomId &&
            army.status !==
              "destroyed"
        )
      : [];

  const selectedArmy =
    selectedArmyId
      ? world.armies[
          selectedArmyId
        ]
      : undefined;

  const selectedArmyPosition =
    selectedArmyId
      ? world.simulation
          .entityPositions[
            selectedArmyId
          ]
      : undefined;

  const enemiesAtSelectedArmyNode =
    selectedArmyPosition?.kind ===
    "node"
      ? enemyArmies.filter(
          (army) => {
            const position =
              world.simulation
                .entityPositions[
                  army.id
                ];

            return (
              position?.kind ===
                "node" &&
              position.nodeId ===
                selectedArmyPosition.nodeId
            );
          }
        )
      : [];

  const settlementsAtSelectedArmyNode =
    selectedArmyPosition?.kind ===
    "node"
      ? Object.values(
          world.settlements
        ).filter(
          (settlement) =>
            settlement.locationId ===
            selectedArmyPosition.nodeId
        )
      : [];

  const hostileSettlementsAtSelectedArmyNode =
    settlementsAtSelectedArmyNode.filter(
      (settlement) => {
        const controller =
          settlement
            .controllerKingdomId ??
          settlement.kingdomId;

        return (
          selectedArmy &&
          controller !==
            selectedArmy.ownerId
        );
      }
    );

  const activeBattles =
    Object.values(
      world.battles
    ).filter(
      (battle) =>
        battle.status ===
        "active"
    );

  const activeSieges =
    Object.values(
      world.sieges
    ).filter(
      (siege) =>
        siege.status ===
        "active"
    );

    function advanceTime(
    minutes: number
    ) {
    const result =
        advanceWorldBy(
        minutes
        );

    if (
        result.interrupt
    ) {
        setActionMessage(
        `World interrupted at minute ${result.currentTime}: ${result.interrupt.type}`
        );

        return;
    }

    setActionMessage(
        `World advanced to minute ${result.currentTime}.`
    );
    }

  function handleMoveArmy() {
    if (
      !selectedArmyId
    ) {
      setActionMessage(
        "Select an army first."
      );

      return;
    }

    const result =
      moveArmy(
        selectedArmyId,
        destinationId
      );

    if (!result.ok) {
      setActionMessage(
        `Move failed: ${result.error}`
      );

      return;
    }

    setActionMessage(
      `Army moving. ETA minute ${result.estimatedArrivalAt}.`
    );
  }

  function handleStartBattle(
    enemyArmyId: string
  ) {
    if (
      !selectedArmyId
    ) {
      return;
    }

    const result =
      startBattle({
        attackerArmyId:
          selectedArmyId,

        defenderArmyId:
          enemyArmyId,
      });

    if (!result.ok) {
      setActionMessage(
        `Battle failed: ${result.error}`
      );

      return;
    }

    setActionMessage(
      `Battle started: ${result.battle.id}`
    );
  }

  function handleStartSiege(
    settlementId: string
  ) {
    if (
      !selectedArmyId
    ) {
      return;
    }

    const result =
      startSiege({
        armyId:
          selectedArmyId,

        settlementId,
      });

    if (!result.ok) {
      setActionMessage(
        `Siege failed: ${result.error}`
      );

      return;
    }

    setActionMessage(
      `Siege started: ${result.siege.id}`
    );
  }

  function issueOrder(
    battleId: string,
    armyId: string,
    order:
      BattleOrderType
  ) {
    const result =
      submitBattleOrder({
        battleId,

        armyId,

        actorType:
          "player",

        actorId:
          world.player
            .characterId,

        order,
      });

    if (!result.ok) {
      setActionMessage(
        `Order failed: ${result.error}`
      );

      return;
    }

    setActionMessage(
      `Order issued: ${order}`
    );
  }

  return (
    <aside className="fixed bottom-4 left-4 z-[100] max-h-[82vh] w-[420px] overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950/95 p-4 text-sm text-neutral-100 shadow-2xl backdrop-blur">
      <div className="mb-4">
        <div className="text-lg font-bold">
          Operational Command
        </div>
            <section className="mb-4">
            <div className="mb-2 text-xs font-semibold text-neutral-400">
                Advance World
            </div>

            <div className="grid grid-cols-4 gap-2">
                <button
                type="button"
                onClick={() =>
                    advanceTime(
                    60
                    )
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-xs hover:bg-neutral-800"
                >
                +1h
                </button>

                <button
                type="button"
                onClick={() =>
                    advanceTime(
                    360
                    )
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-xs hover:bg-neutral-800"
                >
                +6h
                </button>

                <button
                type="button"
                onClick={() =>
                    advanceTime(
                    720
                    )
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-xs hover:bg-neutral-800"
                >
                +12h
                </button>

                <button
                type="button"
                onClick={() =>
                    advanceTime(
                    1440
                    )
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-xs hover:bg-neutral-800"
                >
                +1d
                </button>
            </div>
            </section>
        <div className="text-xs text-neutral-400">
          Army movement, battles and siege
        </div>
      </div>

      {actionMessage && (
        <div className="mb-4 rounded border border-neutral-700 bg-neutral-900 p-2 text-xs">
          {actionMessage}
        </div>
      )}

      {economy && (
        <section className="mb-5">
          <h3 className="mb-2 font-semibold">
            Strategic Economy
          </h3>

          <div className="grid grid-cols-2 gap-1 text-xs">
            <span>
              Treasury
            </span>

            <span>
              {economy.treasury.toFixed(
                0
              )}
            </span>

            <span>
              Trade/day
            </span>

            <span>
              {economy.dailyTradeIncome.toFixed(
                1
              )}
            </span>

            <span>
              Military/day
            </span>

            <span>
              {economy.dailyMilitaryGoldCost.toFixed(
                1
              )}
            </span>

            <span>
              Mobilization
            </span>

            <span className="uppercase">
              {
                economy.mobilizationLevel
              }
            </span>
          </div>
        </section>
      )}

      <section className="mb-5">
        <h3 className="mb-2 font-semibold">
          Your Armies
        </h3>

        {ownArmies.length ===
        0 ? (
          <div className="rounded border border-neutral-800 p-3 text-xs text-neutral-500">
            No armies currently exist for your kingdom.
          </div>
        ) : (
          <div className="space-y-2">
            {ownArmies.map(
              (army) => {
                const position =
                  world.simulation
                    .entityPositions[
                      army.id
                    ];

                const selected =
                  selectedArmyId ===
                  army.id;

                return (
                  <button
                    key={
                      army.id
                    }
                    type="button"
                    onClick={() =>
                    selectArmy(
                        army.id
                    )
                    }
                    className={`w-full rounded border p-3 text-left ${
                      selected
                        ? "border-yellow-400 bg-yellow-950/20"
                        : "border-neutral-800 bg-neutral-900"
                    }`}
                  >
                    <div className="font-semibold">
                      {army.id}
                    </div>

                    <div className="text-xs text-neutral-400">
                      {
                        getArmySoldierCount(
                          army.id
                        )
                      }{" "}
                      soldiers
                    </div>

                    <div className="text-xs text-neutral-500">
                      Status:{" "}
                      {
                        army.status
                      }
                    </div>

                    <div className="text-xs text-neutral-500">
                      Position:{" "}
                      {position?.kind ===
                      "node"
                        ? position.nodeId
                        : position?.kind ===
                            "edge"
                          ? `${position.edgeId} ${(position.progress * 100).toFixed(0)}%`
                          : "unknown"}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>

      {selectedArmy && (
        <section className="mb-5 rounded border border-blue-900 bg-blue-950/20 p-3">
          <h3 className="mb-3 font-semibold text-blue-300">
            Selected Army
          </h3>

          <div className="mb-3 text-xs">
            {
              selectedArmy.id
            }
          </div>

          <label className="mb-1 block text-xs text-neutral-400">
            Destination
          </label>

          <select
            value={
              destinationId
            }
            onChange={(
              event
            ) =>
              setDestinationId(
                event.target
                  .value
              )
            }
            className="mb-2 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm"
          >
            {Object.values(
              world.locations
            ).map(
              (location) => (
                <option
                  key={
                    location.id
                  }
                  value={
                    location.id
                  }
                >
                  {
                    location.name
                  }
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={
              handleMoveArmy
            }
            disabled={
              selectedArmy.status ===
                "battle" ||
              selectedArmy.status ===
                "siege"
            }
            className="w-full rounded bg-blue-700 px-3 py-2 font-semibold hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Move Army
          </button>

          {enemiesAtSelectedArmyNode.length >
            0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-red-300">
                Enemy armies here
              </div>

              <div className="space-y-2">
                {enemiesAtSelectedArmyNode.map(
                  (enemy) => (
                    <button
                      key={
                        enemy.id
                      }
                      type="button"
                      onClick={() =>
                        handleStartBattle(
                          enemy.id
                        )
                      }
                      className="w-full rounded border border-red-800 bg-red-950/30 px-3 py-2 text-left hover:bg-red-900/40"
                    >
                      <div>
                        {
                          enemy.id
                        }
                      </div>

                      <div className="text-xs text-neutral-400">
                        {
                          getArmySoldierCount(
                            enemy.id
                          )
                        }{" "}
                        soldiers
                      </div>

                      <div className="mt-1 text-xs font-semibold text-red-300">
                        Start Battle
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {hostileSettlementsAtSelectedArmyNode.length >
            0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-orange-300">
                Enemy fortified settlement
              </div>

              {hostileSettlementsAtSelectedArmyNode.map(
                (
                  settlement
                ) => (
                  <button
                    key={
                      settlement.id
                    }
                    type="button"
                    onClick={() =>
                      handleStartSiege(
                        settlement.id
                      )
                    }
                    className="w-full rounded border border-orange-800 bg-orange-950/30 px-3 py-2 text-left hover:bg-orange-900/40"
                  >
                    <div>
                      {
                        settlement.name
                      }
                    </div>

                    <div className="text-xs text-neutral-400">
                      Fort L
                      {settlement
                        .fortificationLevel ??
                        0}
                      {" · "}
                      Integrity{" "}
                      {settlement
                        .fortificationIntegrity ??
                        0}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-orange-300">
                      Start Siege
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </section>
      )}

      <section className="mb-5">
        <h3 className="mb-2 font-semibold">
          Active Battles (
          {activeBattles.length})
        </h3>

        {activeBattles.length ===
        0 ? (
          <div className="text-xs text-neutral-500">
            No active battles.
          </div>
        ) : (
          <div className="space-y-3">
            {activeBattles.map(
              (battle) => (
                <div
                  key={
                    battle.id
                  }
                  className="rounded border border-red-900 bg-red-950/20 p-3"
                >
                  <div className="font-semibold">
                    {
                      battle.nodeId
                    }
                  </div>

                  <div className="text-xs uppercase text-red-300">
                    {
                      battle.currentPhase
                    }
                  </div>

                  <div className="mt-1 text-xs">
                    {
                      battle
                        .attackerArmyIds
                        .join(", ")
                    }
                  </div>

                  <div className="text-xs">
                    vs
                  </div>

                  <div className="text-xs">
                    {
                      battle
                        .defenderArmyIds
                        .join(", ")
                    }
                  </div>

                  {battle.pendingDecision && (
                    <div className="mt-3 rounded border border-yellow-700 p-2">
                      <div className="mb-2 text-xs font-semibold text-yellow-300">
                        Battle decision required
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {battle
                          .pendingDecision
                          .availableOrders
                          .map(
                            (
                              order
                            ) => (
                              <button
                                key={
                                  order
                                }
                                type="button"
                                onClick={() =>
                                  issueOrder(
                                    battle.id,
                                    battle
                                      .pendingDecision!
                                      .armyId,
                                    order
                                  )
                                }
                                className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs"
                              >
                                {
                                  ORDER_LABELS[
                                    order
                                  ]
                                }
                              </button>
                            )
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold">
          Active Sieges (
          {activeSieges.length})
        </h3>

        {activeSieges.length ===
        0 ? (
          <div className="text-xs text-neutral-500">
            No active sieges.
          </div>
        ) : (
          activeSieges.map(
            (siege) => (
              <div
                key={
                  siege.id
                }
                className="mb-2 rounded border border-orange-900 bg-orange-950/20 p-2"
              >
                <div className="font-semibold">
                  {
                    siege.settlementId
                  }
                </div>

                <div className="text-xs uppercase text-orange-300">
                  {
                    siege.currentPhase
                  }
                </div>
              </div>
            )
          )
        )}
      </section>
    </aside>
  );
}