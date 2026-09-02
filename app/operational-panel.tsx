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
  getMapInteractionState,
  clearMapDestination,
  selectMapArmy,
  selectMapSettlement,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  buildArmyRoutePreview,
  formatDuration,
} from "@/lib/map/route-preview";

import {
  getArmySoldierCount,
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  getRealmControlLabel,
} from "@/lib/demo/realm-control";

import {
  issuePlayerArmyMove,
} from "@/lib/session/player-actions";

import {
  forcePlayerArmyBorderMove,
} from "@/lib/session/border-player-actions";

function unitCount(
  armyId: string,
  type:
    "infantry" |
    "cavalry" |
    "siege"
): number {
  return getArmyUnits(
    armyId
  )
    .filter(
      (unit) =>
        unit.type ===
        type
    )
    .reduce(
      (total, unit) =>
        total +
        unit.currentSoldiers,
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

  const interaction =
    useSyncExternalStore(
      subscribeMapInteraction,
      getMapInteractionState,
      getMapInteractionState
    );

  const [message, setMessage] =
    useState<string | null>(
      null
    );

  const [borderConfirm, setBorderConfirm] =
    useState(false);

  const playerId =
    world.session
      .localPlayerId;

  const player =
    world.session.players[
      playerId
    ];

  const selectedArmy =
    interaction.selectedArmyId
      ? world.armies[
          interaction
            .selectedArmyId
        ]
      : undefined;

  const selectedSettlement =
    interaction
      .selectedSettlementId
      ? world.settlements[
          interaction
            .selectedSettlementId
        ]
      : undefined;

  const destinationSettlement =
    interaction
      .destinationSettlementId
      ? world.settlements[
          interaction
            .destinationSettlementId
        ]
      : undefined;

  const routePreview =
    selectedArmy &&
    destinationSettlement
      ? buildArmyRoutePreview(
          selectedArmy.id,
          destinationSettlement
            .locationId
        )
      : null;

  const isIndependentLordArmy =
    selectedArmy
      ? Object.values(
          world.session.lords
            .profiles
        ).some(
          (profile) =>
            profile
              .controlledArmyIds
              .includes(
                selectedArmy.id
              )
        )
      : false;

  const canPlayerOrderSelectedArmy =
    Boolean(
      selectedArmy &&
      player &&
      selectedArmy.ownerId ===
        player.kingdomId &&
      !isIndependentLordArmy
    );

  const armyMovement =
    selectedArmy
      ? world.simulation
          .activeMovements[
            selectedArmy.id
          ]
      : undefined;

  const lordProfile =
    selectedArmy
      ? Object.values(
          world.session.lords
            .profiles
        ).find(
          (profile) =>
            profile
              .controlledArmyIds
              .includes(
                selectedArmy.id
              )
        )
      : undefined;

  const commander =
    selectedArmy
      ?.commanderId
      ? world.characters[
          selectedArmy
            .commanderId
        ]
      : undefined;

  const armyPresenceContext =
    selectedArmy
      ? Object.values(
          world.session
            .presenceContexts
        ).find(
          (context) =>
            context.active &&
            context.kind ===
              "army" &&
            context.referenceId ===
              selectedArmy.id
        )
      : undefined;

  const charactersInArmy =
    armyPresenceContext
      ? armyPresenceContext
          .characterIds
          .map(
            (characterId) =>
              world.characters[
                characterId
              ]
          )
          .filter(Boolean)
      : commander
        ? [commander]
        : [];

  const controlLabel =
    selectedArmy
      ? isIndependentLordArmy
        ? "GM CHARACTER · LORD"
        : getRealmControlLabel(
            selectedArmy.ownerId
          )
      : undefined;

  const soldierCount =
    selectedArmy
      ? getArmySoldierCount(
          selectedArmy.id
        )
      : 0;

  const sizeLabel =
    soldierCount >= 5000
      ? "GREAT HOST"
      : soldierCount >= 2500
        ? "FIELD ARMY"
        : soldierCount >= 1000
          ? "HOST"
          : soldierCount >= 500
            ? "HOUSEHOLD FORCE"
            : "DETACHMENT";

  const settlementLord =
    selectedSettlement
      ? Object.values(
          world.session.lords
            .profiles
        ).find(
          (profile) =>
            profile
              .controlledSettlementIds
              .includes(
                selectedSettlement.id
              )
        )
      : undefined;

  const settlementLordCharacter =
    settlementLord
      ? world.characters[
          settlementLord
            .characterId
        ]
      : undefined;

  const selectedSettlementName =
    selectedSettlement
      ? world.locations[
          selectedSettlement
            .locationId
        ]?.name ??
        selectedSettlement.id
      : undefined;

  const armyPower =
    useMemo(
      () => {
        if (!selectedArmy) {
          return 0;
        }

        return Math.round(
          unitCount(
            selectedArmy.id,
            "infantry"
          ) *
            1 +
            unitCount(
              selectedArmy.id,
              "cavalry"
            ) *
              1.4 +
            unitCount(
              selectedArmy.id,
              "siege"
            ) *
              55
        );
      },
      [
        selectedArmy,
      ]
    );

  function closeInspector(): void {
    clearMapDestination();
    selectMapArmy(null);
    selectMapSettlement(null);
    setBorderConfirm(false);
    setMessage(null);
  }

  if (
    !selectedArmy &&
    !selectedSettlement
  ) {
    return null;
  }

  function confirmMove(
    forceBorder:
      boolean
  ): void {
    if (
      !selectedArmy ||
      !destinationSettlement
    ) {
      return;
    }

    const result =
      forceBorder
        ? forcePlayerArmyBorderMove(
            world.session.id,
            playerId,
            selectedArmy.id,
            destinationSettlement
              .locationId
          )
        : issuePlayerArmyMove(
            world.session.id,
            playerId,
            selectedArmy.id,
            destinationSettlement
              .locationId
          );

    if (!result.ok) {
      if (
        result.error ===
        "BORDER_ACCESS_REQUIRED"
      ) {
        setBorderConfirm(
          true
        );

        setMessage(
          `Military access is not granted. Entering ${result.border?.toKingdomId ?? "foreign territory"} will create a border violation when the army physically crosses.`
        );

        return;
      }

      setMessage(
        `ACTION REJECTED — ${result.error}`
      );

      return;
    }

    setBorderConfirm(
      false
    );

    setMessage(
      `ORDER CREATED — ${selectedArmy.id} → ${destinationSettlement.locationId}`
    );

    clearMapDestination();
  }

  return (
    <aside className="fixed bottom-4 right-4 top-[88px] z-[90] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-neutral-700/80 bg-[#0b0d0f]/96 p-4 text-neutral-100 shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
            {selectedArmy
              ? "Army Inspector"
              : "Settlement Inspector"}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {selectedArmy
              ? "Click a settlement on the map to preview a route."
              : "Select an army token to issue movement orders."}
          </div>
        </div>

        <button
          type="button"
          onClick={closeInspector}
          className="shrink-0 rounded-lg border border-neutral-700 bg-neutral-950/80 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white"
          aria-label="Close inspector"
        >
          ✕
        </button>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-xs leading-5 text-neutral-300">
          {message}
        </div>
      ) : null}

      {selectedArmy ? (
        <section>
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Selected Army
          </div>

          <h2 className="mt-1 text-lg font-semibold">
            {commander?.name
              ? `${commander.name}'s Host`
              : selectedArmy.id}
          </h2>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-semibold">
              {sizeLabel}
            </span>

            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
              controlLabel === "ACTOR LLM"
                ? "border-cyan-700 bg-cyan-950/40 text-cyan-200"
                : controlLabel?.startsWith("GM")
                  ? "border-violet-700 bg-violet-950/40 text-violet-200"
                  : "border-amber-700 bg-amber-950/40 text-amber-200"
            }`}>
              {controlLabel}
            </span>
          </div>

          {lordProfile ? (
            <div className="mt-2 text-xs text-violet-300">
              Household army of {
                lordProfile.title
              }
            </div>
          ) : (
            <div className="mt-2 text-xs text-amber-300">
              Realm / royal field army
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-neutral-900 p-3">
              <div className="text-neutral-500">
                Soldiers
              </div>
              <div className="mt-1 text-lg font-semibold">
                {getArmySoldierCount(
                  selectedArmy.id
                ).toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-900 p-3">
              <div className="text-neutral-500">
                Power
              </div>
              <div className="mt-1 text-lg font-semibold">
                {armyPower.toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-900 p-3">
              <div className="text-neutral-500">
                Morale
              </div>
              <div className="mt-1 uppercase">
                {selectedArmy.morale}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-900 p-3">
              <div className="text-neutral-500">
                Supply
              </div>
              <div className="mt-1 uppercase">
                {selectedArmy.supply.state}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Command & Characters
            </div>

            <div className="space-y-2">
              {charactersInArmy.length > 0 ? (
                charactersInArmy.map((character) => (
                  <div
                    key={character.id}
                    className="flex items-center justify-between rounded bg-neutral-950/70 px-2 py-2"
                  >
                    <span>
                      {character.rank === "lord" ? "♜ " : "♔ "}
                      {character.name}
                    </span>
                    <span className="text-[10px] uppercase text-neutral-500">
                      {character.id === selectedArmy.commanderId
                        ? "Commander"
                        : "With army"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-neutral-500">
                  No explicitly attached character presence.
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-y-2 border-t border-neutral-800 pt-3">
              <span className="text-neutral-500">
                Infantry
              </span>
              <span>
                {unitCount(
                  selectedArmy.id,
                  "infantry"
                ).toLocaleString()}
              </span>

              <span className="text-neutral-500">
                Cavalry
              </span>
              <span>
                {unitCount(
                  selectedArmy.id,
                  "cavalry"
                ).toLocaleString()}
              </span>

              <span className="text-neutral-500">
                Siege
              </span>
              <span>
                {unitCount(
                  selectedArmy.id,
                  "siege"
                ).toLocaleString()}
              </span>
            </div>
          </div>

          {armyMovement ? (
            <div className="mt-3 rounded-lg border border-cyan-900 bg-cyan-950/25 p-3 text-xs">
              <div className="font-semibold text-cyan-200">
                MARCHING
              </div>
              <div className="mt-1 text-neutral-400">
                Destination: {
                  armyMovement.destinationNodeId
                }
              </div>
              <div className="mt-1 text-neutral-500">
                ETA minute {
                  Math.ceil(
                    armyMovement
                      .estimatedArrivalAt
                  )
                }
              </div>
            </div>
          ) : null}

          {isIndependentLordArmy ? (
            <div className="mt-4 rounded-lg border border-violet-900 bg-violet-950/20 p-3 text-xs leading-5 text-violet-200">
              This force belongs to an independent major lord. The ruler cannot directly puppet it. Use a character order; the GM Character decides compliance.
            </div>
          ) : null}

          {routePreview?.ok ? (
            <div className="mt-4 rounded-xl border border-yellow-800/60 bg-yellow-950/15 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-yellow-300">
                Route Preview
              </div>

              <div className="mt-2 text-sm font-semibold">
                → {
                  routePreview
                    .preview
                    .destinationName
                }
              </div>

              <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-neutral-500">
                  Distance
                </span>
                <span>
                  {
                    routePreview
                      .preview
                      .physicalDistanceKm
                  } km
                </span>

                <span className="text-neutral-500">
                  Effective
                </span>
                <span>
                  {
                    routePreview
                      .preview
                      .effectiveDistanceKm
                      .toFixed(0)
                  } km
                </span>

                <span className="text-neutral-500">
                  ETA
                </span>
                <span>
                  {formatDuration(
                    routePreview
                      .preview
                      .estimatedDurationMinutes
                  )}
                </span>

                <span className="text-neutral-500">
                  Road legs
                </span>
                <span>
                  {
                    routePreview
                      .preview
                      .edgeIds
                      .length
                  }
                </span>
              </div>

              {routePreview
                .preview
                .unauthorizedBorder ? (
                <div className="mt-3 rounded-lg border border-red-800 bg-red-950/35 p-3 text-xs leading-5 text-red-200">
                  ⚠ Foreign border ahead: {
                    routePreview
                      .preview
                      .unauthorizedBorder
                      .fromKingdomId
                  } → {
                    routePreview
                      .preview
                      .unauthorizedBorder
                      .toKingdomId
                  }. Military access is not currently recognized.
                </div>
              ) : null}

              {canPlayerOrderSelectedArmy ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearMapDestination();
                      setBorderConfirm(false);
                    }}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      confirmMove(false)
                    }
                    className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-semibold text-black"
                  >
                    Confirm Move
                  </button>
                </div>
              ) : null}

              {borderConfirm &&
              canPlayerOrderSelectedArmy ? (
                <div className="mt-3 rounded-xl border border-red-700 bg-red-950/45 p-3">
                  <div className="text-xs font-semibold text-red-200">
                    BORDER VIOLATION
                  </div>
                  <p className="mt-1 text-xs leading-5 text-red-300/80">
                    The army will physically march toward the frontier. The diplomatic incident occurs only if it actually crosses the foreign border edge.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBorderConfirm(false)
                      }
                      className="rounded border border-neutral-700 px-2 py-2 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        confirmMove(true)
                      }
                      className="rounded bg-red-500 px-2 py-2 text-xs font-semibold text-white"
                    >
                      Cross Border
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : selectedSettlement ? (
        <section>
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Settlement
          </div>

          <h2 className="mt-1 text-xl font-semibold">
            {selectedSettlementName}
          </h2>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between rounded bg-neutral-900 p-2">
              <span className="text-neutral-500">
                Kingdom
              </span>
              <span>
                {
                  world.kingdoms[
                    selectedSettlement.kingdomId
                  ]?.name ??
                  selectedSettlement.kingdomId
                }
              </span>
            </div>

            <div className="flex justify-between rounded bg-neutral-900 p-2">
              <span className="text-neutral-500">
                Realm Controller
              </span>
              <span className={
                getRealmControlLabel(
                  selectedSettlement.kingdomId
                ) === "ACTOR LLM"
                  ? "text-cyan-300"
                  : getRealmControlLabel(
                      selectedSettlement.kingdomId
                    ) === "GM CONTROLLED"
                    ? "text-violet-300"
                    : "text-amber-300"
              }>
                {
                  getRealmControlLabel(
                    selectedSettlement.kingdomId
                  )
                }
              </span>
            </div>

            <div className="flex justify-between rounded bg-neutral-900 p-2">
              <span className="text-neutral-500">
                Lord
              </span>
              <span>
                {
                  settlementLordCharacter
                    ?.name ??
                  "Royal domain"
                }
              </span>
            </div>

            <div className="flex justify-between rounded bg-neutral-900 p-2">
              <span className="text-neutral-500">
                Fortification
              </span>
              <span>
                {
                  selectedSettlement
                    .fortificationLevel
                }
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-neutral-800 p-3 text-xs leading-5 text-neutral-500">
            Select one of your controllable army tokens, then click this settlement again to create a physical route preview.
          </div>
        </section>
      ) : null}
    </aside>
  );
}
