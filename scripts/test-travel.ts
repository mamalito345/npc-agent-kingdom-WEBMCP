import { getWorldState, getLocation } from "../lib/world/state";
import { travelTo } from "../lib/world/actions";

console.log("Initial:", getWorldState().player.locationId);

console.log("Northwatch:", getLocation("northwatch"));

const success = travelTo("northwatch");
console.log("Success result:", success);
console.log("After success:", getWorldState().player.locationId);

const beforeInvalid = getWorldState().player.locationId;

const failure = travelTo("does-not-exist");
console.log("Failure result:", failure);

const afterInvalid = getWorldState().player.locationId;

console.log("Invalid preserved state:", beforeInvalid === afterInvalid);