// Office layout: size, zones, walking lanes and activity spots.
// Units: 1 world unit = 1 floor tile. x runs left -> right, z back -> front, y is up.
// Change the floor plan here; the scene, routing and agents all read from it.
//
// The office is ONE open room on a square floor (no partition walls, no doors). The old
// meeting room, server room, lounge, game room and lobby are now zones of that room: they
// only differ by their floor and a name sign. The desks stand in two rows in the middle.

export const N = 36;
export const OFFICE = { x0: 8, x1: 28, z0: 8, z1: 28 };

const zone = (id, name, floor, x0, x1, z0, z1, sign) => ({ id, name, floor, x0, x1, z0, z1, walls: [], door: null, sign });
export const ROOMS = [
  zone("rapat", "RUANG RAPAT", "wood", 8, 14, 8, 12.2, { x: 11, z: 11.75 }),
  zone("server", "RUANG SERVER", "dark", 22, 28, 8, 12.2, { x: 25, z: 11.75 }),
  zone("lounge", "PANTRY & LOUNGE", "wood", 8, 14, 22, 28, { x: 11, z: 22.6 }),
  zone("game", "RUANG GAME", "carpet", 22, 28, 22, 28, { x: 25, z: 22.6 }),
  zone("lobby", "LOBBY", "marble", 14, 22, 24.5, 28, { x: 15.2, z: 27.5 }),
];
// There are no private offices any more (kept so older code that imports it keeps working).
export const PRIVATE_OFFICES = [];

// Front gate in the glass railing (opens into the lobby).
export const GATE = { x0: 16, x1: 20 };
export const roomAt = (x, z) => ROOMS.find((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) ?? null;
export const PORTAL = { x: 18, z: 26.3 };
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

// Walking points for idle agents (also where two agents meet to chat): along three
// east-west lanes (north, middle, south) and in the lobby.
export const WANDER = [
  [10, 11], [14, 11], [18, 11], [22, 11], [26, 11],
  [10, 16], [14.5, 16], [18, 16], [22, 16], [26, 16],
  [10, 21], [14, 21], [18, 21], [22, 21], [26, 21],
  [16, 25], [20, 25.5],
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
  moderator: { x: 12.6, z: 8.75, heading: Math.PI, pose: "write", icon: "🗣" },
  seats: [],
};

// Where agents idle (sofa, arcade, coffee, ...). The spots belong to furniture and are
// filled in place by the furniture manager (office/furniture.js), so they follow the
// layout; each one: { id, room, x, z, heading, pose, icon }.
export const ACTIVITY_SPOTS = [];
