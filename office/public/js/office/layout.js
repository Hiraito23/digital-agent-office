// Office layout: size, rooms, desk slots, walking points and activity spots.
// Units: 1 world unit = 1 floor tile. x runs left -> right, z back -> front, y is up.
// Change the floor plan here; the scene, routing and agents all read from it.

export const N = 46;
// Main hall x 6-24 (shared rooms + open desks) and, to the right, the wing of
// private offices x 24-40 (one room per agent, see PRIVATE_OFFICES).
export const OFFICE = { x0: 6, x1: 40, z0: 5, z1: 19 };
export const WING = { x0: 24, x1: 40, roomW: 4, backRow: { z0: 5, z1: 9.6 }, frontRow: { z0: 12.6, z1: 17.6 } };

// One private office per agent: a back row (door on its front wall) and a
// front row (door on its back wall) facing the wing corridor at z 11.1.
export const PRIVATE_OFFICES = [];
for (const [row, zr] of [["back", WING.backRow], ["front", WING.frontRow]]) {
  for (let x0 = WING.x0; x0 < WING.x1; x0 += WING.roomW) {
    const x1 = x0 + WING.roomW;
    const cx = x0 + WING.roomW / 2; // door and desk are centred in the room
    const n = PRIVATE_OFFICES.length + 1;
    const back = row === "back";
    const doorZ = back ? zr.z1 : zr.z0;
    const walls = [
      { along: "x", at: doorZ, from: x0, to: x1, gaps: [[cx - 0.55, cx + 0.55]] },
      { along: "z", at: x1, from: zr.z0, to: zr.z1 },
    ];
    // left wall of the first office in each row also closes the server room / game room side
    if (x0 === WING.x0) walls.push({ along: "z", at: x0, from: zr.z0, to: back ? zr.z1 : 15 });
    if (!back) walls.push({ along: "x", at: zr.z1, from: x0, to: x1 });
    PRIVATE_OFFICES.push({
      id: `ruang-${n}`, name: `RUANG ${n}`, floor: n % 2 ? "wood" : "carpet", private: true,
      x0, x1, z0: zr.z0, z1: zr.z1, walls,
      door: back
        ? { outside: { x: cx, z: doorZ + 0.6 }, inside: { x: cx, z: doorZ - 0.6 } }
        : { outside: { x: cx, z: doorZ - 0.6 }, inside: { x: cx, z: doorZ + 0.6 } },
      // desk against the far wall, facing the door; the front row is the back row
      // mirrored (flip: desk turned around, the agent faces +z). seat = seatOf(desk)
      desk: back ? { x: cx - 0.65, z: zr.z0 + 1.0, flip: false } : { x: cx + 0.65, z: zr.z1 - 1.0, flip: true },
    });
  }
}
// Rooms inside the office. Walls are glass partitions with a door gap; agents
// enter and leave a room through its door (outside -> inside points).
export const ROOMS = [
  {
    id: "rapat", name: "RUANG RAPAT", floor: "wood", x0: 6, x1: 12, z0: 5, z1: 8,
    walls: [{ along: "x", at: 8, from: 6, to: 12, gaps: [[9.4, 10.5]] }, { along: "z", at: 12, from: 5, to: 8 }],
    door: { outside: { x: 9.95, z: 8.6 }, inside: { x: 9.95, z: 7.6 } },
  },
  {
    id: "server", name: "RUANG SERVER", floor: "dark", x0: 20, x1: 24, z0: 5, z1: 9,
    walls: [{ along: "z", at: 20, from: 5, to: 9 }, { along: "x", at: 9, from: 20, to: 24, gaps: [[21.1, 22.1]] }],
    door: { outside: { x: 21.6, z: 9.6 }, inside: { x: 21.6, z: 8.4 } },
  },
  {
    id: "lounge", name: "PANTRY & LOUNGE", floor: "wood", x0: 6, x1: 12, z0: 15, z1: 19,
    walls: [{ along: "x", at: 15, from: 6, to: 12, gaps: [[9.4, 10.6]] }, { along: "z", at: 12, from: 15, to: 19 }],
    door: { outside: { x: 10, z: 14.3 }, inside: { x: 10, z: 15.6 } },
  },
  {
    id: "game", name: "RUANG GAME", floor: "carpet", x0: 18, x1: 24, z0: 15, z1: 19,
    walls: [{ along: "x", at: 15, from: 18, to: 24, gaps: [[21, 22.2]] }, { along: "z", at: 18, from: 15, to: 19 }, { along: "z", at: 24, from: 15, to: 19 }],
    door: { outside: { x: 21.6, z: 14.3 }, inside: { x: 21.6, z: 15.6 } },
  },
  // The lobby is open towards the work area (no wall, no door).
  { id: "lobby", name: "LOBBY", floor: "marble", x0: 12, x1: 18, z0: 15, z1: 19, walls: [], door: null },
  ...PRIVATE_OFFICES,
];
// Front gate in the glass railing (opens into the lobby).
export const GATE = { x0: 14, x1: 16 };
export const roomAt = (x, z) => ROOMS.find((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) ?? null;
export const PORTAL = { x: 15, z: 16.9 };
export const CENTER = { x: (OFFICE.x0 + OFFICE.x1) / 2, z: (OFFICE.z0 + OFFICE.z1) / 2 };

// One desk + chair per agent: first the private offices (Hermes first, then the
// team), then open desks in the main hall for anyone beyond that. Open desks sit
// in two rows; corridors run between them (z 11.1) and in front (z 14.3).
export const DESK_COLS = [8, 10.6, 13.2, 15.8, 18.4];
export const DESK_ROWS = [8.4, 12.4];
export const DESK_SLOTS = [
  ...PRIVATE_OFFICES.map((r) => ({ ...r.desk, room: r.id })),
  ...DESK_ROWS.flatMap((z) => DESK_COLS.map((x) => ({ x, z, room: null }))),
];
// A desk spans 1.3 x 0.75 from its slot corner; the chair is 0.4 in front of it.
// A flipped desk is turned around its slot corner, so its seat lies towards -z.
export const seatOf = (slot) => slot.flip
  ? { x: slot.x - 0.65, z: slot.z - 1.15, heading: 0, room: slot.room ?? null }
  : { x: slot.x + 0.65, z: slot.z + 1.15, heading: Math.PI, room: slot.room ?? null };

export const WANDER = [
  [9.95, 11.1], [14.5, 11.1], [17.75, 11.1], [21.6, 11.1],
  [13.5, 14.3], [17, 14.3], [13.8, 17.9], [16.6, 18.2], [22.6, 10.6],
  [27, 11.1], [31.5, 11.1], [36, 11.1], [39, 11.4],
];

// Garden path ring around the office and the entrance path to the gate.
export const isPath = (i, j) => {
  const [i0, i1, j0, j1] = [OFFICE.x0 - 3, OFFICE.x1 + 3, OFFICE.z0 - 3, OFFICE.z1 + 3];
  const ring = i >= i0 && i <= i1 && j >= j0 && j <= j1 && (i === i0 || i === i1 || j === j0 || j === j1);
  const entrance = (i === 14 || i === 15) && j >= OFFICE.z1 && j <= j1;
  return ring || entrance;
};

// ---------------------------------------------------------------------------
// Decor and activity spots (agents walk here when idle)
// ---------------------------------------------------------------------------

// 💬 Rapat: where a meeting sits. The moderator (Hermes) stands at the
// whiteboard, participants take the four chairs and then stand near the door.
export const MEETING = {
  room: "rapat",
  moderator: { x: 10.9, z: 5.75, heading: Math.PI, pose: "write", icon: "🗣" },
  // filled from the meeting table in the furniture layout (office/furniture.js)
  seats: [],
};

// Where agents idle (sofa, arcade, coffee, ...). The spots belong to furniture and are
// filled in place by the furniture manager (office/furniture.js), so they follow the
// layout; each one: { id, room, x, z, heading, pose, icon }.
export const ACTIVITY_SPOTS = [];
