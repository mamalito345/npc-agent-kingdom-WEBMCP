"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import ArmyLayer from "@/app/army-layer";
import StrategicNodeLayer from "@/app/strategic-node-layer";
import ConflictLayer from "@/app/conflict-layer";

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
  getMapInteractionState,
  chooseMapDestination,
  selectMapSettlement,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  buildArmyRoutePreview,
} from "@/lib/map/route-preview";

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export default function StrategyMap() {
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

  const viewportRef =
    useRef<
      HTMLDivElement | null
    >(
      null
    );

  const dragRef =
    useRef<{
      mouseX:
        number;
      mouseY:
        number;
      cameraX:
        number;
      cameraY:
        number;
    } | null>(
      null
    );

  const [
    camera,
    setCamera,
  ] =
    useState<Camera>({
      x: 100,
      y: 45,
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
      Math.max(
        visualMapConfig
          .minZoom,
        Math.min(
          visualMapConfig
            .maxZoom,
          camera.zoom *
            (
              event.deltaY <
              0
                ? 1.1
                : 0.9
            )
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

    setCamera(
      (current) => ({
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

  return (
    <div className="h-screen min-h-0 overflow-hidden bg-[#090b0d] text-neutral-100">
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
        className="relative h-full touch-none cursor-grab overflow-hidden bg-[#111315] active:cursor-grabbing"
      >
        <div className="pointer-events-none absolute left-5 top-5 z-50 rounded-xl border border-neutral-700/70 bg-black/65 px-3 py-2 backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
            Strategic Map
          </div>

          <div className="mt-1 text-xs text-neutral-300">
            {interaction
              .selectedArmyId
              ? "Army selected — choose a settlement, strategic position, or known enemy."
              : "Select an army or strategic position."}
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
            <div className="absolute inset-0 bg-[#242825]" />
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
                    road
                      .edgeId
                  }
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
                  stroke="rgba(216,194,150,0.34)"
                  strokeWidth={
                    7
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            )}

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
                    16
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={
                    0.35
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
                    5
                  }
                  strokeDasharray="18 12"
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

              const size =
                54 *
                (
                  visual
                    .scale ??
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
                  ) =>
                    event
                      .stopPropagation()
                  }
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();

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
                  className="absolute z-20"
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
                    className={`grid place-items-center rounded-full border-2 bg-black/70 shadow-xl ${
                      destination
                        ? "border-yellow-300 ring-4 ring-yellow-300/30"
                        : selected
                          ? "border-white"
                          : "border-neutral-300/70"
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

                  <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-[#f2ead8]">
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
