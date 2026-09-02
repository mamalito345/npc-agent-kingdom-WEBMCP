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
  getDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

type MatterKind =
  | "URGENT"
  | "MESSAGE"
  | "POLITICAL"
  | "MILITARY"
  | "NOTICE";

interface RealmMatter {
  id: string;
  kind: MatterKind;
  title: string;
  summary: string;
  time: number;
}

export default function RealmMatters() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const demo =
    useSyncExternalStore(
      subscribeDemoConfig,
      getDemoConfig,
      getDemoConfig
    );

  const [open, setOpen] =
    useState(true);

  const player =
    world.session.players[
      world.session.localPlayerId
    ];

  const matters =
    useMemo(
      () => {
        if (!player) {
          return [];
        }

        const items:
          RealmMatter[] = [];

        const interrupt =
          world.session
            .commandCycle
            .interrupt;

        if (
          interrupt &&
          interrupt
            .affectedPlayerIds
            .includes(
              player.id
            )
        ) {
          items.push({
            id:
              interrupt.id,
            kind:
              "URGENT",
            title:
              interrupt.type
                .replaceAll(
                  "_",
                  " "
                ),
            summary:
              interrupt.message,
            time:
              interrupt.createdAt,
          });
        }

        for (
          const battle
          of Object.values(
            world.battles
          )
        ) {
          if (
            battle.status !==
            "active"
          ) {
            continue;
          }

          const involved =
            [
              ...battle
                .attackerArmyIds,
              ...battle
                .defenderArmyIds,
            ].some(
              (armyId) =>
                world.armies[
                  armyId
                ]?.ownerId ===
                player.kingdomId
            );

          if (!involved) {
            continue;
          }

          items.push({
            id:
              `battle:${battle.id}`,
            kind:
              "MILITARY",
            title:
              "Battle in progress",
            summary:
              `${battle.id} · hour ${battle.battleHour} · ${battle.currentPhase}`,
            time:
              battle.startedAt,
          });
        }

        for (
          const incident
          of Object.values(
            world.session
              .borders
              .incidents
          )
        ) {
          if (
            incident.toKingdomId !==
            player.kingdomId
          ) {
            continue;
          }

          items.push({
            id:
              incident.id,
            kind:
              "URGENT",
            title:
              "Border violation",
            summary:
              `${incident.fromKingdomId} forces crossed into ${incident.toKingdomId}.`,
            time:
              incident.occurredAt,
          });
        }

        for (
          const message
          of Object.values(
            world.messages
          )
        ) {
          if (
            message.recipientId !==
              player.characterId ||
            message.deliveredAt ===
              undefined
          ) {
            continue;
          }

          const sender =
            world.characters[
              message.senderId
            ];

          items.push({
            id:
              `message:${message.id}`,
            kind:
              message.content
                .startsWith(
                  "[ENVOY]"
                )
                ? "POLITICAL"
                : "MESSAGE",
            title:
              sender
                ? `Message from ${sender.name}`
                : "Delivered message",
            summary:
              message.content,
            time:
              message.deliveredAt,
          });
        }

        for (
          const order
          of Object.values(
            world.session
              .lords.orders
          )
        ) {
          if (
            order.playerId !==
            player.id
          ) {
            continue;
          }

          if (
            !order.response ||
            order.resolvedAt ===
              undefined
          ) {
            continue;
          }

          const lord =
            world.characters[
              order
                .lordCharacterId
            ];

          items.push({
            id:
              `lord:${order.id}`,
            kind:
              order.response ===
                "REFUSE" ||
              order.response ===
                "NEGOTIATE"
                ? "POLITICAL"
                : "NOTICE",
            title:
              `${lord?.name ?? "Lord"} — ${order.response}`,
            summary:
              order.responseSummary ??
              order.type,
            time:
              order.resolvedAt,
          });
        }

        return items
          .sort(
            (a, b) =>
              b.time -
                a.time ||
              a.id.localeCompare(
                b.id
              )
          )
          .slice(
            0,
            12
          );
      },
      [
        player,
        world.session
          .commandCycle
          .interrupt,
        world.battles,
        world.session
          .borders
          .incidents,
        world.messages,
        world.armies,
        world.characters,
        world.session
          .lords.orders,
      ]
    );

  if (
    demo.mode ===
      "observer" ||
    !player
  ) {
    return null;
  }

  return (
    <aside className="fixed right-5 top-[86px] z-[74] w-[340px] rounded-2xl border border-neutral-700/70 bg-[#0b0d0f]/94 text-neutral-100 shadow-2xl backdrop-blur">
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
            Realm Matters
          </div>
          <div className="mt-1 text-sm font-semibold">
            The ruler&apos;s agenda
          </div>
        </div>

        <div className="rounded-full border border-neutral-700 px-2 py-1 text-[10px]">
          {matters.length}
        </div>
      </button>

      {open ? (
        <div className="max-h-[58vh] space-y-2 overflow-y-auto border-t border-neutral-800 p-3">
          {matters.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-xs leading-5 text-neutral-500">
              The realm is quiet. Important messages, battles, lord responses and border incidents will appear here.
            </div>
          ) : (
            matters.map(
              (matter) => (
                <div
                  key={
                    matter.id
                  }
                  className={`rounded-xl border p-3 ${
                    matter.kind ===
                    "URGENT"
                      ? "border-red-800 bg-red-950/30"
                      : matter.kind ===
                          "POLITICAL"
                        ? "border-violet-800 bg-violet-950/25"
                        : matter.kind ===
                            "MILITARY"
                          ? "border-amber-800 bg-amber-950/20"
                          : "border-neutral-800 bg-neutral-900/70"
                  }`}
                >
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
                    {
                      matter.kind
                    }
                  </div>

                  <div className="mt-1 text-xs font-semibold">
                    {
                      matter.title
                    }
                  </div>

                  <div className="mt-1 text-xs leading-5 text-neutral-400">
                    {
                      matter.summary
                    }
                  </div>
                </div>
              )
            )
          )}
        </div>
      ) : null}
    </aside>
  );
}
