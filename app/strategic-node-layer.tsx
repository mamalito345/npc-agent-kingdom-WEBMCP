"use client";

import {
  useSyncExternalStore,
} from "react";

import {
  getMapInteractionState,
  chooseMapNodeDestination,
  selectMapStrategicNode,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  wasMapDragged,
} from "@/lib/ui/map-drag";

import {
  formatTerrainName,
  getPlayableStrategicNodes,
  getStrategicNodeIcon,
  getStrategicNodeLabel,
} from "@/lib/map/strategic-nodes";

export default function StrategicNodeLayer() {
  const interaction =
    useSyncExternalStore(
      subscribeMapInteraction,
      getMapInteractionState,
      getMapInteractionState
    );

  return (
    <>
      {getPlayableStrategicNodes()
        .map(
          (
            node
          ) => {
            const selected =
              interaction
                .selectedStrategicNodeId ===
              node.id;

            const destination =
              interaction
                .destinationNodeId ===
              node.id;

            const important =
              node.importance ===
                "critical" ||
              node.importance ===
                "major";

            const label =
              node.displayName ??
              getStrategicNodeLabel(
                node
              );

            return (
              <button
                key={
                  node.id
                }
                type="button"
                data-map-node-id={
                  node.id
                }
                title={`${label} · ${formatTerrainName(node.terrain)}${node.strategicRole ? ` · ${node.strategicRole}` : ""}`}
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
                    chooseMapNodeDestination(
                      node.id
                    );

                    return;
                  }

                  selectMapStrategicNode(
                    selected
                      ? null
                      : node.id
                  );
                }}
                className={`group absolute z-30 grid place-items-center rounded-full border font-black shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition ${
                  destination
                    ? "h-8 w-8 scale-110 border-yellow-200 bg-yellow-950/95 text-yellow-100 ring-4 ring-yellow-300/25"
                    : selected
                      ? "h-8 w-8 border-white bg-neutral-900 text-white"
                      : important
                        ? "h-6 w-6 border-amber-200/75 bg-black/72 text-amber-100 hover:h-8 hover:w-8"
                        : "h-5 w-5 border-neutral-400/55 bg-black/62 text-neutral-300 hover:h-7 hover:w-7 hover:border-amber-300 hover:text-amber-200"
                }`}
                style={{
                  left:
                    node.x,
                  top:
                    node.y,
                  transform:
                    "translate(-50%, -50%)",
                }}
              >
                {
                  getStrategicNodeIcon(
                    node
                  )
                }

                <span className="pointer-events-none absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded border border-neutral-700 bg-black/90 px-2 py-1 text-[9px] font-semibold normal-case text-neutral-100 group-hover:block">
                  {label} · {formatTerrainName(node.terrain)}
                </span>
              </button>
            );
          }
        )}
    </>
  );
}
