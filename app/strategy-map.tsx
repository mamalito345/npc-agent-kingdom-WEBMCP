"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import ArmyLayer from "@/app/army-layer";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  visualMapConfig,
} from "@/data/map/map-config";

import {
  settlementVisuals,
} from "@/data/map/settlement-visuals";

import {
  roadVisuals,
} from "@/data/map/road-visuals";

import {
  getPointForPosition,
} from "@/lib/map/visual";

import {
  travelTo,
} from "@/lib/world/actions";

import {
  advanceWorldBy,
} from "@/lib/world/simulation";

import {
  formatWorldTime,
  pauseWorld,
  resumeWorld,
} from "@/lib/world/time";

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface MapCoordinate {
  x: number;
  y: number;
}

type PlaybackSpeed =
  | 1
  | 2
  | 4;

const PLAYBACK_DELAYS: Record<
  PlaybackSpeed,
  number
> = {
  1: 3000,
  2: 1500,
  4: 750,
};

export default function StrategyMap() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const viewportRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const dragRef = useRef<{
    mouseX: number;
    mouseY: number;
    cameraX: number;
    cameraY: number;
  } | null>(null);

  const playbackBusyRef =
    useRef(false);

  const [
    camera,
    setCamera,
  ] =
    useState<Camera>({
      x: 100,
      y: 50,
      zoom:
        visualMapConfig
          .initialZoom,
    });

  const [
    playbackSpeed,
    setPlaybackSpeed,
  ] =
    useState<PlaybackSpeed>(
      1
    );

  const [
    selectedSettlementId,
    setSelectedSettlementId,
  ] =
    useState<string | null>(
      "stoneford"
    );

  const [
    debugCoordinate,
    setDebugCoordinate,
  ] =
    useState<MapCoordinate | null>(
      null
    );

  const [
    imageFailed,
    setImageFailed,
  ] =
    useState(false);

  /*
   * PRESENTATION CLOCK ONLY.
   *
   * Canonical time still progresses exclusively through
   * advanceWorldBy(60).
   *
   * Browser time NEVER directly mutates WorldMinute.
   */
  useEffect(
    () => {
      if (
        world.simulation
          .paused
      ) {
        return;
      }

      const timer =
        window.setTimeout(
          () => {
            if (
              playbackBusyRef
                .current
            ) {
              return;
            }

            playbackBusyRef.current =
              true;

            try {
              const result =
                advanceWorldBy(
                  60
                );

              if (
                result.interrupt
              ) {
                pauseWorld();
              }
            } finally {
              playbackBusyRef.current =
                false;
            }
          },
          PLAYBACK_DELAYS[
            playbackSpeed
          ]
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      world.simulation
        .paused,

      world.simulation
        .worldTimeMinutes,

      playbackSpeed,
    ]
  );

  const playerPosition =
    world.simulation
      .entityPositions[
        world.player
          .characterId
      ];

  const playerMapPoint =
    playerPosition
      ? getPointForPosition(
          playerPosition
        )
      : null;

  const courierPoints =
    useMemo(
      () => {
        return Object.values(
          world.couriers
        )
          .filter(
            (
              courier
            ) =>
              courier.status ===
              "traveling"
          )
          .map(
            (
              courier
            ) => {
              const position =
                world
                  .simulation
                  .entityPositions[
                    courier.id
                  ];

              const point =
                position
                  ? getPointForPosition(
                      position
                    )
                  : null;

              return {
                courier,
                point,
              };
            }
          );
      },
      [
        world.couriers,
        world.simulation
          .entityPositions,
      ]
    );

  const selectedSettlement =
    selectedSettlementId
      ? world.settlements[
          selectedSettlementId
        ]
      : undefined;

  const selectedKingdom =
    selectedSettlement
      ? world.kingdoms[
          selectedSettlement
            .kingdomId
        ]
      : undefined;

  const selectedOwner =
    selectedSettlement
      ?.ownerId
      ? world.characters[
          selectedSettlement
            .ownerId
        ]
      : undefined;

  function mapCoordinateFromClient(
    clientX: number,
    clientY: number
  ): MapCoordinate | null {
    const viewport =
      viewportRef.current;

    if (!viewport) {
      return null;
    }

    const rect =
      viewport.getBoundingClientRect();

    return {
      x:
        (
          clientX -
          rect.left -
          camera.x
        ) /
        camera.zoom,

      y:
        (
          clientY -
          rect.top -
          camera.y
        ) /
        camera.zoom,
    };
  }

  function handleWheel(
    event: React.WheelEvent
  ) {
    event.preventDefault();

    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const rect =
      viewport.getBoundingClientRect();

    const mouseX =
      event.clientX -
      rect.left;

    const mouseY =
      event.clientY -
      rect.top;

    const worldX =
      (
        mouseX -
        camera.x
      ) /
      camera.zoom;

    const worldY =
      (
        mouseY -
        camera.y
      ) /
      camera.zoom;

    const zoomFactor =
      event.deltaY <
      0
        ? 1.1
        : 0.9;

    const nextZoom =
      Math.max(
        visualMapConfig
          .minZoom,

        Math.min(
          visualMapConfig
            .maxZoom,

          camera.zoom *
            zoomFactor
        )
      );

    setCamera({
      zoom:
        nextZoom,

      x:
        mouseX -
        worldX *
          nextZoom,

      y:
        mouseY -
        worldY *
          nextZoom,
    });
  }

  function handlePointerDown(
    event: React.PointerEvent<
      HTMLDivElement
    >
  ) {
    if (
      event.button !==
      0
    ) {
      return;
    }

    dragRef.current = {
      mouseX:
        event.clientX,

      mouseY:
        event.clientY,

      cameraX:
        camera.x,

      cameraY:
        camera.y,
    };

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );
  }

  function handlePointerMove(
    event: React.PointerEvent<
      HTMLDivElement
    >
  ) {
    const coordinate =
      mapCoordinateFromClient(
        event.clientX,
        event.clientY
      );

    if (coordinate) {
      setDebugCoordinate({
        x:
          Math.round(
            coordinate.x
          ),

        y:
          Math.round(
            coordinate.y
          ),
      });
    }

    const dragState =
      dragRef.current;

    if (!dragState) {
      return;
    }

    const deltaX =
      event.clientX -
      dragState.mouseX;

    const deltaY =
      event.clientY -
      dragState.mouseY;

    setCamera(
      (
        current
      ) => ({
        ...current,

        x:
          dragState
            .cameraX +
          deltaX,

        y:
          dragState
            .cameraY +
          deltaY,
      })
    );
  }

  function handlePointerUp(
    event: React.PointerEvent<
      HTMLDivElement
    >
  ) {
    dragRef.current =
      null;

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        );
    }
  }

  function handleTravel(
    settlementId: string
  ) {
    /*
     * TEMPORARY:
     *
     * F1.5 keeps the existing travel entry point.
     * The next architecture package replaces this with
     * queued character movement orders so player travel
     * can never teleport.
     */
    travelTo(
      settlementId
    );
  }

  function handleSingleHour() {
    pauseWorld();

    advanceWorldBy(
      60
    );
  }

  function handlePlaybackToggle() {
    if (
      world.simulation
        .paused
    ) {
      resumeWorld();
    } else {
      pauseWorld();
    }
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-5 py-3">
        <strong>
          Living World
        </strong>

        <span className="font-mono text-sm">
          {formatWorldTime(
            world.simulation
              .worldTimeMinutes
          )}
        </span>

        <span
          className={
            world.simulation
              .paused
              ? "text-xs text-yellow-300"
              : "text-xs text-green-300"
          }
        >
          {world.simulation
            .paused
            ? "Paused"
            : "Running"}
        </span>

        <button
          type="button"
          onClick={
            handlePlaybackToggle
          }
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm hover:bg-neutral-800"
        >
          {world.simulation
            .paused
            ? "▶ Play"
            : "⏸ Pause"}
        </button>

        <button
          type="button"
          onClick={
            handleSingleHour
          }
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm hover:bg-neutral-800"
        >
          +1h
        </button>

        <div className="flex items-center gap-1">
          {(
            [
              1,
              2,
              4,
            ] as const
          ).map(
            (
              speed
            ) => (
              <button
                key={
                  speed
                }
                type="button"
                onClick={() =>
                  setPlaybackSpeed(
                    speed
                  )
                }
                className={`rounded border px-2 py-1 text-xs ${
                  playbackSpeed ===
                  speed
                    ? "border-yellow-300 bg-yellow-950/40 text-yellow-200"
                    : "border-neutral-700 bg-neutral-900 text-neutral-300"
                }`}
              >
                x
                {
                  speed
                }
              </button>
            )
          )}
        </div>

        <span className="ml-auto text-xs text-neutral-400">
          Zoom{" "}
          {camera.zoom.toFixed(
            2
          )}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={
            viewportRef
          }
          onWheel={
            handleWheel
          }
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={
            handlePointerUp
          }
          onPointerCancel={
            handlePointerUp
          }
          className="relative min-h-0 flex-1 touch-none cursor-grab overflow-hidden bg-neutral-900 active:cursor-grabbing"
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width:
                visualMapConfig
                  .width,

              height:
                visualMapConfig
                  .height,

              transform:
                `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            }}
          >
            {!imageFailed ? (
              <img
                src={
                  visualMapConfig
                    .imageUrl
                }
                alt=""
                draggable={
                  false
                }
                onError={() =>
                  setImageFailed(
                    true
                  )
                }
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-800">
                <div className="p-8 text-3xl text-neutral-500">
                  World Map
                </div>
              </div>
            )}

            <svg
              className="pointer-events-none absolute inset-0"
              width={
                visualMapConfig
                  .width
              }
              height={
                visualMapConfig
                  .height
              }
              viewBox={`0 0 ${visualMapConfig.width} ${visualMapConfig.height}`}
            >
              {Object.values(
                roadVisuals
              ).map(
                (
                  road
                ) => (
                  <polyline
                    key={
                      road.edgeId
                    }
                    points={
                      road.points
                        .map(
                          (
                            point
                          ) =>
                            `${point.x},${point.y}`
                        )
                        .join(
                          " "
                        )
                    }
                    fill="none"
                    stroke="rgba(226, 213, 179, 0.42)"
                    strokeWidth={
                      10
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )
              )}
            </svg>

            {Object.values(
              settlementVisuals
            ).map(
              (
                visual
              ) => {
                const settlement =
                  world
                    .settlements[
                    visual
                      .settlementId
                  ];

                if (
                  !settlement
                ) {
                  return null;
                }

                const selected =
                  selectedSettlementId ===
                  settlement.id;

                const markerSize =
                  54 *
                  (
                    visual.scale ??
                    1
                  );

                return (
                  <button
                    key={
                      settlement.id
                    }
                    type="button"
                    onPointerDown={(
                      event
                    ) => {
                      event.stopPropagation();
                    }}
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();

                      setSelectedSettlementId(
                        settlement.id
                      );
                    }}
                    className="absolute z-10"
                    style={{
                      left:
                        visual.x,

                      top:
                        visual.y,

                      transform:
                        "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className={`relative flex items-center justify-center rounded-full border-4 bg-neutral-200 text-neutral-950 shadow-lg ${
                        selected
                          ? "border-yellow-300"
                          : "border-neutral-700"
                      }`}
                      style={{
                        width:
                          markerSize,

                        height:
                          markerSize,
                      }}
                    >
                      <img
                        src={
                          visual.iconUrl
                        }
                        alt=""
                        draggable={
                          false
                        }
                        onError={(
                          event
                        ) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                        className="h-4/5 w-4/5 object-contain"
                      />

                      <span className="absolute text-lg font-bold">
                        {settlement.type ===
                        "capital"
                          ? "★"
                          : settlement.type ===
                              "castle"
                            ? "◆"
                            : settlement.type ===
                                "village"
                              ? "•"
                              : "●"}
                      </span>
                    </div>

                    <span
                      className="absolute left-1/2 top-full mt-2 whitespace-nowrap rounded bg-black/70 px-2 py-1 text-sm text-white"
                      style={{
                        transform:
                          `translate(calc(-50% + ${visual.labelOffsetX ?? 0}px), ${visual.labelOffsetY ?? 0}px)`,
                      }}
                    >
                      {
                        settlement.name
                      }
                    </span>
                  </button>
                );
              }
            )}

            <ArmyLayer />

            {playerMapPoint && (
              <div
                className="pointer-events-none absolute z-30 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-xl font-black shadow-xl"
                style={{
                  left:
                    playerMapPoint.x,

                  top:
                    playerMapPoint.y,

                  transform:
                    "translate(-50%, -50%)",
                }}
              >
                P
              </div>
            )}

            {courierPoints.map(
              ({
                courier,
                point,
              }) =>
                point ? (
                  <div
                    key={
                      courier.id
                    }
                    title={
                      courier.id
                    }
                    className="pointer-events-none absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-amber-700 text-xs font-bold shadow"
                    style={{
                      left:
                        point.x,

                      top:
                        point.y,

                      transform:
                        "translate(-50%, -50%)",
                    }}
                  >
                    C
                  </div>
                ) : null
            )}
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 z-50 rounded bg-black/70 px-3 py-2 text-xs">
            {debugCoordinate
              ? `Map x: ${debugCoordinate.x} — y: ${debugCoordinate.y}`
              : "Move cursor over map"}
          </div>
        </div>

        <aside className="h-full w-[340px] shrink-0 overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-5">
          <h2 className="mb-4 text-xl font-semibold">
            Settlement
          </h2>

          {!selectedSettlement ? (
            <p className="text-neutral-400">
              Select a settlement.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold">
                  {
                    selectedSettlement.name
                  }
                </div>

                <div className="text-sm text-neutral-400">
                  {
                    selectedKingdom?.name
                  }{" "}
                  —{" "}
                  {
                    selectedSettlement.type
                  }
                </div>
              </div>

              <div>
                <strong>
                  Owner
                </strong>

                <div>
                  {selectedOwner?.name ??
                    "Crown / local administration"}
                </div>
              </div>

              <div>
                <strong>
                  Resources
                </strong>

                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <span>
                    Food
                  </span>
                  <span>
                    {selectedSettlement.resources.food}
                  </span>

                  <span>
                    Gold
                  </span>
                  <span>
                    {selectedSettlement.resources.gold}
                  </span>

                  <span>
                    Wood
                  </span>
                  <span>
                    {selectedSettlement.resources.wood}
                  </span>

                  <span>
                    Stone
                  </span>
                  <span>
                    {selectedSettlement.resources.stone}
                  </span>

                  <span>
                    Metal
                  </span>
                  <span>
                    {selectedSettlement.resources.metal}
                  </span>
                </div>
              </div>

              <div>
                <strong>
                  Daily production
                </strong>

                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <span>
                    Food
                  </span>
                  <span>
                    +
                    {selectedSettlement.dailyProduction.food}
                  </span>

                  <span>
                    Gold
                  </span>
                  <span>
                    +
                    {selectedSettlement.dailyProduction.gold}
                  </span>

                  <span>
                    Wood
                  </span>
                  <span>
                    +
                    {selectedSettlement.dailyProduction.wood}
                  </span>

                  <span>
                    Stone
                  </span>
                  <span>
                    +
                    {selectedSettlement.dailyProduction.stone}
                  </span>

                  <span>
                    Metal
                  </span>
                  <span>
                    +
                    {selectedSettlement.dailyProduction.metal}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleTravel(
                    selectedSettlement.id
                  )
                }
                className="w-full rounded border border-neutral-600 bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
              >
                Travel to{" "}
                {
                  selectedSettlement.name
                }
              </button>

              <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500">
                Settlement ID:{" "}
                {
                  selectedSettlement.id
                }
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}