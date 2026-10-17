// Office layout: size, rooms, desk slots, walking points and activity spots.
// Units: 1 world unit = 1 floor tile. x runs left -> right, z back -> front, y is up.
// Change the floor plan here; the scene, routing and agents all read from it.

export const N = 32;
export const OFFICE = { x0: 6, x1: 24, z0: 5, z1: 19 };
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
    walls: [{ along: "x", at: 15, from: 18, to: 24, gaps: [[21, 22.2]] }, { along: "z", at: 18, from: 15, to: 19 }],
    door: { outside: { x: 21.6, z: 14.3 }, inside: { x: 21.6, z: 15.6 } },
  },
  // The lobby is open towards the work area (no wall, no door).
  { id: "lobby", name: "LOBBY", floor: "marble", x0: 12, x1: 18, z0: 15, z1: 19, walls: [], door: null },
];
// Front gate in the glass railing (opens into the lobby).
export const GATE = { x0: 14, x1: 16 };
export const roomAt = (x, z) => ROOMS.find((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) ?? null;
export const PORTAL = { x: 15, z: 16.9 };
export const CENTER = { x: (OFFICE.x0 + OFFICE.x1) / 2, z: (OFFICE.z0 + OFFICE.z1) / 2 };

// One desk + chair per agent. Two rows of single desks; corridors run between
// them (z 11.1) and in front (z 15.2). Slots fill the back row first.
export const DESK_COLS = [8, 10.6, 13.2, 15.8, 18.4];
export const DESK_ROWS = [8.4, 12.4];
export const DESK_SLOTS = DESK_ROWS.flatMap((z) => DESK_COLS.map((x) => ({ x, z })));
export const seatOf = (slot) => ({ x: slot.x + 0.65, z: slot.z + 1.15 });

export const WANDER = [
  [9.95, 11.1], [14.5, 11.1], [17.75, 11.1], [21.6, 11.1],
  [13.5, 14.3], [17, 14.3], [13.8, 17.9], [16.6, 18.2], [22.6, 10.6],
];

export const isPath = (i, j) => {
  const ring = i >= 3 && i <= 27 && j >= 2 && j <= 22 && (i === 3 || i === 27 || j === 2 || j === 22);
  const entrance = (i === 14 || i === 15) && j >= 19 && j <= 22;
  return ring || entrance;
};

// ---------------------------------------------------------------------------
// Decor and activity spots (agents walk here when idle)
// ---------------------------------------------------------------------------

// pose: how the agent is animated while there; icon shows on the name tag.
export const ACTIVITY_SPOTS = [
  // Pantry & Lounge
  { id: "coffee", room: "lounge", x: 7.15, z: 15.75, heading: -Math.PI / 2, pose: "drink", icon: "☕" },
  { id: "aquarium", room: "lounge", x: 7.15, z: 17.6, heading: -Math.PI / 2, pose: "look", icon: "🐟" },
  { id: "sofa-1", room: "lounge", x: 9.1, z: 18.1, heading: Math.PI, pose: "lounge", icon: "🛋" },
  { id: "sofa-2", room: "lounge", x: 10.1, z: 18.1, heading: Math.PI, pose: "lounge", icon: "🛋" },
  { id: "beanbag-1", room: "lounge", x: 8.4, z: 16.35, heading: 0, pose: "beanbag", icon: "🛋" },
  { id: "beanbag-2", room: "lounge", x: 10.9, z: 16.35, heading: 0, pose: "beanbag", icon: "🛋" },
  // Ruang Rapat
  { id: "meeting-1", room: "rapat", x: 8.0, z: 5.65, heading: 0, pose: "meeting", icon: "💬" },
  { id: "meeting-2", room: "rapat", x: 9.2, z: 5.65, heading: 0, pose: "meeting", icon: "💬" },
  { id: "meeting-3", room: "rapat", x: 8.0, z: 7.55, heading: Math.PI, pose: "meeting", icon: "💬" },
  { id: "meeting-4", room: "rapat", x: 9.2, z: 7.55, heading: Math.PI, pose: "meeting", icon: "💬" },
  { id: "books", room: "rapat", x: 7.0, z: 6.6, heading: -Math.PI / 2, pose: "read", icon: "📖" },
  { id: "whiteboard", room: "rapat", x: 10.9, z: 5.75, heading: Math.PI, pose: "write", icon: "✍" },
  // Ruang Server
  { id: "server", room: "server", x: 21.85, z: 6.6, heading: Math.PI, pose: "look", icon: "🖥" },
  // Ruang Game
  { id: "arcade-1", room: "game", x: 22.55, z: 15.6, heading: Math.PI / 2, pose: "play", icon: "🎮" },
  { id: "arcade-2", room: "game", x: 22.55, z: 16.6, heading: Math.PI / 2, pose: "play", icon: "🎮" },
  { id: "pingpong-1", room: "game", x: 19.25, z: 17.6, heading: Math.PI / 2, pose: "pingpong", icon: "🏓" },
  { id: "pingpong-2", room: "game", x: 21.95, z: 17.6, heading: -Math.PI / 2, pose: "pingpong", icon: "🏓" },
];
