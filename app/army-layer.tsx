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
  getSelectedArmyId,
  selectArmy,
  subscribeArmySelection,
} from "@/lib/ui/army-selection";

const KINGDOM_LABELS:
  Record<
    string,
    string
  > = {
  northreach:
    "N",

  eastvale:
    "E",

  westmoor:
    "W",

  southmark:
    "S",

  ironhollow:
    "I",
};

export default function ArmyLayer() {
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

  const armies =
    Object.values(
      world.armies
    ).filter(
      (army) =>
        army.status !==
        "destroyed"
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

          const selected =
            selectedArmyId ===
            army.id;

          const moving =
            Boolean(
              world.simulation
                .activeMovements[
                  army.id
                ]
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
              }}
              onClick={(
                event
              ) => {
                event.stopPropagation();

                selectArmy(
                  army.id
                );
              }}
              className={`absolute z-40 flex h-16 w-16 flex-col items-center justify-center rounded-lg border-4 shadow-xl ${
                selected
                  ? "border-yellow-300 bg-yellow-950"
                  : army.ownerId ===
                      "northreach"
                    ? "border-blue-300 bg-blue-900"
                    : army.ownerId ===
                        "ironhollow"
                      ? "border-red-300 bg-red-950"
                      : "border-neutral-300 bg-neutral-800"
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
              <span className="text-lg font-black">
                ⚔
                {
                  KINGDOM_LABELS[
                    army.ownerId
                  ] ?? "?"
                }
              </span>

              <span className="text-[10px] font-semibold">
                {
                  getArmySoldierCount(
                    army.id
                  )
                }
              </span>

              {moving && (
                <span className="absolute -bottom-5 rounded bg-black/80 px-1 text-[9px] text-white">
                  MOVING
                </span>
              )}
            </button>
          );
        }
      )}
    </>
  );
}