// Walking routes for agents. The work area is a grid of desk rows: agents
// walk along two corridors (between and in front of the desk rows) and switch
// between them through the side aisles. Rooms are entered and left through
// their door (ROOMS[].door in layout.js).
import { ROOMS } from "../office/layout.js";

export const corridorFor = (z) => (z < 12.4 ? 11.1 : 14.3);
export const AISLE_LEFT = 7;
export const AISLE_RIGHT = 21.6;

// Work-area route: detour around the desk rows using two corridors and the side aisles.
export const corridorRoute = (from, to) => {
  const route = [];
  const c1 = corridorFor(from.z);
  const c2 = corridorFor(to.z);
  route.push({ x: from.x, z: c1 });
  if (c1 !== c2) {
    const side = Math.abs(from.x - AISLE_LEFT) + Math.abs(to.x - AISLE_LEFT) < Math.abs(from.x - AISLE_RIGHT) + Math.abs(to.x - AISLE_RIGHT) ? AISLE_LEFT : AISLE_RIGHT;
    route.push({ x: side, z: c1 }, { x: side, z: c2 });
  }
  route.push({ x: to.x, z: c2 }, { x: to.x, z: to.z });
  return route;
};

export const doorOf = (roomId) => ROOMS.find((r) => r.id === roomId)?.door ?? null;

// Full route between two points, leaving/entering rooms through their doors.
export const planRoute = (from, to, fromRoom = null, toRoom = null) => {
  if (fromRoom && fromRoom === toRoom) return [{ x: to.x, z: to.z }];
  const exit = doorOf(fromRoom);
  const entry = doorOf(toRoom);
  const route = exit ? [exit.inside, exit.outside] : [];
  const start = exit ? exit.outside : from;
  route.push(...corridorRoute(start, entry ? entry.outside : to));
  if (entry) route.push(entry.inside, { x: to.x, z: to.z });
  return route;
};
