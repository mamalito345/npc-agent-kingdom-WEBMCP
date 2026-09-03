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
  getPlayableStrategicNodes,
  getStrategicNodeIcon,
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
          (node) => {
            const selected =
              interaction
                .selectedStrategicNodeId ===
              node.id;

            const destination =
              interaction
                .destinationNodeId ===
              node.id;

            return (
              <button
                key={
                  node.id
                }
                type="button"
                title={
                  node.id
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
                className={`absolute z-25 grid place-items-center rounded-full border text-[11px] font-black shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition ${
                  destination
                    ? "h-7 w-7 scale-110 border-yellow-200 bg-yellow-950/90 text-yellow-100 ring-4 ring-yellow-300/25"
                    : selected
                      ? "h-7 w-7 border-white bg-neutral-900 text-white"
                      : "h-5 w-5 border-neutral-400/70 bg-black/65 text-neutral-200 hover:h-7 hover:w-7 hover:border-amber-300 hover:text-amber-200"
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
              </button>
            );
          }
        )}
    </>
  );
}
