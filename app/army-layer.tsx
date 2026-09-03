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
  getPointForPosition,
} from "@/lib/map/visual";

import {
  getArmySoldierCount,
} from "@/lib/military/army-queries";

import {
  getRealmControlLabel,
} from "@/lib/demo/realm-control";

import {
  getPlayerKnownEnemyForces,
} from "@/lib/session/observation";

import {
  chooseMapDestination,
  chooseMapNodeDestination,
  getMapInteractionState,
  selectMapArmy,
  targetMapArmy,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

const KINGDOM_LABELS:
  Record<string, string> = {
  northreach: "N",
  eastvale: "E",
  westmoor: "W",
  southmark: "S",
  ironhollow: "I",
};

const KINGDOM_CLASSES:
  Record<string, string> = {
  northreach:
    "border-sky-300 bg-sky-950/95",
  eastvale:
    "border-emerald-300 bg-emerald-950/95",
  westmoor:
    "border-stone-300 bg-stone-900/95",
  southmark:
    "border-amber-300 bg-amber-950/95",
  ironhollow:
    "border-red-300 bg-red-950/95",
};

function knownEnemyPosition(
  fact: {
    data:
      Record<
        string,
        unknown
      >;
  }
) {
  if (
    typeof fact.data
      .nodeId ===
    "string"
  ) {
    return {
      kind:
        "node" as const,
      nodeId:
        fact.data.nodeId,
    };
  }

  if (
    typeof fact.data
      .edgeId ===
      "string" &&
    typeof fact.data
      .edgeProgress ===
      "number"
  ) {
    return {
      kind:
        "edge" as const,
      edgeId:
        fact.data.edgeId,
      progress:
        fact.data
          .edgeProgress,
      direction:
        "forward" as const,
    };
  }

  return undefined;
}

function formatAge(
  minutes: number
): string {
  if (
    minutes <
    60
  ) {
    return `${Math.max(
      1,
      Math.round(
        minutes
      )
    )}m`;
  }

  if (
    minutes <
    24 *
      60
  ) {
    return `${Math.round(
      minutes /
        60
    )}h`;
  }

  return `${Math.round(
    minutes /
      (
        24 *
        60
      )
  )}d`;
}

export default function ArmyLayer() {
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

  /*
   * Native HTML5 drag-and-drop fights the existing pan/zoom pointer
   * handling on the map viewport, so army drag is implemented with
   * pointer capture instead: grab an army marker, drag it over the
   * map, and drop it on any settlement or strategic node to queue a
   * move there — exactly as if it had been clicked as a destination.
   * A short movement threshold still lets a plain tap keep selecting
   * the army like before.
   */
  const [
    dragPointer,
    setDragPointer,
  ] = useState<
    | {
        armyId: string;
        startX: number;
        startY: number;
        x: number;
        y: number;
        dragging: boolean;
      }
    | null
  >(null);

  const playerId =
    world.session
      .localPlayerId;

  const player =
    world.session
      .players[
        playerId
      ];

  const ownKingdomId =
    player?.kingdomId;

  const lordArmyIds =
    useMemo(
      () =>
        new Set(
          Object.values(
            world.session
              .lords
              .profiles
          ).flatMap(
            (profile) =>
              profile
                .controlledArmyIds
          )
        ),
      [
        world.session
          .lords
          .profiles,
      ]
    );

  const ownArmies =
    Object.values(
      world.armies
    ).filter(
      (army) =>
        army.status !==
          "destroyed" &&
        army.ownerId ===
          ownKingdomId
    );

  /*
   * Every other kingdom's armies, shown at their real current position
   * regardless of fog-of-war/intel range. The player asked to stop
   * hiding rival armies by distance -- the map should just show where
   * everyone's forces actually are. This is read-only: no drag, no
   * click-to-order. The knowledge-gated `latestEnemyFacts` markers
   * below stay as-is since order validation (interception eligibility)
   * still depends on that intel system.
   */
  const otherArmies =
    Object.values(
      world.armies
    ).filter(
      (army) =>
        army.status !==
          "destroyed" &&
        army.ownerId !==
          ownKingdomId
    );

  const activeBattles =
    Object.values(
      world.battles
    ).filter(
      (battle) =>
        battle.status ===
        "active"
    );

  const enemyView =
    getPlayerKnownEnemyForces(
      world.session.id,
      playerId,
      interaction
        .selectedArmyId ??
        undefined
    );

  const latestEnemyFacts =
    enemyView.ok
      ? Object.values(
          enemyView
            .forces
            .reduce(
              (
                acc,
                fact
              ) => {
                const current =
                  acc[
                    fact
                      .subjectId
                  ];

                if (
                  !current ||
                  fact.observedAt >
                    current
                      .observedAt ||
                  (
                    fact.observedAt ===
                      current
                        .observedAt &&
                    fact.deliveredAt >
                      current
                        .deliveredAt
                  )
                ) {
                  acc[
                    fact
                      .subjectId
                  ] =
                    fact;
                }

                return acc;
              },
              {} as Record<
                string,
                (typeof enemyView.forces)[number]
              >
            )
        )
      : [];

  return (
    <>
      {dragPointer?.dragging ? (
        <div
          className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded-full border border-yellow-300/80 bg-black/85 px-2 py-1 text-[10px] font-semibold text-yellow-100 shadow-lg"
          style={{
            left:
              dragPointer.x,
            top:
              dragPointer.y,
          }}
        >
          Bırak → hedefe hareket emri
        </div>
      ) : null}

      {ownArmies.map(
        (army) => {
          const position =
            world.simulation
              .entityPositions[
                army.id
              ];

          if (!position) {
            return null;
          }

          const point =
            getPointForPosition(
              position
            );

          if (!point) {
            return null;
          }

          const battle =
            activeBattles.find(
              (
                candidate
              ) =>
                candidate
                  .attackerArmyIds
                  .includes(
                    army.id
                  ) ||
                candidate
                  .defenderArmyIds
                  .includes(
                    army.id
                  )
            );

          const selected =
            interaction
              .selectedArmyId ===
            army.id;

          const moving =
            Boolean(
              world.simulation
                .activeMovements[
                  army.id
                ]
            );

          const isLordArmy =
            lordArmyIds.has(
              army.id
            );

          const controlLabel =
            isLordArmy
              ? "GM CHARACTER · LORD"
              : getRealmControlLabel(
                  army.ownerId
                );

          const soldiers =
            getArmySoldierCount(
              army.id
            );

          const markerSize =
            Math.max(
              44,
              Math.min(
                82,
                42 +
                  Math.sqrt(
                    Math.max(
                      1,
                      soldiers
                    )
                  ) *
                    0.45
              )
            );

          return (
            <button
              key={
                army.id
              }
              type="button"
              title={
                army.id
              }
              onPointerDown={(
                event
              ) => {
                event.stopPropagation();

                event.currentTarget.setPointerCapture(
                  event.pointerId
                );

                setDragPointer({
                  armyId:
                    army.id,
                  startX:
                    event.clientX,
                  startY:
                    event.clientY,
                  x:
                    event.clientX,
                  y:
                    event.clientY,
                  dragging:
                    false,
                });
              }}
              onPointerMove={(
                event
              ) => {
                if (
                  dragPointer?.armyId !==
                  army.id
                ) {
                  return;
                }

                event.stopPropagation();

                setDragPointer(
                  (
                    current
                  ) => {
                    if (
                      !current ||
                      current.armyId !==
                        army.id
                    ) {
                      return current;
                    }

                    const dx =
                      event.clientX -
                      current.startX;

                    const dy =
                      event.clientY -
                      current.startY;

                    return {
                      ...current,
                      x:
                        event.clientX,
                      y:
                        event.clientY,
                      dragging:
                        current.dragging ||
                        Math.hypot(
                          dx,
                          dy
                        ) >
                          6,
                    };
                  }
                );
              }}
              onPointerUp={(
                event
              ) => {
                if (
                  dragPointer?.armyId !==
                  army.id
                ) {
                  return;
                }

                event.stopPropagation();

                const wasDragging =
                  dragPointer.dragging;

                if (
                  !wasDragging
                ) {
                  setDragPointer(
                    null
                  );

                  selectMapArmy(
                    selected
                      ? null
                      : army.id
                  );

                  return;
                }

                const dropTarget =
                  document
                    .elementFromPoint(
                      event.clientX,
                      event.clientY
                    )
                    ?.closest<HTMLElement>(
                      "[data-map-node-id]"
                    );

                const nodeId =
                  dropTarget?.getAttribute(
                    "data-map-node-id"
                  );

                setDragPointer(
                  null
                );

                if (
                  !nodeId
                ) {
                  return;
                }

                if (
                  !selected
                ) {
                  selectMapArmy(
                    army.id
                  );
                }

                const settlementId =
                  dropTarget?.getAttribute(
                    "data-settlement-id"
                  );

                if (
                  settlementId
                ) {
                  chooseMapDestination(
                    settlementId,
                    nodeId
                  );
                } else {
                  chooseMapNodeDestination(
                    nodeId
                  );
                }
              }}
              onPointerCancel={() => {
                setDragPointer(
                  (
                    current
                  ) =>
                    current?.armyId ===
                    army.id
                      ? null
                      : current
                );
              }}
              className={`absolute z-40 grid place-items-center rounded-full border-2 shadow-[0_8px_22px_rgba(0,0,0,0.5)] transition focus:outline-none focus-visible:outline-none ${
                selected
                  ? "scale-110 ring-4 ring-yellow-300/70"
                  : ""
              } ${
                dragPointer?.armyId ===
                  army.id &&
                dragPointer.dragging
                  ? "cursor-grabbing opacity-70"
                  : "cursor-grab"
              } ${
                KINGDOM_CLASSES[
                  army.ownerId
                ] ??
                "border-neutral-300 bg-neutral-900"
              }`}
              style={{
                left:
                  point.x,
                top:
                  point.y,
                width:
                  markerSize,
                height:
                  markerSize,
                transform:
                  "translate(-50%, -50%)",
              }}
            >
              <span className="text-sm font-black">
                {isLordArmy
                  ? "♜"
                  : "⚔"}{" "}
                {
                  KINGDOM_LABELS[
                    army.ownerId
                  ] ?? "?"
                }
              </span>

              <span className="text-[9px] font-semibold text-white/80">
                {soldiers.toLocaleString()}
              </span>

              {moving ? (
                <span className="absolute -bottom-4 rounded bg-black/80 px-1.5 text-[8px] text-neutral-200">
                  MARCHING
                </span>
              ) : null}

              {battle ? (
                <span className="absolute -top-4 rounded bg-red-700 px-1.5 text-[8px] font-bold text-white">
                  BATTLE
                </span>
              ) : null}

              <span
                className={`absolute -right-2 -top-2 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[8px] ${
                  isLordArmy
                    ? "border-violet-300 bg-violet-950 text-violet-100"
                    : controlLabel ===
                        "ACTOR LLM"
                      ? "border-cyan-300 bg-cyan-950 text-cyan-100"
                      : controlLabel ===
                          "GM CONTROLLED"
                        ? "border-violet-300 bg-violet-950 text-violet-100"
                        : "border-amber-300 bg-amber-950 text-amber-100"
                }`}
              >
                {isLordArmy
                  ? "LORD · GM"
                  : controlLabel}
              </span>
            </button>
          );
        }
      )}

      {otherArmies.map(
        (army) => {
          const position =
            world.simulation
              .entityPositions[
                army.id
              ];

          if (!position) {
            return null;
          }

          const point =
            getPointForPosition(
              position
            );

          if (!point) {
            return null;
          }

          const battle =
            activeBattles.find(
              (
                candidate
              ) =>
                candidate
                  .attackerArmyIds
                  .includes(
                    army.id
                  ) ||
                candidate
                  .defenderArmyIds
                  .includes(
                    army.id
                  )
            );

          const moving =
            Boolean(
              world.simulation
                .activeMovements[
                  army.id
                ]
            );

          const isLordArmy =
            lordArmyIds.has(
              army.id
            );

          const controlLabel =
            isLordArmy
              ? "GM CHARACTER · LORD"
              : getRealmControlLabel(
                  army.ownerId
                );

          const soldiers =
            getArmySoldierCount(
              army.id
            );

          const markerSize =
            Math.max(
              34,
              Math.min(
                62,
                34 +
                  Math.sqrt(
                    Math.max(
                      1,
                      soldiers
                    )
                  ) *
                    0.35
              )
            );

          return (
            <div
              key={`live-${army.id}`}
              title={`${army.id} (real-time position)`}
              className={`pointer-events-none absolute z-30 grid place-items-center rounded-full border border-dashed opacity-80 shadow-[0_6px_16px_rgba(0,0,0,0.4)] ${
                KINGDOM_CLASSES[
                  army.ownerId
                ] ??
                "border-neutral-300 bg-neutral-900"
              }`}
              style={{
                left:
                  point.x,
                top:
                  point.y,
                width:
                  markerSize,
                height:
                  markerSize,
                transform:
                  "translate(-50%, -50%)",
              }}
            >
              <span className="text-xs font-black">
                {isLordArmy
                  ? "♜"
                  : "⚔"}{" "}
                {
                  KINGDOM_LABELS[
                    army.ownerId
                  ] ?? "?"
                }
              </span>

              <span className="text-[8px] font-semibold text-white/70">
                {soldiers.toLocaleString()}
              </span>

              {moving ? (
                <span className="absolute -bottom-4 whitespace-nowrap rounded bg-black/80 px-1 text-[7px] text-neutral-300">
                  MARCHING
                </span>
              ) : null}

              {battle ? (
                <span className="absolute -top-4 rounded bg-red-700 px-1 text-[7px] font-bold text-white">
                  BATTLE
                </span>
              ) : null}

              <span className="absolute -right-1 -top-1 whitespace-nowrap rounded-full border border-neutral-500 bg-black/80 px-1 text-[7px] text-neutral-300">
                {isLordArmy
                  ? "LORD"
                  : controlLabel}
              </span>
            </div>
          );
        }
      )}

      {latestEnemyFacts.map(
        (fact) => {
          const position =
            knownEnemyPosition(
              fact
            );

          if (!position) {
            return null;
          }

          const point =
            getPointForPosition(
              position
            );

          if (!point) {
            return null;
          }

          const targeted =
            interaction
              .targetArmyId ===
            fact.subjectId;

          const targeting =
            fact.targeting;

          const age =
            targeting
              .ageMinutes;

          const approximateSoldiers =
            typeof fact.data
              .approximateSoldiers ===
            "number"
              ? fact.data
                  .approximateSoldiers
              : undefined;

          const enemyMarkerSize =
            Math.max(
              38,
              Math.min(
                70,
                38 +
                  Math.sqrt(
                    Math.max(
                      1,
                      approximateSoldiers ??
                        500
                    )
                  ) *
                    0.35
              )
            );

          const canTarget =
            targeting
              .canTarget;

          return (
            <button
              key={`known-${fact.subjectId}`}
              type="button"
              disabled={
                !canTarget
              }
              title={
                `${fact.summary}\n${targeting.reason}`
              }
              onPointerDown={(
                event
              ) =>
                event
                  .stopPropagation()
              }
              onClick={(
                event
              ) => {
                event.stopPropagation();

                if (
                  !canTarget
                ) {
                  return;
                }

                targetMapArmy(
                  targeted
                    ? null
                    : fact
                        .subjectId
                );
              }}
              className={`absolute z-35 grid place-items-center rounded-full border border-dashed px-1 text-red-100 shadow-[0_6px_18px_rgba(0,0,0,0.45)] backdrop-blur-[1px] transition ${
                targeted
                  ? "scale-110 border-yellow-200 bg-red-950/70 ring-4 ring-yellow-300/30"
                  : canTarget
                    ? "border-red-300/70 bg-red-950/40 opacity-80 hover:opacity-100"
                    : "cursor-not-allowed border-neutral-500/50 bg-neutral-900/45 opacity-45"
              }`}
              style={{
                left:
                  point.x,
                top:
                  point.y,
                width:
                  enemyMarkerSize,
                height:
                  enemyMarkerSize,
                transform:
                  "translate(-50%, -50%)",
              }}
            >
              <span className="text-base">
                ◇
              </span>

              <span className="text-[8px] font-bold uppercase">
                {fact.confidence}
              </span>

              {approximateSoldiers ? (
                <span className="text-[8px]">
                  ~{approximateSoldiers.toLocaleString()}
                </span>
              ) : null}

              <span className="absolute top-full mt-1 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[8px] text-red-100">
                LAST KNOWN · {formatAge(age)}
                {targeting.stale
                  ? " · STALE"
                  : ""}
              </span>

              {interaction
                .selectedArmyId ? (
                <span
                  className={`absolute -bottom-8 whitespace-nowrap rounded px-1.5 py-0.5 text-[8px] ${
                    targeting
                      .canInterceptWithSelectedArmy
                      ? "bg-emerald-950 text-emerald-200"
                      : "bg-neutral-900 text-neutral-400"
                  }`}
                >
                  {targeting
                    .canInterceptWithSelectedArmy
                    ? `ROUTE ${targeting.routeDistanceKm ?? "?"} km`
                    : "NO INTERCEPT"}
                </span>
              ) : null}
            </button>
          );
        }
      )}
    </>
  );
}
