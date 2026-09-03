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
  selectMapArmy,
  selectMapSettlement,
} from "@/lib/ui/map-interaction";

export default function ConflictLayer() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const player =
    world.session
      .players[
        world.session
          .localPlayerId
      ];

  if (!player) {
    return null;
  }

  const battles =
    Object.values(
      world.battles
    ).filter(
      (battle) =>
        battle.status ===
        "active"
    );

  const sieges =
    Object.values(
      world.sieges
    ).filter(
      (siege) =>
        siege.status ===
        "active"
    );

  return (
    <>
      {battles.map(
        (battle) => {
          const point =
            getPointForPosition({
              kind:
                "node",
              nodeId:
                battle.nodeId,
            });

          if (!point) {
            return null;
          }

          const ownArmyId =
            [
              ...battle
                .attackerArmyIds,
              ...battle
                .defenderArmyIds,
            ].find(
              (armyId) =>
                world.armies[
                  armyId
                ]?.ownerId ===
                player.kingdomId
            );

          return (
            <button
              key={
                battle.id
              }
              type="button"
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
                  ownArmyId
                ) {
                  selectMapArmy(
                    ownArmyId
                  );
                }
              }}
              title={`Battle · ${battle.currentPhase} · hour ${battle.battleHour}`}
              className="absolute z-[48] grid h-10 w-10 place-items-center rounded-full border-2 border-red-300 bg-red-950/90 text-lg text-red-100 shadow-[0_0_0_7px_rgba(127,29,29,0.22),0_8px_22px_rgba(0,0,0,0.55)] animate-pulse"
              style={{
                left:
                  point.x,
                top:
                  point.y,
                transform:
                  "translate(-50%, -50%)",
              }}
            >
              ⚔
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-200">
                Battle · {battle.currentPhase}
              </span>
            </button>
          );
        }
      )}

      {sieges.map(
        (siege) => {
          const settlement =
            world.settlements[
              siege
                .settlementId
            ];

          if (!settlement) {
            return null;
          }

          const point =
            getPointForPosition({
              kind:
                "node",
              nodeId:
                settlement
                  .locationId,
            });

          if (!point) {
            return null;
          }

          return (
            <button
              key={
                siege.id
              }
              type="button"
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

                selectMapSettlement(
                  settlement.id
                );
              }}
              title={`Siege · ${siege.currentPhase}`}
              className="absolute z-[47] grid h-9 w-9 place-items-center rounded-md border-2 border-orange-300 bg-orange-950/90 text-base text-orange-100 shadow-[0_0_0_6px_rgba(154,52,18,0.18),0_8px_20px_rgba(0,0,0,0.5)]"
              style={{
                left:
                  point.x +
                  24,
                top:
                  point.y -
                  24,
                transform:
                  "translate(-50%, -50%)",
              }}
            >
              ♜
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-orange-200">
                Siege · {siege.currentPhase}
              </span>
            </button>
          );
        }
      )}
    </>
  );
}
