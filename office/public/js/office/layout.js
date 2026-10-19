// Office layout: a three-storey building with a lift tower on its west side.
// Units: 1 world unit = 1 floor tile. x runs west -> east, z north -> south, y is up.
// Change the floor plan here; the scene, routing and agents all read from it.
//
//   Level 0 (Lantai 1): lobby (open, gate on the south side), the game room and the canteen
//                        (kantin) in a wing to the north-west.
//   Level 1 (Lantai 2): a corridor with 12 private rooms, one per agent (desk i is in room i).
//   Level 2 (Lantai 3): the meeting room and the server room, plus an open terrace.
//
// Every point that belongs to a storey carries a `level` (0, 1 or 2). Levels are reached through
// the lift (LIFT); each storey has a door in its west wall that opens into the lift cabin.

export const N = 38;
export const LEVEL_H = 3.4; // height of one storey
export const levelTop = (level) => 0.04 + level * LEVEL_H; // y of the floor surface
export const LEVEL_NAMES = ["Lantai 1", "Lantai 2", "Lantai 3"];

// Footprint of every storey as rectangles [x0, x1, z0, z1]; their union is the floor.
export const LEVELS = [
  { rects: [[6, 32, 14, 28], [6, 18, 8, 14]] }, // lobby + game room, canteen wing
  { rects: [[6, 32, 14, 24]] }, // corridor and the agents' rooms
  { rects: [[6, 28, 14, 24]] }, // meeting room, server room, terrace
];
// Edges of a storey that are a low glass railing instead of a wall (the terrace on level 2).
export const RAIL_ZONES = [null, null, { x0: 6, x1: 28, z0: 20, z1: 24 }];

// Bounds of the whole building, for the garden around it.
export const OFFICE = { x0: 6, x1: 32, z0: 8, z1: 28 };
export const CENTER = { x: (OFFICE.x0 + OFFICE.x1) / 2, z: (OFFICE.z0 + OFFICE.z1) / 2 };

// The lift: a glass tower against the west wall. On every level a doorway in the west wall (z 18 to 20)
// leads into the cabin; `door` is the point just inside the building, `cabin` the stop in the cabin.
export const LIFT = { cabin: { x: 4.4, z: 19 }, door: { x: 7.6, z: 19 }, gap: [18, 20], speed: 4 };
// The corridors of level 1 and 2 run along z = CORRIDOR_Z from the lift to the east end.
export const CORRIDOR_Z = 19;

// A room has partition walls and a door: wall { along: "x" | "z", at, from, to, gaps }. Along "x" the
// wall runs west-east at z = at; along "z" it runs north-south at x = at. Walls on the outer edge of
// the building are built from the footprint and are not listed here. The door is the gap in a wall, with
// a point just inside and just outside it (the outside point is on the walking lane).
const room = (id, name, floor, level, [x0, x1, z0, z1], walls, door, extra = {}) => ({ id, name, floor, level, x0, x1, z0, z1, walls, door, sign: null, ...extra });
const open = (id, name, floor, level, x0, x1, z0, z1, sign) => ({ id, name, floor, level, x0, x1, z0, z1, walls: [], door: null, sign });
const gapAt = (c, half = 0.7) => [[c - half, c + half]];

const rooms = [
  // ---- level 0: lobby, game room, canteen ----
  open("lobby", "LOBBY", "marble", 0, 6, 20, 14, 28, { x: 15, z: 27.45 }),
  room("kantin", "KANTIN", "wood", 0, [6, 18, 8, 14], [
    { along: "x", at: 14, from: 6, to: 18, gaps: [[11.3, 12.7]] },
  ], { inside: { x: 12, z: 13.3 }, outside: { x: 12, z: 15.2 } }),
  room("game", "RUANG GAME", "carpet", 0, [20, 32, 14, 28], [
    { along: "z", at: 20, from: 14, to: 28, gaps: [[21.3, 22.7]] },
  ], { inside: { x: 20.7, z: 22 }, outside: { x: 18.6, z: 22 } }),
];

// ---- level 1: twelve private rooms along the corridor (six north, six south of it) ----
const ROOM_W = 26 / 6;
for (let i = 0; i < 12; i += 1) {
  const north = i < 6;
  const col = i % 6;
  const x0 = 6 + col * ROOM_W;
  const x1 = x0 + ROOM_W;
  const cx = (x0 + x1) / 2;
  const [z0, z1, doorWallZ, inside] = north ? [14, 18, 18, 17.3] : [20, 24, 20, 20.7];
  const walls = [{ along: "x", at: doorWallZ, from: x0, to: x1, gaps: gapAt(cx) }];
  if (col < 5) walls.push({ along: "z", at: x1, from: z0, to: z1 }); // the east wall of the last room is the outer wall
  rooms.push(room(`kamar-${i}`, `RUANG ${i + 1}`, ["wood", "carpet", "tile"][i % 3], 1, [x0, x1, z0, z1], walls,
    { inside: { x: cx, z: inside }, outside: { x: cx, z: CORRIDOR_Z } }, { private: true }));
}

// ---- level 2: meeting room and server room (north), terrace (south) ----
rooms.push(
  room("rapat", "RUANG RAPAT", "wood", 2, [6, 18, 14, 18], [
    { along: "x", at: 18, from: 6, to: 18, gaps: gapAt(12) },
    { along: "z", at: 18, from: 14, to: 18 },
  ], { inside: { x: 12, z: 17.3 }, outside: { x: 12, z: CORRIDOR_Z } }),
  room("server", "RUANG SERVER", "dark", 2, [18, 28, 14, 18], [
    { along: "x", at: 18, from: 18, to: 28, gaps: gapAt(23) },
  ], { inside: { x: 23, z: 17.3 }, outside: { x: 23, z: CORRIDOR_Z } }),
  open("terrace", "TERAS", "tile", 2, 6, 28, 20, 24, { x: 17, z: 23.45 }),
);

export const ROOMS = rooms;
// There are no spare open desks any more (kept so older code that imports it keeps working).
export const PRIVATE_OFFICES = [];

// Front gate in the south wall of level 0 (opens into the lobby).
export const GATE = { x0: 11, x1: 15, level: 0 };
export const roomAt = (x, z, level = 0) => ROOMS.find((r) => r.level === level && x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) ?? null;
export const PORTAL = { x: 13, z: 25.2, level: 0 };

// Is (x, z) on the floor of this level?
export const onFloor = (x, z, level) => LEVELS[level].rects.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);

// Desks are furniture (furniture.js, defaultLayout): agent i sits at desk i. These are only
// the spare open desks for agents beyond the number of desks in the layout; there are none,
// add desks with the 🛠 Layout editor.
export const DESK_SLOTS = [];
export const seatOf = (slot) => slot.flip
  ? { x: slot.x - 0.65, z: slot.z - 1.15, heading: 0, room: slot.room ?? null, level: slot.level ?? 1 }
  : { x: slot.x + 0.65, z: slot.z + 1.15, heading: Math.PI, room: slot.room ?? null, level: slot.level ?? 1 };

// Walking points for idle agents (also where two agents meet to chat): [x, z, level].
export const WANDER = [
  // lobby (level 0)
  [8.5, 16], [12, 17], [16, 16.5], [9, 22], [12.5, 21], [17, 21], [9.5, 25.5], [17, 25.5],
  // corridor of level 1
  [9, 19, 1], [14, 19, 1], [19, 19, 1], [24, 19, 1], [29, 19, 1],
  // corridor and terrace of level 2
  [10, 19, 2], [16, 19, 2], [22, 19, 2], [10, 22, 2], [17, 22.4, 2], [24, 22, 2],
].map(([x, z, level = 0]) => ({ x, z, level }));
export const wanderOn = (level) => WANDER.filter((w) => w.level === level);

// Garden path ring around the building and the entrance path to the gate.
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
  level: 2,
  moderator: { x: 10.2, z: 14.75, level: 2, heading: Math.PI, pose: "write", icon: "🗣" },
  seats: [],
};

// Where agents idle (sofa, arcade, coffee, ...). The spots belong to furniture and are
// filled in place by the furniture manager (office/furniture.js), so they follow the
// layout; each one: { id, room, level, x, z, heading, pose, icon }.
export const ACTIVITY_SPOTS = [];
