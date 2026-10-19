// Walking routes for agents across the three levels. Points carry a `level`: a route is a list of
// waypoints { x, z, level }; when the level changes between two waypoints at the same spot the agent
// rides the lift. Rooms are entered and left through their door (ROOMS[].door in layout.js).
//   level 0: the lobby is one open space: straight lines between the doors, the lift and the spots
//   levels 1 and 2: everything hangs off the corridor (z = CORRIDOR_Z) between the lift and the doors
import { CORRIDOR_Z, LIFT, ROOMS } from "../office/layout.js";

export const doorOf = (roomId) => ROOMS.find((r) => r.id === roomId)?.door ?? null;
export const roomLevel = (roomId) => ROOMS.find((r) => r.id === roomId)?.level ?? 0;

const at = (p, level) => ({ x: p.x, z: p.z, level });

// Walking on one level from a to b (both are the lift door, a door's outside point or a free spot).
const walk = (level, a, b) => {
  if (level === 0) {
    // the lift door is in the strip beside the canteen wall: step out into the open lobby first
    const route = [];
    if (a === LIFT.door) route.push(at(LIFT.lobby, 0));
    if (b === LIFT.door) route.push(at(LIFT.lobby, 0));
    route.push(at(b, 0));
    return route;
  }
  return [{ x: a.x, z: CORRIDOR_Z, level }, { x: b.x, z: CORRIDOR_Z, level }, at(b, level)];
};

// Full route between two points, leaving/entering rooms through their doors and changing level by lift.
export const planRoute = (from, to, fromRoom = null, toRoom = null) => {
  const fromLevel = from.level ?? 0;
  const toLevel = to.level ?? 0;
  if (fromRoom && fromRoom === toRoom) return [at(to, toLevel)];
  const exit = doorOf(fromRoom);
  const entry = doorOf(toRoom);
  const route = [];
  let cur = from;
  if (exit) {
    route.push(at(exit.inside, fromLevel), at(exit.outside, fromLevel));
    cur = exit.outside;
  }
  const dest = entry ? entry.outside : to;
  if (fromLevel !== toLevel) {
    route.push(...walk(fromLevel, cur, LIFT.door));
    route.push(at(LIFT.cabin, fromLevel), at(LIFT.cabin, toLevel), at(LIFT.door, toLevel)); // the ride: same spot, other level
    cur = LIFT.door;
  }
  route.push(...walk(toLevel, cur, dest));
  if (entry) route.push(at(entry.inside, toLevel), at(to, toLevel));
  return route;
};
