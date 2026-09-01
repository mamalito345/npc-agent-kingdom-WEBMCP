"use client";

import {
  useState,
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  getLocations,
  subscribeWorldState,
} from "@/lib/world/state";

import { travelTo } from "@/lib/world/actions";

import {
  formatWorldTime,
  pauseWorld,
  resumeWorld,
} from "@/lib/world/time";

import {
  getMapEdge,
  getMapEdges,
} from "@/lib/map/graph";

export default function TravelPanel() {
  const world = useSyncExternalStore(
    subscribeWorldState,
    getWorldState,
    getWorldState
  );

  const [lastTravelResult, setLastTravelResult] =
    useState<string | null>(null);

  const locations = getLocations();

  const playerCharacterId =
    world.player.characterId;

  const position =
    world.simulation.entityPositions[
      playerCharacterId
    ];

  const movement =
    world.simulation.activeMovements[
      playerCharacterId
    ];

  let positionText = "Unknown";

  if (position?.kind === "node") {
    positionText =
      world.locations[position.nodeId]?.name ??
      position.nodeId;
  }

  if (position?.kind === "edge") {
    const edge = getMapEdge(
      position.edgeId
    );

    if (edge) {
      const fromName =
        world.locations[edge.fromNodeId]?.name ??
        edge.fromNodeId;

      const toName =
        world.locations[edge.toNodeId]?.name ??
        edge.toNodeId;

      positionText =
        `${fromName} ↔ ${toName} ` +
        `(${Math.round(
          position.progress * 100
        )}%)`;
    }
  }

  const routeText = movement
    ? movement.routeNodeIds
        .map(
          (nodeId) =>
            world.locations[nodeId]?.name ??
            nodeId
        )
        .join(" → ")
    : null;

  function handleTravel(
    locationId: string
  ) {
    const result = travelTo(locationId);

    if (!result.ok) {
      setLastTravelResult(
        `Travel failed: ${result.error}`
      );

      return;
    }

    if (result.interrupted) {
      setLastTravelResult(
        `Travel interrupted at ${formatWorldTime(
          result.currentTime
        )}: ${
          result.interrupt?.message ??
          "unknown interrupt"
        }`
      );

      return;
    }

    const destinationName =
      world.locations[
        result.destinationId
      ]?.name ?? result.destinationId;

    setLastTravelResult(
      `Arrived at ${destinationName} after ${result.durationMinutes} world minutes.`
    );
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="space-y-2 rounded border p-4">
        <h2 className="text-xl font-semibold">
          Simulation
        </h2>

        <p>
          <strong>World time:</strong>{" "}
          {formatWorldTime(
            world.simulation
              .worldTimeMinutes
          )}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          {world.simulation.paused
            ? "Paused"
            : "Running"}
        </p>

        <p>
          <strong>Player position:</strong>{" "}
          {positionText}
        </p>

        {movement && (
          <>
            <p>
              <strong>
                Destination:
              </strong>{" "}
              {world.locations[
                movement.destinationNodeId
              ]?.name ??
                movement.destinationNodeId}
            </p>

            <p>
              <strong>Route:</strong>{" "}
              {routeText}
            </p>

            <p>
              <strong>ETA:</strong>{" "}
              {formatWorldTime(
                movement.estimatedArrivalAt
              )}
            </p>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={pauseWorld}
            className="rounded border px-3 py-1"
          >
            Pause
          </button>

          <button
            onClick={resumeWorld}
            className="rounded border px-3 py-1"
          >
            Resume
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">
          Travel
        </h2>

        <div className="flex flex-wrap gap-3">
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() =>
                handleTravel(location.id)
              }
              disabled={Boolean(movement)}
              className="rounded border px-4 py-2 disabled:opacity-50"
            >
              Travel to {location.name}
            </button>
          ))}
        </div>

        {lastTravelResult && (
          <p className="rounded border p-3">
            {lastTravelResult}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded border p-4">
        <h2 className="text-xl font-semibold">
          Development Map
        </h2>

        {getMapEdges().map((edge) => (
          <div
            key={edge.id}
            className="text-sm"
          >
            {world.locations[
              edge.fromNodeId
            ]?.name ?? edge.fromNodeId}
            {" ↔ "}
            {world.locations[
              edge.toNodeId
            ]?.name ?? edge.toNodeId}
            {" — "}
            {edge.distanceKm} km
          </div>
        ))}
      </div>
    </section>
  );
}