import { getWorldState, getLocation } from "@/lib/world/state";
import { setPlayerLocation } from "@/lib/world/runtime";

export type TravelResult =
  | {
      ok: true;
      previousLocationId: string;
      locationId: string;
    }
  | {
      ok: false;
      error: "LOCATION_NOT_FOUND";
    };

export function travelTo(locationId: string): TravelResult {
  const destination = getLocation(locationId);

  if (!destination) {
    return {
      ok: false,
      error: "LOCATION_NOT_FOUND",
    };
  }

  const previousLocationId = getWorldState().player.locationId;

  setPlayerLocation(locationId);

  return {
    ok: true,
    previousLocationId,
    locationId,
  };
}