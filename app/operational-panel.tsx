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
  getArmySoldierCount,
} from "@/lib/military/army-queries";

import {
  getKingdomStrategicEconomy,
} from "@/lib/economy/strategic-metrics";

import {
  submitBattleOrder,
} from "@/lib/military/battle-orders";

import {
  setBattleTactic,
} from "@/lib/military/battle-tactic-orders";

import {
  moveArmy,
} from "@/lib/military/army-movement";

import {
  startBattle,
} from "@/lib/military/battle-state";

import {
  startSiege,
} from "@/lib/military/siege";

import {
  getPlayerControlledArmyId,
  isPlayerPresentAtBattle,
} from "@/lib/military/player-presence";

import type {
  BattleOrderType,
  BattleTactic,
  PersistentBattle,
} from "@/types/military";

const ORDER_LABELS:
  Record<
    BattleOrderType,
    string
  > = {
  hold_position:
    "Hold Position",

  commit_reserve:
    "Commit Reserve",

  press_attack:
    "Press Attack",

  order_retreat:
    "Retreat",
};

const TACTIC_LABELS:
  Record<
    BattleTactic,
    string
  > = {
  hold_ground:
    "Hold Ground",

  aggressive_push:
    "Aggressive Push",

  shield_wall:
    "Shield Wall",

  cavalry_flank:
    "Cavalry Flank",

  commit_reserve:
    "Commit Reserve",

  counterattack:
    "Counterattack",

  seize_high_ground:
    "Seize High Ground",

  orderly_retreat:
    "Orderly Retreat",

  desperate_assault:
    "Desperate Assault",
};

const NORMAL_TACTICS:
  BattleTactic[] = [
  "hold_ground",
  "aggressive_push",
  "shield_wall",
  "cavalry_flank",
  "counterattack",
  "seize_high_ground",
  "orderly_retreat",
  "desperate_assault",
];

function momentumPercent(
  momentum:
    number
): number {
  return Math.max(
    0,
    Math.min(
      100,
      (
        momentum +
        100
      ) /
        2
    )
  );
}

function getSideSoldiers(
  battle:
    PersistentBattle,
  side:
    "attacker" |
    "defender"
): number {
  const world =
    getWorldState();

  const ids =
    side ===
    "attacker"
      ? battle
          .attackerArmyIds
      : battle
          .defenderArmyIds;

  return ids.reduce(
    (
      total,
      armyId
    ) => {
      const army =
        world.armies[
          armyId
        ];

      if (!army) {
        return total;
      }

      return (
        total +
        getArmySoldierCount(
          armyId
        )
      );
    },
    0
  );
}

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
  ] =
    useState(
      "riverhold"
    );

  const [
    actionMessage,
    setActionMessage,
  ] =
    useState<
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
      ? world
          .simulation
          .entityPositions[
            selectedArmyId
          ]
      : undefined;

  const enemiesAtSelectedArmyNode =
    selectedArmyPosition
      ?.kind ===
    "node"
      ? enemyArmies.filter(
          (army) => {
            const position =
              world
                .simulation
                .entityPositions[
                  army.id
                ];

            return (
              position
                ?.kind ===
                "node" &&
              position.nodeId ===
                selectedArmyPosition
                  .nodeId
            );
          }
        )
      : [];

  const settlementsAtSelectedArmyNode =
    selectedArmyPosition
      ?.kind ===
    "node"
      ? Object.values(
          world.settlements
        ).filter(
          (settlement) =>
            settlement
              .locationId ===
            selectedArmyPosition
              .nodeId
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
          selectedArmy !==
            undefined &&
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
    enemyArmyId:
      string
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
    settlementId:
      string
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
    battleId:
      string,
    armyId:
      string,
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
      `Battle order: ${ORDER_LABELS[order]}`
    );
  }

  function changeTactic(
    battleId:
      string,
    armyId:
      string,
    tactic:
      BattleTactic
  ) {
    const result =
      setBattleTactic({
        battleId,

        armyId,

        tactic,
      });

    if (!result.ok) {
      setActionMessage(
        result.reason
          ? `Tactic failed: ${result.reason}`
          : `Tactic failed: ${result.error}`
      );

      return;
    }

    setActionMessage(
      `Tactic changed to ${TACTIC_LABELS[tactic]}.`
    );
  }

  return (
    <aside className="fixed bottom-4 left-4 z-[100] max-h-[82vh] w-[430px] overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950/95 p-4 text-sm text-neutral-100 shadow-2xl backdrop-blur">
      <div className="mb-4">
        <div className="text-lg font-bold">
          Operational Command
        </div>

        <div className="text-xs text-neutral-400">
          Army movement, battle tactics and sieges
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
            No armies.
          </div>
        ) : (
          <div className="space-y-2">
            {ownArmies.map(
              (army) => {
                const position =
                  world
                    .simulation
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
                      {
                        army.id
                      }
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
                      {position
                        ?.kind ===
                      "node"
                        ? position.nodeId
                        : position
                              ?.kind ===
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
              (
                location
              ) => (
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
                  (
                    enemy
                  ) => (
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
                    className="mb-2 w-full rounded border border-orange-800 bg-orange-950/30 px-3 py-2 text-left hover:bg-orange-900/40"
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
          {
            activeBattles.length
          }
          )
        </h3>

        {activeBattles.length ===
        0 ? (
          <div className="text-xs text-neutral-500">
            No active battles.
          </div>
        ) : (
          <div className="space-y-4">
            {activeBattles.map(
              (
                battle
              ) => {
                const playerPresent =
                  isPlayerPresentAtBattle(
                    battle
                  );

                const playerArmyId =
                  playerPresent
                    ? getPlayerControlledArmyId(
                        battle
                      )
                    : undefined;

                const playerAttacker =
                  playerArmyId
                    ? battle
                        .attackerArmyIds
                        .includes(
                          playerArmyId
                        )
                    : false;

                const playerTactic =
                  playerArmyId
                    ? playerAttacker
                      ? battle
                          .attackerTactic
                      : battle
                          .defenderTactic
                    : undefined;

                const attackerSoldiers =
                  getSideSoldiers(
                    battle,
                    "attacker"
                  );

                const defenderSoldiers =
                  getSideSoldiers(
                    battle,
                    "defender"
                  );

                const pending =
                  battle
                    .pendingDecision;

                const playerDecision =
                  pending !==
                    undefined &&
                  playerArmyId ===
                    pending.armyId;

                const lastRound =
                  battle.lastRound;

                return (
                  <div
                    key={
                      battle.id
                    }
                    className="rounded border border-red-900 bg-red-950/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {
                            world.locations[
                              battle.nodeId
                            ]?.name ??
                            battle.nodeId
                          }
                        </div>

                        <div className="text-[10px] text-neutral-500">
                          {
                            battle.id
                          }
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-red-300">
                          Hour{" "}
                          {
                            battle.battleHour
                          }
                        </div>

                        <div className="text-[10px] uppercase text-neutral-400">
                          {
                            battle.currentPhase
                          }
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded bg-black/30 p-2">
                      <div className="grid grid-cols-3 text-center text-xs">
                        <div>
                          <div className="font-bold text-red-300">
                            ATTACK
                          </div>

                          <div>
                            {
                              attackerSoldiers
                            }
                          </div>

                          <div className="text-[10px] text-neutral-400">
                            {
                              TACTIC_LABELS[
                                battle
                                  .attackerTactic
                              ]
                            }
                          </div>
                        </div>

                        <div className="text-neutral-500">
                          VS
                        </div>

                        <div>
                          <div className="font-bold text-blue-300">
                            DEFEND
                          </div>

                          <div>
                            {
                              defenderSoldiers
                            }
                          </div>

                          <div className="text-[10px] text-neutral-400">
                            {
                              TACTIC_LABELS[
                                battle
                                  .defenderTactic
                              ]
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs">
                      <div className="mb-1 flex justify-between">
                        <span>
                          Defender
                        </span>

                        <span className="font-semibold">
                          Front Momentum{" "}
                          {
                            battle.frontMomentum
                          }
                        </span>

                        <span>
                          Attacker
                        </span>
                      </div>

                      <div className="relative h-3 overflow-hidden rounded bg-neutral-800">
                        <div
                          className="absolute bottom-0 left-0 top-0 bg-red-700 transition-all duration-500"
                          style={{
                            width:
                              `${momentumPercent(
                                battle.frontMomentum
                              )}%`,
                          }}
                        />

                        <div className="absolute bottom-0 left-1/2 top-0 w-px bg-white/70" />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-neutral-900 p-2">
                        <div className="text-neutral-400">
                          Attacker morale pressure
                        </div>

                        <div className="text-lg font-bold">
                          {battle
                            .attackerMoralePressure
                            .toFixed(
                              1
                            )}
                        </div>
                      </div>

                      <div className="rounded bg-neutral-900 p-2">
                        <div className="text-neutral-400">
                          Defender morale pressure
                        </div>

                        <div className="text-lg font-bold">
                          {battle
                            .defenderMoralePressure
                            .toFixed(
                              1
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-neutral-400">
                      Terrain:{" "}
                      <span className="text-neutral-100">
                        {
                          battle.terrain
                        }
                      </span>

                      {battle.features.length >
                        0 && (
                        <>
                          {" · "}
                          {battle.features.join(
                            ", "
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-2 text-xs">
                      Reserve:
                      {" A="}
                      {battle
                        .attackerReserveCommitted
                        ? "COMMITTED"
                        : "HELD"}
                      {" · D="}
                      {battle
                        .defenderReserveCommitted
                        ? "COMMITTED"
                        : "HELD"}
                    </div>

                    {lastRound && (
                      <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/70 p-2 text-xs">
                        <div className="font-semibold">
                          Last hour
                        </div>

                        <div className="mt-1">
                          Attacker lost{" "}
                          <strong>
                            {
                              lastRound
                                .attacker
                                .soldiersLost
                            }
                          </strong>
                          {" · "}
                          Defender lost{" "}
                          <strong>
                            {
                              lastRound
                                .defender
                                .soldiersLost
                            }
                          </strong>
                        </div>

                        <div className="mt-1 text-[10px] text-neutral-500">
                          {
                            lastRound.summary
                          }
                        </div>
                      </div>
                    )}

                    {!playerPresent && (
                      <div className="mt-3 rounded border border-neutral-800 bg-neutral-900 p-2 text-xs text-neutral-400">
                        Player is not physically present at this battlefield. Local commanders control tactical decisions.
                      </div>
                    )}

                    {playerArmyId &&
                      playerPresent &&
                      !playerDecision && (
                        <div className="mt-4">
                          <div className="mb-2 text-xs font-semibold text-yellow-300">
                            Tactical Posture
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {NORMAL_TACTICS.map(
                              (
                                tactic
                              ) => (
                                <button
                                  key={
                                    tactic
                                  }
                                  type="button"
                                  onClick={() =>
                                    changeTactic(
                                      battle.id,
                                      playerArmyId,
                                      tactic
                                    )
                                  }
                                  className={`rounded border px-2 py-2 text-xs ${
                                    playerTactic ===
                                    tactic
                                      ? "border-yellow-300 bg-yellow-950/40 text-yellow-200"
                                      : "border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                                  }`}
                                >
                                  {
                                    TACTIC_LABELS[
                                      tactic
                                    ]
                                  }
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {playerDecision &&
                      pending && (
                        <div className="mt-4 rounded border border-yellow-600 bg-yellow-950/20 p-3">
                          <div className="mb-2 font-semibold text-yellow-300">
                            ⚠ Battle Crisis
                          </div>

                          <div className="mb-3 text-xs text-neutral-300">
                            Immediate operational decision required before time may continue.
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {pending
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
                                        pending.armyId,
                                        order
                                      )
                                    }
                                    className="rounded border border-yellow-700 bg-neutral-900 px-2 py-2 text-xs hover:bg-yellow-950/40"
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

                    <div className="mt-4 border-t border-neutral-800 pt-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase text-neutral-500">
                        Battle Log
                      </div>

                      <div className="space-y-1">
                        {battle.history
                          .slice(
                            -4
                          )
                          .reverse()
                          .map(
                            (
                              entry
                            ) => (
                              <div
                                key={
                                  entry.id
                                }
                                className="text-[10px] text-neutral-400"
                              >
                                {
                                  entry.summary
                                }
                              </div>
                            )
                          )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold">
          Active Sieges (
          {
            activeSieges.length
          }
          )
        </h3>

        {activeSieges.length ===
        0 ? (
          <div className="text-xs text-neutral-500">
            No active sieges.
          </div>
        ) : (
          activeSieges.map(
            (
              siege
            ) => (
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