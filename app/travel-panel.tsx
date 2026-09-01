"use client";

import { useSyncExternalStore } from "react";
import {
  getWorldState,
  getLocations,
  subscribeWorldState,
} from "@/lib/world/state";
import { travelTo } from "@/lib/world/actions";

export default function TravelPanel() {
  const world = useSyncExternalStore(
    subscribeWorldState,
    getWorldState,
    getWorldState
  );

  const currentLocation = world.locations[world.player.locationId];
  const locations = getLocations();

  return (
    <section className="mt-8 space-y-4">
      <p className="text-lg">
        <strong>Current location:</strong> {currentLocation.name}
      </p>

      <div className="flex flex-wrap gap-3">
        {locations.map((location) => (
          <button
            key={location.id}
            onClick={() => travelTo(location.id)}
            disabled={location.id === world.player.locationId}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            Travel to {location.name}
          </button>
        ))}
      </div>
    </section>
  );
}