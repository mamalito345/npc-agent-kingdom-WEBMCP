"use client";

import {
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

  const [camera, setCamera] =
    useState<Camera>({
      x: 100,
      y: 50,

      zoom:
        visualMapConfig
          .initialZoom,
    });

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
  ] = useState(false);

  const playerPosition =
    world.simulation
      .entityPositions[
      world.player.characterId
    ];

  const playerMapPoint =
    playerPosition
      ? getPointForPosition(
          playerPosition
        )
      : null;

  const courierPoints =
    useMemo(() => {
      return Object.values(
        world.couriers
      )
        .filter(
          (courier) =>
            courier.status ===
            "traveling"
        )
        .map((courier) => {
          const position =
            world.simulation
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
        });
    }, [
      world.couriers,
      world.simulation
        .entityPositions,
    ]);

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
        (clientX -
          rect.left -
          camera.x) /
        camera.zoom,

      y:
        (clientY -
          rect.top -
          camera.y) /
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
      (mouseX -
        camera.x) /
      camera.zoom;

    const worldY =
      (mouseY -
        camera.y) /
      camera.zoom;

    const zoomFactor =
      event.deltaY < 0
        ? 1.1
        : 0.9;

    const nextZoom =
      Math.max(
        visualMapConfig.minZoom,
        Math.min(
          visualMapConfig.maxZoom,
          camera.zoom *
            zoomFactor
        )
      );

    setCamera({
      zoom: nextZoom,

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
    event: React.PointerEvent
  ) {
    if (
      event.button !== 0
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
  event: React.PointerEvent
) {
  const coordinate =
    mapCoordinateFromClient(
      event.clientX,
      event.clientY
    );

  if (coordinate) {
    setDebugCoordinate({
      x: Math.round(
        coordinate.x
      ),

      y: Math.round(
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

  setCamera((current) => ({
    ...current,

    x:
      dragState.cameraX +
      deltaX,

    y:
      dragState.cameraY +
      deltaY,
  }));
}
  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleTravel(
    settlementId: string
  ) {
    travelTo(
      settlementId
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex flex-wrap items-center gap-4 border-b border-neutral-800 px-5 py-3">
        <strong>
          Living World
        </strong>

        <span>
          {formatWorldTime(
            world.simulation
              .worldTimeMinutes
          )}
        </span>

        <span>
          {world.simulation.paused
            ? "Paused"
            : "Running"}
        </span>

        <button
          type="button"
          onClick={pauseWorld}
          className="rounded border border-neutral-700 px-3 py-1"
        >
          Pause
        </button>

        <button
          type="button"
          onClick={resumeWorld}
          className="rounded border border-neutral-700 px-3 py-1"
        >
          Resume
        </button>

        <span className="ml-auto text-xs text-neutral-400">
          Zoom{" "}
          {camera.zoom.toFixed(
            2
          )}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          ref={viewportRef}
          onWheel={handleWheel}
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
          className="relative min-h-[720px] flex-1 cursor-grab overflow-hidden bg-neutral-900 active:cursor-grabbing"
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width:
                visualMapConfig.width,

              height:
                visualMapConfig.height,

              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            }}
          >
            {/* Layer 0 — base map */}

            {!imageFailed ? (
              <img
                src={
                  visualMapConfig.imageUrl
                }
                alt=""
                draggable={false}
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
                  Placeholder
                </div>
              </div>
            )}

            {/* Layer 1 — roads */}

            <svg
              className="pointer-events-none absolute inset-0"
              width={
                visualMapConfig.width
              }
              height={
                visualMapConfig.height
              }
              viewBox={`0 0 ${visualMapConfig.width} ${visualMapConfig.height}`}
            >
              {Object.values(
                roadVisuals
              ).map(
                (road) => (
                  <polyline
                    key={
                      road.edgeId
                    }
                    points={road.points
                      .map(
                        (point) =>
                          `${point.x},${point.y}`
                      )
                      .join(" ")}
                    fill="none"
                    stroke="rgba(226, 213, 179, 0.42)"
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )
              )}
            </svg>

            {/* Layer 2 + 4 — settlements and labels */}

            {Object.values(
              settlementVisuals
            ).map(
              (visual) => {
                const settlement =
                  world.settlements[
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
                  (visual.scale ??
                    1);

                return (
                  <button
                    key={
                      settlement.id
                    }
                    type="button"
                    onPointerDown={(
                      event
                    ) =>
                      event.stopPropagation()
                    }
                    onClick={() =>
                      setSelectedSettlementId(
                        settlement.id
                      )
                    }
                    className="absolute"
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
                      className={`flex items-center justify-center rounded-full border-4 bg-neutral-200 text-neutral-950 shadow-lg ${
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
                        transform: `translate(calc(-50% + ${
                          visual.labelOffsetX ??
                          0
                        }px), ${
                          visual.labelOffsetY ??
                          0
                        }px)`,
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
            {/* Layer 3 — armies */}

            <ArmyLayer />
            {/* Layer 3 — player */}

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

            {/* Layer 3 — couriers */}

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

          <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/70 px-3 py-2 text-xs">
            {debugCoordinate
              ? `Map x: ${debugCoordinate.x} — y: ${debugCoordinate.y}`
              : "Move cursor over map"}
          </div>
        </div>

        <aside className="w-[340px] shrink-0 overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-5">
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
                    {
                      selectedSettlement
                        .resources
                        .food
                    }
                  </span>

                  <span>
                    Gold
                  </span>
                  <span>
                    {
                      selectedSettlement
                        .resources
                        .gold
                    }
                  </span>

                  <span>
                    Wood
                  </span>
                  <span>
                    {
                      selectedSettlement
                        .resources
                        .wood
                    }
                  </span>

                  <span>
                    Stone
                  </span>
                  <span>
                    {
                      selectedSettlement
                        .resources
                        .stone
                    }
                  </span>

                  <span>
                    Metal
                  </span>
                  <span>
                    {
                      selectedSettlement
                        .resources
                        .metal
                    }
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
                    {
                      selectedSettlement
                        .dailyProduction
                        .food
                    }
                  </span>

                  <span>
                    Gold
                  </span>
                  <span>
                    +
                    {
                      selectedSettlement
                        .dailyProduction
                        .gold
                    }
                  </span>

                  <span>
                    Wood
                  </span>
                  <span>
                    +
                    {
                      selectedSettlement
                        .dailyProduction
                        .wood
                    }
                  </span>

                  <span>
                    Stone
                  </span>
                  <span>
                    +
                    {
                      selectedSettlement
                        .dailyProduction
                        .stone
                    }
                  </span>

                  <span>
                    Metal
                  </span>
                  <span>
                    +
                    {
                      selectedSettlement
                        .dailyProduction
                        .metal
                    }
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