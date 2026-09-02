"use client";

import {
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
  getMapInteractionState,
  selectMapArmy,
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

  const lordArmyIds =
    new Set(
      Object.values(
        world.session.lords.profiles
      ).flatMap(
        (profile) =>
          profile.controlledArmyIds
      )
    );

  const armies =
    Object.values(
      world.armies
    ).filter(
      (army) =>
        army.status !==
        "destroyed"
    );

  const activeBattles =
    Object.values(
      world.battles
    ).filter(
      (battle) =>
        battle.status ===
        "active"
    );

  return (
    <>
      {armies.map(
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
              (candidate) =>
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

          return (
            <button
              key={army.id}
              type="button"
              title={army.id}
              onPointerDown={(
                event
              ) =>
                event.stopPropagation()
              }
              onClick={(
                event
              ) => {
                event.stopPropagation();

                selectMapArmy(
                  selected
                    ? null
                    : army.id
                );
              }}
              className={`absolute z-40 grid min-h-14 min-w-14 place-items-center rounded-md border-2 px-2 py-1 shadow-[0_8px_22px_rgba(0,0,0,0.5)] transition ${
                selected
                  ? "scale-110 ring-4 ring-yellow-300/70"
                  : ""
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
                transform:
                  "translate(-50%, -50%)",
              }}
            >
              <span className="text-sm font-black">
                {isLordArmy
                  ? "♜"
                  : "⚔"}{" "}
                {KINGDOM_LABELS[
                  army.ownerId
                ] ?? "?"}
              </span>

              <span className="text-[9px] font-semibold text-white/80">
                {getArmySoldierCount(
                  army.id
                ).toLocaleString()}
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
                    : controlLabel === "ACTOR LLM"
                      ? "border-cyan-300 bg-cyan-950 text-cyan-100"
                      : controlLabel === "GM CONTROLLED"
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
    </>
  );
}
