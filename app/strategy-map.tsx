"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import ArmyLayer from "@/app/army-layer";
import StrategicNodeLayer from "@/app/strategic-node-layer";
import ConflictLayer from "@/app/conflict-layer";
import StrategicTerrainOverlay from "@/app/strategic-terrain-overlay";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  getDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

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
  getMapEdge,
} from "@/lib/map/graph";

import {
  getMapInteractionState,
  chooseMapDestination,
  selectMapSettlement,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  beginMapDrag,
  endMapDrag,
  trackMapDragMove,
  wasMapDragged,
} from "@/lib/ui/map-drag";

import {
  buildArmyRoutePreview,
} from "@/lib/map/route-preview";

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function roadAppearance(
  edgeId:
    string
) {
  const edge =
    getMapEdge(
      edgeId
    );

  switch (
    edge?.roadClass
  ) {
    case "major_road":
      return {
        width: 5,
        opacity: 0.62,
        dash:
          undefined,
      };

    case "forest_trail":
      return {
        width: 3,
        opacity: 0.46,
        dash:
          "8 8",
      };

    case "mountain_route":
      return {
        width: 3,
        opacity: 0.52,
        dash:
          "5 7",
      };

    case "caravan_route":
      return {
        width: 4,
        opacity: 0.50,
        dash:
          "12 7",
      };

    case "local_road":
      return {
        width: 2.5,
        opacity: 0.34,
        dash:
          "6 6",
      };

    case "regional_road":
    default:
      return {
        width: 3.5,
        opacity: 0.46,
        dash:
          undefined,
      };
  }
}

export default function StrategyMap() {
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

  const interaction =
    useSyncExternalStore(
      subscribeMapInteraction,
      getMapInteractionState,
      getMapInteractionState
    );

  const viewportRef =
    useRef<
      HTMLDivElement | null
    >(
      null
    );

  const dragRef =
    useRef<{
      mouseX: number;
      mouseY: number;
      cameraX: number;
      cameraY: number;
    } | null>(
      null
    );

  const fittedOnceRef =
    useRef(
      false
    );

  const [
    camera,
    setCamera,
  ] =
    useState<Camera>({
      x:
        0,
      y:
        0,
      zoom:
        visualMapConfig
          .initialZoom,
    });

  const [
    imageFailed,
    setImageFailed,
  ] =
    useState(
      false
    );

  const [
    showTerrain,
    setShowTerrain,
  ] =
    useState(
      true
    );

  const [
    showRoads,
    setShowRoads,
  ] =
    useState(
      true
    );

  const selectedArmy =
    interaction
      .selectedArmyId
      ? world.armies[
          interaction
            .selectedArmyId
        ]
      : undefined;

  const routePreview =
    selectedArmy &&
    interaction
      .destinationNodeId
      ? buildArmyRoutePreview(
          selectedArmy.id,
          interaction
            .destinationNodeId
        )
      : null;

  function fitMap(): void {
    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const rect =
      viewport
        .getBoundingClientRect();

    const zoom =
      clamp(
        Math.min(
          rect.width /
            visualMapConfig
              .width,
          rect.height /
            visualMapConfig
              .height
        ) *
          0.96,
        visualMapConfig
          .minZoom,
        visualMapConfig
          .maxZoom
      );

    setCamera({
      zoom,
      x:
        (
          rect.width -
          visualMapConfig
            .width *
            zoom
        ) /
        2,
      y:
        (
          rect.height -
          visualMapConfig
            .height *
            zoom
        ) /
        2,
    });
  }

  useEffect(
    () => {
      const viewport =
        viewportRef.current;

      if (!viewport) {
        return;
      }

      if (
        !fittedOnceRef.current
      ) {
        fittedOnceRef.current =
          true;

        requestAnimationFrame(
          fitMap
        );
      }

      const observer =
        new ResizeObserver(
          () => {
            if (
              !dragRef.current
            ) {
              fitMap();
            }
          }
        );

      observer.observe(
        viewport
      );

      return () =>
        observer.disconnect();
    },
    [
      demo.mode,
    ]
  );

  function zoomAroundCenter(
    multiplier:
      number
  ): void {
    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const rect =
      viewport
        .getBoundingClientRect();

    const centerX =
      rect.width /
      2;

    const centerY =
      rect.height /
      2;

    const worldX =
      (
        centerX -
        camera.x
      ) /
      camera.zoom;

    const worldY =
      (
        centerY -
        camera.y
      ) /
      camera.zoom;

    const nextZoom =
      clamp(
        camera.zoom *
          multiplier,
        visualMapConfig
          .minZoom,
        visualMapConfig
          .maxZoom
      );

    setCamera({
      zoom:
        nextZoom,
      x:
        centerX -
        worldX *
          nextZoom,
      y:
        centerY -
        worldY *
          nextZoom,
    });
  }

  function handleWheel(
    event:
      React.WheelEvent
  ) {
    event.preventDefault();

    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const rect =
      viewport
        .getBoundingClientRect();

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

    const nextZoom =
      clamp(
        camera.zoom *
          (
            event.deltaY <
            0
              ? 1.1
              : 0.9
          ),
        visualMapConfig
          .minZoom,
        visualMapConfig
          .maxZoom
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
    event:
      React.PointerEvent<
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

    beginMapDrag();

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );
  }

  function handlePointerMove(
    event:
      React.PointerEvent<
        HTMLDivElement
      >
  ) {
    const drag =
      dragRef.current;

    if (!drag) {
      return;
    }

    trackMapDragMove(
      Math.hypot(
        event.clientX -
          drag.mouseX,
        event.clientY -
          drag.mouseY
      )
    );

    setCamera(
      (
        current
      ) => ({
        ...current,
        x:
          drag.cameraX +
          (
            event.clientX -
            drag.mouseX
          ),
        y:
          drag.cameraY +
          (
            event.clientY -
            drag.mouseY
          ),
      })
    );
  }

  function handlePointerUp(
    event:
      React.PointerEvent<
        HTMLDivElement
      >
  ) {
    dragRef.current =
      null;

    endMapDrag();

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

  const mapHeightClass =
    demo.mode ===
    "player"
      ? "h-[calc(100dvh-72px)]"
      : "h-[100dvh]";

  return (
    <div
      className={`${mapHeightClass} min-h-0 overflow-hidden bg-[#090b0d] text-neutral-100`}
    >
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
        onDoubleClick={
          fitMap
        }
        className="relative h-full touch-none cursor-grab overflow-hidden bg-[#111315] active:cursor-grabbing"
      >
        <div className="absolute left-4 top-4 z-50 max-w-[min(560px,calc(100vw-32px))] rounded-xl border border-neutral-700/70 bg-black/72 px-3 py-2 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() =>
                  zoomAroundCenter(
                    0.9
                  )
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 hover:border-amber-600"
              >
                −
              </button>

              <span className="min-w-12 text-center font-mono text-neutral-400">
                {Math.round(
                  camera.zoom *
                    100
                )}
                %
              </span>

              <button
                type="button"
                onClick={() =>
                  zoomAroundCenter(
                    1.1
                  )
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 hover:border-amber-600"
              >
                +
              </button>

              <button
                type="button"
                onClick={
                  fitMap
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 hover:border-amber-600"
              >
                Fit
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowTerrain(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className={`rounded border px-2 py-1 ${
                  showTerrain
                    ? "border-emerald-700 bg-emerald-950/60 text-emerald-200"
                    : "border-neutral-700 bg-neutral-900 text-neutral-500"
                }`}
              >
                Terrain
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowRoads(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className={`rounded border px-2 py-1 ${
                  showRoads
                    ? "border-amber-700 bg-amber-950/60 text-amber-200"
                    : "border-neutral-700 bg-neutral-900 text-neutral-500"
                }`}
              >
                Roads
              </button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-50 hidden rounded-lg border border-neutral-700/60 bg-black/65 px-3 py-2 text-[9px] text-neutral-300 backdrop-blur md:block">
          <div className="font-bold uppercase tracking-wide text-neutral-100">
            Terrain doctrine
          </div>
          <div className="mt-1">
            ▲ pass/hill = chokepoint or high ground · ♣ forest = infantry-friendly · ═ bridge = assault penalty · ✣ junction = maneuver hub
          </div>
        </div>

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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#3b4533_0%,#262d25_42%,#171b18_100%)]" />
          )}

          {showTerrain ? (
            <StrategicTerrainOverlay />
          ) : null}

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
            {showRoads
              ? Object.values(
                  roadVisuals
                ).map(
                  (
                    road
                  ) => {
                    const appearance =
                      roadAppearance(
                        road.edgeId
                      );

                    return (
                      <g
                        key={
                          road
                            .edgeId
                        }
                      >
                        <polyline
                          points={
                            road
                              .points
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
                          stroke="rgba(25,20,14,0.55)"
                          strokeWidth={
                            appearance
                              .width +
                            2
                          }
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        <polyline
                          points={
                            road
                              .points
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
                          stroke="rgba(229,207,165,0.82)"
                          strokeWidth={
                            appearance
                              .width
                          }
                          strokeDasharray={
                            appearance
                              .dash
                          }
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={
                            appearance
                              .opacity
                          }
                        />
                      </g>
                    );
                  }
                )
              : null}

            {routePreview
              ?.ok ? (
              <>
                <polyline
                  points={
                    routePreview
                      .preview
                      .points
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
                  stroke="rgba(250,204,21,0.95)"
                  strokeWidth={
                    14
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={
                    0.24
                  }
                />

                <polyline
                  points={
                    routePreview
                      .preview
                      .points
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
                  stroke="rgba(253,224,71,1)"
                  strokeWidth={
                    4
                  }
                  strokeDasharray="16 11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}
          </svg>

          {Object.values(
            settlementVisuals
          ).map(
            (
              visual
            ) => {
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
                interaction
                  .selectedSettlementId ===
                settlement.id;

              const destination =
                interaction
                  .destinationNodeId ===
                settlement
                  .locationId;

              const baseSize =
                settlement.type ===
                  "capital"
                  ? 62
                  : settlement.type ===
                      "city"
                    ? 55
                    : settlement.type ===
                        "castle"
                      ? 52
                      : settlement.type ===
                          "town"
                        ? 46
                        : 36;

              const size =
                baseSize *
                (
                  visual
                    .scale ??
                  1
                );

              const showLabel =
                selected ||
                destination ||
                settlement.type ===
                  "capital" ||
                settlement.type ===
                  "city" ||
                settlement.type ===
                  "castle" ||
                camera.zoom >=
                  0.78;

              return (
                <button
                  key={
                    settlement.id
                  }
                  type="button"
                  data-map-node-id={
                    settlement.locationId
                  }
                  data-settlement-id={
                    settlement.id
                  }
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();

                    if (
                      wasMapDragged()
                    ) {
                      return;
                    }

                    if (
                      interaction
                        .selectedArmyId
                    ) {
                      chooseMapDestination(
                        settlement.id,
                        settlement
                          .locationId
                      );

                      return;
                    }

                    selectMapSettlement(
                      selected
                        ? null
                        : settlement.id
                    );
                  }}
                  className="group absolute z-20"
                  style={{
                    left:
                      visual.x,
                    top:
                      visual.y,
                    transform:
                      "translate(-50%, -50%)",
                  }}
                >
                  <span
                    className={`grid place-items-center rounded-full border-2 bg-black/72 shadow-xl transition ${
                      destination
                        ? "border-yellow-300 ring-4 ring-yellow-300/30"
                        : selected
                          ? "border-white ring-2 ring-white/25"
                          : settlement.type ===
                              "capital"
                            ? "border-amber-200/90"
                            : settlement.type ===
                                "castle"
                              ? "border-stone-200/80"
                              : "border-neutral-300/65"
                    }`}
                    style={{
                      width:
                        size,
                      height:
                        size,
                    }}
                  >
                    {visual
                      .iconUrl ? (
                      <img
                        src={
                          visual
                            .iconUrl
                        }
                        alt=""
                        draggable={
                          false
                        }
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xl">
                        🏰
                      </span>
                    )}
                  </span>

                  {showLabel ? (
                    <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-neutral-800/70 bg-black/78 px-2 py-0.5 text-[10px] font-semibold text-[#f2ead8] shadow">
                      {
                        world
                          .locations[
                            settlement
                              .locationId
                          ]
                          ?.name ??
                        settlement
                          .name ??
                        settlement.id
                      }
                    </span>
                  ) : (
                    <span className="pointer-events-none absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-2 py-0.5 text-[9px] text-neutral-100 group-hover:block">
                      {settlement.name}
                    </span>
                  )}
                </button>
              );
            }
          )}

          <StrategicNodeLayer />
          <ConflictLayer />
          <ArmyLayer />
        </div>
      </div>
    </div>
  );
}
