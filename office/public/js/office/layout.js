// Office layout: size, zones, walking lanes and activity spots.
// Units: 1 world unit = 1 floor tile. x runs left -> right, z back -> front, y is up.
// Change the floor plan here; the scene, routing and agents all read from it.
//
// The office is a compact 16 x 16 floor: an open hall with the desks in the middle and four rooms
// with their own walls and a door (rapat, server, pantry and lounge, game) in the corners. The lobby
// is an open zone in front of the gate.

export const N = 32;
export const OFFICE = { x0: 8, x1: 24, z0: 8, z1: 24 };

// A room with partition walls: wall { along: "x" | "z", at, from, to, gaps }. Along "x" the wall
// runs west-east at z = at; along "z" it runs north-south at x = at. The door is the gap, with a
// point just inside and just outside it (both on a walking lane).
const room = (id, name, floor, [x0, x1, z0, z1], walls, door) => ({ id, name, floor, x0, x1, z0, z1, walls, door, sign: null });
const open = (id, name, floor, x0, x1, z0, z1, sign) => ({ id, name, floor, x0, x1, z0, z1, walls: [], door: null, sign });

export const ROOMS = [
  room("rapat", "RUANG RAPAT", "wood", [8, 13.5, 8, 12], [
    { along: "x", at: 12, from: 8, to: 13.5, gaps: [[10.2, 11.6]] },
    { along: "z", at: 13.5, from: 8, to: 12 },
  ], { inside: { x: 10.9, z: 11.4 }, outside: { x: 10.9, z: 12.8 } }),
  room("server", "RUANG SERVER", "dark", [18.5, 24, 8, 12], [
    { along: "x", at: 12, from: 18.5, to: 24, gaps: [[20.4, 21.8]] },
    { along: "z", at: 18.5, from: 8, to: 12 },
  ], { inside: { x: 21.1, z: 11.4 }, outside: { x: 21.1, z: 12.8 } }),
  room("lounge", "PANTRY & LOUNGE", "wood", [8, 14, 19, 24], [
    { along: "x", at: 19, from: 8, to: 14, gaps: [[10.2, 11.6]] },
    { along: "z", at: 14, from: 19, to: 24 },
  ], { inside: { x: 10.9, z: 19.6 }, outside: { x: 10.9, z: 18.2 } }),
  room("game", "RUANG GAME", "carpet", [18, 24, 19, 24], [
    { along: "x", at: 19, from: 18, to: 24, gaps: [[20.4, 21.8]] },
    { along: "z", at: 18, from: 19, to: 24 },
  ], { inside: { x: 21.1, z: 19.6 }, outside: { x: 21.1, z: 18.2 } }),
  open("lobby", "LOBBY", "marble", 14, 18, 20, 24, { x: 14.9, z: 23.55 }),
];
// There are no private offices any more (kept so older code that imports it keeps working).
export const PRIVATE_OFFICES = [];

// Front gate in the glass railing (opens into the lobby).
export const GATE = { x0: 14, x1: 18 };
export const roomAt = (x, z) => ROOMS.find((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) ?? null;
export const PORTAL = { x: 16, z: 22.2 };
export const CENTER = { x: (OFFICE.x0 + OFFICE.x1) / 2, z: (OFFICE.z0 + OFFICE.z1) / 2 };

// Desks are furniture (furniture.js, defaultLayout): agent i sits at desk i. These are only
// the spare open desks for agents beyond the number of desks in the layout; there are none,
// add desks with the 🛠 Layout editor.
export const DESK_SLOTS = [];
// A desk spans 1.3 x 0.75 from its slot corner; the chair is 0.4 in front of it.
// A flipped desk is turned around its slot corner, so its seat lies towards -z.
export const seatOf = (slot) => slot.flip
  ? { x: slot.x - 0.65, z: slot.z - 1.15, heading: 0, room: slot.room ?? null }
  : { x: slot.x + 0.65, z: slot.z + 1.15, heading: Math.PI, room: slot.room ?? null };

// Walking points for idle agents (also where two agents meet to chat): along the three
// east-west lanes (north, between the desk rows, south), in the north commons and in the lobby.
export const WANDER = [
  [10, 12.8], [13, 12.8], [16, 12.8], [19, 12.8], [22, 12.8],
  [10, 15.5], [13, 15.5], [16, 15.5], [19, 15.5], [22, 15.5],
  [10, 18.2], [13, 18.2], [16, 18.2], [19, 18.2], [22, 18.2],
  [15, 10.4], [17, 10.4], [15.2, 21], [17, 21.4],
];

// Garden path ring around the office and the entrance path to the gate.
export const isPath = (i, j) => {
  const [i0, i1, j0, j1] = [OFFICE.x0 - 3, OFFICE.x1 + 3, OFFICE.z0 - 3, OFFICE.z1 + 3];
  const ring = i >= i0 && i <= i1 && j >= j0 && j <= j1 && (i === i0 || i === i1 || j === j0 || j === j1);
  const entrance = i >= GATE.x0 && i < GATE.x1 && j >= OFFICE.z1 && j <= j1;
  return ring || entrance;
};

// ---------------------------------------------------------------------------
// Activity spots (agents walk here when idle)
// ---------------------------------------------------------------------------

// 💬 Rapat: where a meeting sits. The moderator (Hermes) stands at the whiteboard,
// participants take the chairs of the meeting table (filled in by furniture.js).
export const MEETING = {
  room: "rapat",
  moderator: { x: 12.4, z: 8.75, heading: Math.PI, pose: "write", icon: "🗣" },
  seats: [],
};

// Where agents idle (sofa, arcade, coffee, ...). The spots belong to furniture and are
// filled in place by the furniture manager (office/furniture.js), so they follow the
// layout; each one: { id, room, x, z, heading, pose, icon }.
export const ACTIVITY_SPOTS = [];
