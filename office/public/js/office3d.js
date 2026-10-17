// Low-poly 3D office with pixel-art textures. 1 world unit = 1 floor tile.
// x runs along the old "i" axis, z along "j"; y is up.
import * as THREE from "three";

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
const GATE = { x0: 14, x1: 16 };
const roomAt = (x, z) => ROOMS.find((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) ?? null;
export const PORTAL = { x: 15, z: 16.9 };
export const CENTER = { x: (OFFICE.x0 + OFFICE.x1) / 2, z: (OFFICE.z0 + OFFICE.z1) / 2 };

// One desk + chair per agent. Two rows of single desks; corridors run between
// them (z 11.1) and in front (z 15.2). Slots fill the back row first.
const DESK_COLS = [8, 10.6, 13.2, 15.8, 18.4];
const DESK_ROWS = [8.4, 12.4];
export const DESK_SLOTS = DESK_ROWS.flatMap((z) => DESK_COLS.map((x) => ({ x, z })));
export const seatOf = (slot) => ({ x: slot.x + 0.65, z: slot.z + 1.15 });

export const WANDER = [
  [9.95, 11.1], [14.5, 11.1], [17.75, 11.1], [21.6, 11.1],
  [13.5, 14.3], [17, 14.3], [13.8, 17.9], [16.6, 18.2], [22.6, 10.6],
];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const rand = (seed) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 100000) / 100000;
  };
};

const pixelTexture = (w, h, draw, repeat = [1, 1]) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"));
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  return tex;
};

const matCache = new Map();
const mat = (color, opts = {}) => {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return matCache.get(key);
};

const box = (w, h, d, material, x = 0, y = 0, z = 0, shadow = true) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
};

const isPath = (i, j) => {
  const ring = i >= 3 && i <= 27 && j >= 2 && j <= 22 && (i === 3 || i === 27 || j === 2 || j === 22);
  const entrance = (i === 14 || i === 15) && j >= 19 && j <= 22;
  return ring || entrance;
};

// ---------------------------------------------------------------------------
// ground, floor, walls
// ---------------------------------------------------------------------------

const TPX = 16; // texture pixels per tile

const groundTexture = () =>
  pixelTexture(N * TPX, N * TPX, (ctx) => {
    const r = rand(1337);
    const grass = ["#3f852b", "#4e9a34", "#5fae3f", "#74c24f", "#8fd65f"];
    const path = ["#9a917f", "#b0a795", "#c6bead", "#d8d1c2"];
    const flowers = ["#ffe066", "#ff8787", "#ffffff", "#b197fc"];
    for (let j = 0; j < N; j += 1) {
      for (let i = 0; i < N; i += 1) {
        const onPath = isPath(i, j);
        const base = r() < 0.5 ? grass[2] : grass[3];
        for (let y = 0; y < TPX; y += 1) {
          for (let x = 0; x < TPX; x += 1) {
            const n = r();
            let c;
            if (onPath) c = n < 0.1 ? path[0] : n < 0.55 ? path[1] : n < 0.9 ? path[2] : path[3];
            else c = n < 0.08 ? grass[1] : n < 0.13 ? grass[4] : n < 0.16 ? grass[0] : base;
            ctx.fillStyle = c;
            ctx.fillRect(i * TPX + x, j * TPX + y, 1, 1);
          }
        }
        if (onPath) {
          ctx.fillStyle = path[0];
          for (let k = 0; k < 3; k += 1) ctx.fillRect(i * TPX + Math.floor(r() * 13), j * TPX + Math.floor(r() * 15), 3, 1);
        } else if (r() < 0.14) {
          ctx.fillStyle = flowers[Math.floor(r() * flowers.length)];
          const fx = i * TPX + 3 + Math.floor(r() * 10);
          const fy = j * TPX + 3 + Math.floor(r() * 10);
          ctx.fillRect(fx, fy, 2, 2);
        }
      }
    }
  });

const outerGrassTexture = () =>
  pixelTexture(32, 32, (ctx) => {
    const r = rand(99);
    const grass = ["#4e9a34", "#5fae3f", "#5fae3f", "#74c24f"];
    for (let y = 0; y < 32; y += 1) for (let x = 0; x < 32; x += 1) {
      ctx.fillStyle = grass[Math.floor(r() * grass.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }, [40, 40]);

// One 16px tile, styled by the room it belongs to.
const FLOOR_STYLES = {
  tile: { base: "#e6ebef", grout: "#c3ccd5", light: "#f6f9fb", fleck: "#d3dbe2" },
  dark: { base: "#2c3753", grout: "#222b44", light: "#3a4870", fleck: "#4dabf7" },
  wood: { base: "#c08552", grout: "#8d5a2b", light: "#d9a066", fleck: "#a86b3c" },
  carpet: { base: "#5f3dc4", grout: "#5f3dc4", light: "#7048e8", fleck: "#9775fa" },
  marble: { base: "#f1f3f5", grout: "#dee2e6", light: "#ffffff", fleck: "#e9c46a" },
};

const drawFloorTile = (ctx, ox, oz, style) => {
  const c = FLOOR_STYLES[style];
  ctx.fillStyle = c.base;
  ctx.fillRect(ox, oz, TPX, TPX);
  if (style === "wood") {
    // planks: a seam every 4px, staggered joints
    ctx.fillStyle = c.grout;
    for (let y = 3; y < TPX; y += 4) ctx.fillRect(ox, oz + y, TPX, 1);
    ctx.fillRect(ox + 5, oz, 1, 3); ctx.fillRect(ox + 11, oz + 4, 1, 3); ctx.fillRect(ox + 3, oz + 8, 1, 3); ctx.fillRect(ox + 13, oz + 12, 1, 3);
    ctx.fillStyle = c.light;
    ctx.fillRect(ox + 1, oz + 1, 4, 1); ctx.fillRect(ox + 7, oz + 9, 4, 1);
    return;
  }
  if (style === "carpet") {
    ctx.fillStyle = c.fleck;
    for (let k = 0; k < 6; k += 1) ctx.fillRect(ox + ((k * 7) % TPX), oz + ((k * 5 + 3) % TPX), 1, 1);
    ctx.fillStyle = c.light;
    ctx.fillRect(ox + 4, oz + 12, 1, 1); ctx.fillRect(ox + 12, oz + 2, 1, 1);
    return;
  }
  ctx.fillStyle = c.grout;
  ctx.fillRect(ox, oz + TPX - 1, TPX, 1);
  ctx.fillRect(ox + TPX - 1, oz, 1, TPX);
  ctx.fillStyle = c.light;
  ctx.fillRect(ox + 1, oz + 1, 6, 1);
  ctx.fillRect(ox + 1, oz + 1, 1, 6);
  ctx.fillStyle = c.fleck;
  if (style === "dark") ctx.fillRect(ox + 6, oz + 7, 4, 1);
  else if (style === "marble") { ctx.fillRect(ox + 3, oz + 11, 5, 1); ctx.fillRect(ox + 8, oz + 4, 1, 1); }
  else ctx.fillRect(ox + 9, oz + 10, 2, 1);
};

const floorTexture = () => {
  const w = OFFICE.x1 - OFFICE.x0;
  const h = OFFICE.z1 - OFFICE.z0;
  return pixelTexture(w * TPX, h * TPX, (ctx) => {
    for (let tz = 0; tz < h; tz += 1) {
      for (let tx = 0; tx < w; tx += 1) {
        const room = roomAt(OFFICE.x0 + tx + 0.5, OFFICE.z0 + tz + 0.5);
        drawFloorTile(ctx, tx * TPX, tz * TPX, room?.floor ?? "tile");
      }
    }
  });
};

const screenTexture = () =>
  pixelTexture(16, 12, (ctx) => {
    ctx.fillStyle = "#2f74b5";
    ctx.fillRect(0, 0, 16, 12);
    ctx.fillStyle = "#9bd1ff";
    [[2, 2, 8], [2, 4, 5], [2, 6, 10], [2, 8, 6]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 1));
    ctx.fillStyle = "#ff8787";
    ctx.fillRect(11, 7, 3, 3);
  });

const windowTexture = () =>
  pixelTexture(16, 16, (ctx) => {
    ctx.fillStyle = "#1a2138";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#5fb8ff";
    ctx.fillRect(1, 1, 6, 14);
    ctx.fillRect(9, 1, 6, 14);
    ctx.fillStyle = "#b9e3ff";
    ctx.fillRect(1, 1, 6, 2);
    ctx.fillRect(9, 1, 6, 2);
    ctx.fillRect(2, 5, 1, 4);
    ctx.fillRect(10, 5, 1, 4);
  });

// ---------------------------------------------------------------------------
// props
// ---------------------------------------------------------------------------

const C = {
  wall: "#2f3b5c", wallTop: "#46557f", trim: "#4dabf7",
  deskTop: "#f1f4f7", deskSide: "#c3ccd5", leg: "#39404d",
  monitor: "#252a36", chair: "#fab005", chairDark: "#e67700", chairBase: "#343a40",
  rack: "#2a3148", lampPole: "#2b2f3a", planter: "#6b7280", soil: "#5c3d24",
  bush: ["#2f8a3e", "#40a94f", "#63c96b"], trunk: "#7a4a24",
  leaves: ["#318a2f", "#45a83a", "#62c450", "#86dc6b"], pine: ["#25793a", "#33964a", "#4db862"],
  rail: "#8a97a8", cabinet: "#3a4256",
};

// Single desk (1.3 x 0.75) with one wide monitor and a personal item that
// differs per desk so the room does not look copy-pasted.
const makeDesk = (screenTex, index = 0) => {
  const g = new THREE.Group();
  g.add(box(1.3, 0.06, 0.75, mat(C.deskTop), 0.65, 0.55, 0.375));
  for (const [x, z] of [[0.06, 0.06], [1.24, 0.06], [0.06, 0.69], [1.24, 0.69]]) g.add(box(0.05, 0.52, 0.05, mat(C.leg), x, 0.26, z));
  g.add(box(0.42, 0.42, 0.66, mat(C.deskSide), 1.04, 0.31, 0.37)); // drawer unit
  g.add(box(0.06, 0.12, 0.06, mat(C.leg), 0.6, 0.64, 0.2));
  g.add(box(0.78, 0.44, 0.05, mat(C.monitor), 0.6, 0.92, 0.18));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.36), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.set(0.6, 0.92, 0.21);
  g.add(screen);
  g.add(box(0.5, 0.02, 0.16, mat("#495057"), 0.55, 0.59, 0.5)); // keyboard
  g.add(box(0.07, 0.02, 0.1, mat("#868e96"), 0.92, 0.59, 0.5)); // mouse
  const item = index % 5;
  if (item === 0) {
    g.add(box(0.12, 0.1, 0.12, mat("#c97b45"), 1.15, 0.63, 0.2));
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), mat(C.bush[1]));
    leaf.position.set(1.15, 0.76, 0.2);
    leaf.castShadow = true;
    g.add(leaf);
  } else if (item === 1) {
    g.add(box(0.08, 0.1, 0.08, mat("#fa5252"), 1.12, 0.63, 0.5));
  } else if (item === 2) {
    g.add(box(0.1, 0.16, 0.08, mat("#ffd43b"), 1.12, 0.66, 0.2)); // figurine
    g.add(box(0.12, 0.08, 0.1, mat("#e03131"), 1.12, 0.78, 0.2));
  } else if (item === 3) {
    ["#4dabf7", "#69db7c", "#ffa94d"].forEach((c, k) => g.add(box(0.22, 0.04, 0.16, mat(c), 1.1, 0.6 + k * 0.045, 0.22))); // books
  } else {
    g.add(box(0.03, 0.26, 0.03, mat(C.leg), 1.15, 0.71, 0.15)); // desk lamp
    g.add(box(0.14, 0.06, 0.1, mat("#fab005"), 1.12, 0.86, 0.2));
  }
  return g;
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

const cone = (r, h, material, x, y, z, segments = 4) => {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

const canvasTexture = (w, h, draw) => {
  const tex = pixelTexture(w, h, draw);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

// Glass partition walls with door gaps, a name sign above each door, and the
// meeting room furniture.
const signTexture = (text) => canvasTexture(128, 16, (ctx) => {
  ctx.fillStyle = "#1a2138"; ctx.fillRect(0, 0, 128, 16);
  ctx.fillStyle = "#ffd43b"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 8);
});

const addRooms = (scene, top) => {
  const glass = new THREE.MeshLambertMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.28, depthWrite: false });
  const frame = mat("#46557f");
  const H = 1.25;
  // one straight wall piece from a to b along x ("x") or along z ("z")
  const piece = (along, at, a, b) => {
    const len = b - a;
    if (len <= 0.01) return;
    const mid = a + len / 2;
    const [x, z, sx, sz] = along === "x" ? [mid, at, len, 0.06] : [at, mid, 0.06, len];
    const pane = new THREE.Mesh(new THREE.BoxGeometry(sx, H, sz), glass);
    pane.position.set(x, top + H / 2, z);
    scene.add(pane);
    scene.add(box(along === "x" ? len : 0.1, 0.08, along === "x" ? 0.1 : len, frame, x, top + H, z, false)); // top rail
    scene.add(box(along === "x" ? len : 0.1, 0.12, along === "x" ? 0.1 : len, frame, x, top + 0.06, z, false)); // base
    for (let p = a; p <= b + 0.001; p += 1.5) {
      scene.add(along === "x" ? box(0.07, H, 0.1, frame, p, top + H / 2, at, false) : box(0.1, H, 0.07, frame, at, top + H / 2, p, false));
    }
  };
  for (const room of ROOMS) {
    for (const wall of room.walls) {
      const gaps = [...(wall.gaps ?? [])].sort((g1, g2) => g1[0] - g2[0]);
      let cursor = wall.from;
      for (const [g0, g1] of gaps) {
        piece(wall.along, wall.at, cursor, g0);
        // door posts and lintel
        for (const p of [g0, g1]) scene.add(wall.along === "x" ? box(0.1, H + 0.2, 0.12, frame, p, top + (H + 0.2) / 2, wall.at, false) : box(0.12, H + 0.2, 0.1, frame, wall.at, top + (H + 0.2) / 2, p, false));
        if (wall.along === "x") scene.add(box(g1 - g0, 0.1, 0.12, frame, (g0 + g1) / 2, top + H + 0.15, wall.at, false));
        else scene.add(box(0.12, 0.1, g1 - g0, frame, wall.at, top + H + 0.15, (g0 + g1) / 2, false));
        cursor = g1;
      }
      piece(wall.along, wall.at, cursor, wall.to);
    }
    // name sign above the door (facing the work area), or on the floor for open rooms
    if (room.door) {
      const wall = room.walls.find((w) => w.gaps?.length);
      const [g0, g1] = wall.gaps[0];
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), new THREE.MeshBasicMaterial({ map: signTexture(room.name), side: THREE.DoubleSide }));
      const towardWork = room.door.outside.z > room.door.inside.z ? 1 : -1;
      sign.position.set((g0 + g1) / 2, top + H + 0.42, wall.at + towardWork * 0.07);
      if (towardWork < 0) sign.rotation.y = Math.PI;
      scene.add(sign);
    } else {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.3), new THREE.MeshBasicMaterial({ map: signTexture(room.name), transparent: true }));
      sign.rotation.x = -Math.PI / 2;
      sign.position.set((room.x0 + room.x1) / 2, top + 0.015, room.z1 - 0.45);
      scene.add(sign);
    }
  }

  // meeting room: table + four chairs (seats are ACTIVITY_SPOTS meeting-1..4)
  const table = new THREE.Group();
  table.add(box(2.2, 0.06, 1.0, mat("#8d5a2b"), 0, 0.55, 0));
  for (const [x, z] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) table.add(box(0.06, 0.52, 0.06, mat("#5a3418"), x, 0.26, z));
  table.add(box(0.5, 0.02, 0.3, mat("#f8f9fa"), -0.3, 0.59, 0.1)); // papers
  table.add(box(0.36, 0.04, 0.26, mat("#343a40"), 0.5, 0.6, -0.05)); // laptop
  table.position.set(8.6, top, 6.6);
  scene.add(table);
  for (const spot of ACTIVITY_SPOTS.filter((s) => s.pose === "meeting")) {
    const chair = makeChair();
    chair.position.set(spot.x, top, spot.z);
    chair.rotation.y = spot.heading === 0 ? Math.PI : 0; // backrest behind the sitter
    scene.add(chair);
  }
};

const addDecor = (scene, top, animated) => {
  const place = (obj, x, z, rotY = 0) => {
    obj.position.set(x, top, z);
    obj.rotation.y = rotY;
    scene.add(obj);
    return obj;
  };

  // --- lounge: rug, sofa, coffee table, bean bags ---
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshLambertMaterial({ map: canvasTexture(34, 26, (ctx) => {
    ctx.fillStyle = "#c2255c"; ctx.fillRect(0, 0, 34, 26);
    ctx.fillStyle = "#f783ac"; ctx.fillRect(2, 2, 30, 22);
    ctx.fillStyle = "#c2255c"; ctx.fillRect(4, 4, 26, 18);
    ctx.fillStyle = "#ffdeeb"; for (let i = 6; i < 28; i += 4) ctx.fillRect(i, 12, 2, 2);
  }) }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(9.6, top + 0.012, 17.3);
  rug.receiveShadow = true;
  scene.add(rug);
  const sofa = new THREE.Group();
  sofa.add(box(0.7, 0.32, 2.0, mat("#1971c2"), 0, 0.16, 0));
  sofa.add(box(0.2, 0.42, 2.0, mat("#1864ab"), -0.27, 0.5, 0));
  for (const z of [-1.0, 1.0]) sofa.add(box(0.7, 0.24, 0.16, mat("#1864ab"), 0, 0.4, z));
  for (const z of [-0.45, 0.45]) sofa.add(box(0.5, 0.06, 0.82, mat("#4dabf7"), 0.03, 0.35, z));
  place(sofa, 9.6, 18.55, Math.PI / 2);
  const table = new THREE.Group();
  table.add(box(0.9, 0.06, 0.6, mat("#8d5a2b"), 0, 0.32, 0));
  for (const [x, z] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) table.add(box(0.05, 0.3, 0.05, mat("#5a3418"), x, 0.15, z));
  table.add(box(0.08, 0.1, 0.08, mat("#ffffff"), 0.2, 0.4, 0.1));
  table.add(box(0.26, 0.03, 0.2, mat("#e64980"), -0.15, 0.36, -0.05));
  place(table, 9.6, 17.3);
  for (const [x, z, c] of [[8.4, 16.35, "#f59f00"], [10.9, 16.35, "#7048e8"]]) {
    const bag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), mat(c));
    bag.scale.set(1, 0.6, 1);
    bag.position.set(x, top + 0.2, z);
    bag.castShadow = true;
    scene.add(bag);
  }

  // --- pantry counter with coffee machine and microwave (left wall) ---
  const pantry = new THREE.Group();
  pantry.add(box(0.6, 0.85, 1.4, mat("#dee2e6"), 0, 0.425, 0));
  pantry.add(box(0.64, 0.05, 1.44, mat("#495057"), 0, 0.87, 0));
  pantry.add(box(0.36, 0.42, 0.3, mat("#343a40"), 0, 1.1, -0.3)); // coffee machine
  pantry.add(box(0.04, 0.08, 0.1, new THREE.MeshBasicMaterial({ color: "#51cf66" }), 0.18, 1.2, -0.3));
  pantry.add(box(0.4, 0.26, 0.42, mat("#f1f3f5"), 0, 1.02, 0.35)); // microwave
  pantry.add(box(0.02, 0.18, 0.26, mat("#212529"), 0.21, 1.02, 0.32));
  place(pantry, OFFICE.x0 + 0.35, 15.75);
  const steam = new THREE.Group();
  for (let k = 0; k < 3; k += 1) {
    const puff = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.6 }));
    steam.add(puff);
  }
  steam.position.set(OFFICE.x0 + 0.42, top + 1.35, 15.45);
  scene.add(steam);
  animated.push((t) => steam.children.forEach((p, k) => {
    const phase = ((t / 1400) + k / 3) % 1;
    p.position.set(Math.sin(phase * 6 + k) * 0.04, phase * 0.4, 0);
    p.material.opacity = 0.6 * (1 - phase);
  }));

  // --- aquarium with swimming fish ---
  const tankStand = box(0.5, 0.7, 1.0, mat("#5c3d24"), 0, 0.35, 0);
  const aquarium = new THREE.Group();
  aquarium.add(tankStand);
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.96), new THREE.MeshLambertMaterial({ color: "#4dabf7", transparent: true, opacity: 0.45 }));
  water.position.y = 0.96;
  aquarium.add(water);
  aquarium.add(box(0.48, 0.04, 0.98, mat("#212529"), 0, 1.23, 0));
  aquarium.add(box(0.44, 0.06, 0.94, mat("#e9c46a"), 0, 0.74, 0)); // sand
  for (const z of [-0.3, 0.25]) aquarium.add(cone(0.04, 0.26, mat("#2f9e44"), 0, 0.9, z, 5));
  const fish = ["#ff922b", "#ffd43b", "#f06595"].map((c) => {
    const f = new THREE.Group();
    f.add(box(0.03, 0.06, 0.1, new THREE.MeshBasicMaterial({ color: c }), 0, 0, 0));
    f.add(box(0.025, 0.05, 0.04, new THREE.MeshBasicMaterial({ color: c }), 0, 0, -0.07));
    aquarium.add(f);
    return f;
  });
  place(aquarium, OFFICE.x0 + 0.3, 17.6);
  animated.push((t) => fish.forEach((f, k) => {
    const a = t / (1600 + k * 400) + k * 2;
    f.position.set(Math.sin(a * 0.7) * 0.1, 0.9 + Math.sin(a * 1.3) * 0.12, Math.sin(a) * 0.38);
    f.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI;
  }));

  // --- bookshelf (left wall, near the back) ---
  const shelf = new THREE.Group();
  shelf.add(box(0.4, 1.5, 1.1, mat("#8d5a2b"), 0, 0.75, 0));
  const bookColors = ["#e03131", "#1971c2", "#2f9e44", "#f59f00", "#7048e8", "#0c8599"];
  for (let row = 0; row < 4; row += 1) {
    shelf.add(box(0.36, 0.03, 1.04, mat("#5a3418"), 0.03, 0.2 + row * 0.35, 0));
    for (let k = 0; k < 7; k += 1) shelf.add(box(0.26, 0.24 + ((k + row) % 3) * 0.03, 0.1, mat(bookColors[(k + row) % 6]), 0.08, 0.34 + row * 0.35, -0.42 + k * 0.14));
  }
  place(shelf, OFFICE.x0 + 0.25, 7.1);

  // --- whiteboard with sticky notes (back wall) ---
  const boardTex = canvasTexture(64, 32, (ctx) => {
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(0, 0, 64, 1); ctx.fillRect(0, 31, 64, 1);
    ctx.fillStyle = "#495057"; ctx.fillRect(3, 3, 14, 1); ctx.fillRect(25, 3, 14, 1); ctx.fillRect(47, 3, 14, 1);
    const notes = [["#ffd43b", 3, 7], ["#69db7c", 3, 15], ["#ffa8a8", 25, 7], ["#74c0fc", 25, 15], ["#ffd43b", 25, 23], ["#69db7c", 47, 7]];
    for (const [c, x, y] of notes) { ctx.fillStyle = c; ctx.fillRect(x, y, 10, 6); ctx.fillStyle = "#868e96"; ctx.fillRect(x + 2, y + 2, 6, 1); }
    ctx.fillStyle = "#e03131"; ctx.fillRect(20, 26, 3, 3);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.position.set(10.8, top + 1.05, OFFICE.z0 + 0.012);
  scene.add(board);
  scene.add(box(2.3, 0.06, 0.06, mat("#868e96"), 10.8, top + 0.52, OFFICE.z0 + 0.04, false));

  // --- neon sign (back wall) ---
  const neonTex = canvasTexture(128, 20, (ctx) => {
    ctx.fillStyle = "#1a2138"; ctx.fillRect(0, 0, 128, 20);
    ctx.font = "bold 11px monospace"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#ff8cc6"; ctx.fillText("AGENTIC DIGITAL", 4, 10);
    ctx.fillStyle = "#74c0fc"; ctx.fillText("OFFICE", 92, 10);
  });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), new THREE.MeshBasicMaterial({ map: neonTex }));
  neon.position.set(15.6, top + 1.45, OFFICE.z0 + 0.012);
  scene.add(neon);
  animated.push((t) => { neon.material.color.setScalar(Math.floor(t / 2600) % 7 === 0 && (t % 2600) < 160 ? 0.55 : 1); });

  // --- wall clock (left wall) ---
  const clockTex = canvasTexture(16, 16, (ctx) => {
    ctx.fillStyle = "#212529"; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = "#212529"; ctx.fillRect(7, 3, 2, 6); ctx.fillRect(8, 7, 4, 2);
  });
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: clockTex }));
  clock.rotation.y = Math.PI / 2;
  clock.position.set(OFFICE.x0 + 0.012, top + 1.35, 12.6);
  scene.add(clock);

  // --- arcade cabinets (right side, facing into the room) ---
  const arcadeScreens = [];
  for (const [z, body] of [[15.6, "#e03131"], [16.6, "#1971c2"]]) {
    const cab = new THREE.Group();
    cab.add(box(0.55, 1.5, 0.6, mat(body), 0, 0.75, 0));
    cab.add(box(0.2, 0.12, 0.56, mat("#212529"), -0.32, 0.95, 0)); // control panel
    cab.add(box(0.06, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: "#ffd43b" }), -0.38, 1.03, -0.12));
    cab.add(box(0.05, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: "#51cf66" }), -0.38, 1.03, 0.1));
    const screenMat = new THREE.MeshBasicMaterial({ color: "#2b8a3e" });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36), screenMat);
    scr.rotation.y = -Math.PI / 2;
    scr.position.set(-0.281, 1.22, 0);
    cab.add(scr);
    cab.add(box(0.56, 0.16, 0.62, mat("#212529"), 0, 1.52, 0));
    arcadeScreens.push(screenMat);
    place(cab, OFFICE.x1 - 0.55, z);
  }
  const arcadeColors = ["#2b8a3e", "#5f3dc4", "#c92a2a", "#1971c2", "#e67700"];
  animated.push((t) => arcadeScreens.forEach((m, k) => m.color.set(arcadeColors[Math.floor(t / 450 + k * 2) % arcadeColors.length])));

  // --- ping-pong table (front right) ---
  const pp = new THREE.Group();
  pp.add(box(2.0, 0.05, 1.1, mat("#1864ab"), 0, 0.5, 0));
  pp.add(box(2.0, 0.006, 0.03, mat("#ffffff"), 0, 0.53, 0));
  pp.add(box(0.03, 0.12, 1.14, mat("#f1f3f5"), 0, 0.58, 0)); // net
  for (const [x, z] of [[-0.9, -0.48], [0.9, -0.48], [-0.9, 0.48], [0.9, 0.48]]) pp.add(box(0.05, 0.48, 0.05, mat("#343a40"), x, 0.24, z));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: "#ff922b" }));
  pp.add(ball);
  place(pp, 20.6, 17.6);
  animated.push((t) => {
    const ph = (t / 900) % 2;
    const x = ph < 1 ? -0.85 + ph * 1.7 : 0.85 - (ph - 1) * 1.7;
    ball.position.set(x, 0.56 + Math.abs(Math.sin(ph * Math.PI)) * 0.25, Math.sin(t / 700) * 0.2);
  });

  // --- big potted plants in the corners ---
  for (const [x, z] of [[19.5, OFFICE.z0 + 0.5], [OFFICE.x1 - 0.5, OFFICE.z1 - 0.5], [11.5, OFFICE.z1 - 0.45], [12.5, 15.5], [17.5, 15.5]]) {
    const pot = new THREE.Group();
    pot.add(box(0.36, 0.4, 0.36, mat("#d9480f"), 0, 0.2, 0));
    for (let k = 0; k < 5; k += 1) {
      const leaf = cone(0.12, 0.6, mat(C.leaves[k % 4]), Math.cos(k * 1.3) * 0.12, 0.7, Math.sin(k * 1.3) * 0.12, 4);
      leaf.rotation.set(Math.sin(k) * 0.4, 0, Math.cos(k) * 0.4);
      pot.add(leaf);
    }
    place(pot, x, z);
  }
};

const makeChair = () => {
  const g = new THREE.Group();
  g.add(box(0.42, 0.08, 0.42, mat(C.chair), 0, 0.36, 0));
  g.add(box(0.42, 0.46, 0.08, mat(C.chair), 0, 0.62, 0.2));
  g.add(box(0.36, 0.06, 0.06, mat(C.chairDark), 0, 0.42, 0.2));
  g.add(box(0.05, 0.3, 0.05, mat(C.chairBase), 0, 0.18, 0));
  g.add(box(0.4, 0.04, 0.04, mat(C.chairBase), 0, 0.03, 0));
  g.add(box(0.04, 0.04, 0.4, mat(C.chairBase), 0, 0.03, 0));
  return g;
};

const makeLamp = (lights) => {
  const g = new THREE.Group();
  g.add(box(0.18, 0.08, 0.18, mat(C.lampPole), 0, 0.04, 0));
  g.add(box(0.06, 1.5, 0.06, mat(C.lampPole), 0, 0.8, 0));
  g.add(box(0.26, 0.05, 0.26, mat("#495057"), 0, 1.72, 0));
  const bulb = box(0.2, 0.2, 0.2, new THREE.MeshBasicMaterial({ color: "#fff3bf" }), 0, 1.6, 0, false);
  g.add(bulb);
  if (lights) {
    const light = new THREE.PointLight("#ffd98a", 0.9, 4, 1.6);
    light.position.set(0, 1.55, 0);
    g.add(light);
  }
  return g;
};

const makePlanter = (seed) => {
  const r = rand(seed);
  const g = new THREE.Group();
  g.add(box(2, 0.3, 0.55, mat(C.planter), 1, 0.15, 0.27));
  g.add(box(1.9, 0.04, 0.45, mat(C.soil), 1, 0.31, 0.27, false));
  for (let k = 0; k < 4; k += 1) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + r() * 0.06, 0), mat(C.bush[k % 3]));
    b.position.set(0.3 + k * 0.47, 0.48, 0.27);
    b.castShadow = true;
    g.add(b);
  }
  return g;
};

const makeBush = (seed) => {
  const r = rand(seed);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + r() * 0.1, 0), mat(C.bush[Math.floor(r() * 3)]));
  b.position.y = 0.22;
  b.castShadow = true;
  const g = new THREE.Group();
  g.add(b);
  return g;
};

const makePine = (scale) => {
  const g = new THREE.Group();
  g.add(box(0.14, 0.5, 0.14, mat(C.trunk), 0, 0.25, 0));
  [[0.75, 0.9, 0.85, 0], [0.58, 0.8, 1.4, 1], [0.38, 0.7, 1.9, 2]].forEach(([rad, h, y, c]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), mat(C.pine[c]));
    cone.position.y = y;
    cone.castShadow = true;
    g.add(cone);
  });
  g.scale.setScalar(scale);
  return g;
};

const makeRoundTree = (scale, seed) => {
  const r = rand(seed);
  const g = new THREE.Group();
  g.add(box(0.16, 0.9, 0.16, mat(C.trunk), 0, 0.45, 0));
  const blobs = [[0, 1.25, 0, 0.62], [-0.35, 1.05, 0.1, 0.4], [0.35, 1.1, -0.1, 0.42], [0.05, 1.65, 0.05, 0.42]];
  blobs.forEach(([x, y, z, rad], k) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 0), mat(C.leaves[(k + Math.floor(r() * 2)) % 4]));
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  });
  g.scale.setScalar(scale);
  return g;
};

const makeRack = () => {
  const g = new THREE.Group();
  g.add(box(0.85, 1.3, 0.65, mat(C.rack), 0, 0.65, 0));
  const colors = ["#51cf66", "#ff6b6b", "#4dabf7", "#ffd43b"];
  for (let row = 0; row < 7; row += 1) {
    g.add(box(0.7, 0.06, 0.02, mat("#11151f"), 0, 0.25 + row * 0.15, 0.335, false));
    const led = box(0.05, 0.04, 0.02, new THREE.MeshBasicMaterial({ color: colors[row % 4] }), -0.25 + (row % 3) * 0.12, 0.25 + row * 0.15, 0.35, false);
    g.add(led);
  }
  return g;
};

const makeCabinet = () => {
  const g = new THREE.Group();
  g.add(box(0.55, 0.8, 0.75, mat(C.cabinet), 0, 0.4, 0));
  for (let row = 0; row < 3; row += 1) g.add(box(0.02, 0.04, 0.2, mat("#ffd43b"), 0.285, 0.18 + row * 0.25, 0, false));
  g.add(box(0.3, 0.06, 0.25, mat("#f8f9fa"), 0, 0.83, 0));
  return g;
};

const makeCooler = () => {
  const g = new THREE.Group();
  g.add(box(0.35, 0.7, 0.35, mat("#ced4da"), 0, 0.35, 0));
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.35, 8), new THREE.MeshLambertMaterial({ color: "#74c0fc", transparent: true, opacity: 0.85 }));
  bottle.position.y = 0.88;
  g.add(bottle);
  return g;
};

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

export const buildOffice = (scene) => {
  const animated = [];

  // outer grass, garden ground, office floor
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshLambertMaterial({ map: outerGrassTexture() }));
  outer.rotation.x = -Math.PI / 2;
  outer.position.set(N / 2, -0.02, N / 2);
  outer.receiveShadow = true;
  scene.add(outer);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(N, N), new THREE.MeshLambertMaterial({ map: groundTexture() }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(N / 2, -0.01, N / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const fw = OFFICE.x1 - OFFICE.x0;
  const fd = OFFICE.z1 - OFFICE.z0;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.08, fd), [
    mat("#c3ccd5"), mat("#c3ccd5"), new THREE.MeshLambertMaterial({ map: floorTexture() }), mat("#c3ccd5"), mat("#aab4bf"), mat("#aab4bf"),
  ]);
  floor.position.set(OFFICE.x0 + fw / 2, 0.0, OFFICE.z0 + fd / 2);
  floor.receiveShadow = true;
  scene.add(floor);
  const top = 0.04;

  // back walls with windows and a glowing trim on the inside
  const winTex = windowTexture();
  const winMat = new THREE.MeshBasicMaterial({ map: winTex });
  const trimMat = new THREE.MeshBasicMaterial({ color: C.trim });
  const wallH = 1.7;
  const backWall = box(fw, wallH, 0.2, mat(C.wall), OFFICE.x0 + fw / 2, top + wallH / 2, OFFICE.z0 - 0.1);
  const sideWall = box(0.2, wallH, fd + 0.2, mat(C.wall), OFFICE.x0 - 0.1, top + wallH / 2, OFFICE.z0 + fd / 2 - 0.1);
  scene.add(backWall, sideWall);
  scene.add(box(fw + 0.2, 0.06, 0.26, mat(C.wallTop), OFFICE.x0 + fw / 2 - 0.1, top + wallH + 0.03, OFFICE.z0 - 0.1, false));
  scene.add(box(0.26, 0.06, fd + 0.2, mat(C.wallTop), OFFICE.x0 - 0.1, top + wallH + 0.03, OFFICE.z0 + fd / 2 - 0.1, false));
  for (let x = OFFICE.x0 + 1; x < OFFICE.x1; x += 2) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), winMat);
    w.position.set(x, top + 1.05, OFFICE.z0 + 0.005);
    scene.add(w);
  }
  for (let z = OFFICE.z0 + 1; z < OFFICE.z1; z += 2) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), winMat);
    w.rotation.y = Math.PI / 2;
    w.position.set(OFFICE.x0 + 0.005, top + 1.05, z);
    scene.add(w);
  }
  scene.add(box(fw, 0.04, 0.02, trimMat, OFFICE.x0 + fw / 2, top + 0.15, OFFICE.z0 + 0.01, false));
  scene.add(box(0.02, 0.04, fd, trimMat, OFFICE.x0 + 0.01, top + 0.15, OFFICE.z0 + fd / 2, false));

  // glass railing on the front and right edges, with a gate into the lobby
  const glass = new THREE.MeshLambertMaterial({ color: "#d6ecff", transparent: true, opacity: 0.35 });
  const railSegment = (x0, x1) => {
    const len = x1 - x0;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.03), glass);
    pane.position.set(x0 + len / 2, top + 0.3, OFFICE.z1);
    scene.add(pane);
    scene.add(box(len, 0.04, 0.06, mat(C.rail), x0 + len / 2, top + 0.56, OFFICE.z1, false));
    for (let x = x0; x <= x1 + 0.001; x += 1) scene.add(box(0.06, 0.58, 0.06, mat(C.rail), x, top + 0.29, OFFICE.z1));
  };
  railSegment(OFFICE.x0, GATE.x0);
  railSegment(GATE.x1, OFFICE.x1);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, fd), glass);
  right.position.set(OFFICE.x1, top + 0.3, OFFICE.z0 + fd / 2);
  scene.add(right);
  scene.add(box(0.06, 0.04, fd, mat(C.rail), OFFICE.x1, top + 0.56, OFFICE.z0 + fd / 2, false));
  for (let z = OFFICE.z0; z <= OFFICE.z1; z += 1) scene.add(box(0.06, 0.58, 0.06, mat(C.rail), OFFICE.x1, top + 0.29, z));

  // desks and chairs: rebuilt to match the team size (setDesks)
  const screenTex = screenTexture();
  const deskGroup = new THREE.Group();
  scene.add(deskGroup);
  let deskCount = -1;
  let deskSeats = [];
  const setDesks = (count) => {
    if (count === deskCount) return deskSeats;
    deskCount = count;
    deskGroup.clear();
    const slots = DESK_SLOTS.slice(0, Math.min(count, DESK_SLOTS.length));
    slots.forEach((slot, i) => {
      const d = makeDesk(screenTex, i);
      d.position.set(slot.x, top, slot.z);
      deskGroup.add(d);
      const seat = seatOf(slot);
      const c = makeChair();
      c.position.set(seat.x, top, seat.z);
      deskGroup.add(c);
    });
    deskSeats = slots.map(seatOf);
    return deskSeats;
  };

  addRooms(scene, top);
  addDecor(scene, top, animated);

  // server corner + floating crystal
  for (const x of [20.85, 21.85, 22.85]) {
    const rack = makeRack();
    rack.position.set(x, top, OFFICE.z0 + 0.45);
    scene.add(rack);
  }
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshLambertMaterial({ color: "#74c0fc", emissive: "#1c7ed6", emissiveIntensity: 0.8, flatShading: true }),
  );
  crystal.scale.set(1, 1.6, 1);
  crystal.position.set(21.85, 2.25, OFFICE.z0 + 1.6);
  scene.add(crystal);
  const crystalLight = new THREE.PointLight("#74c0fc", 1.2, 5, 1.5);
  crystalLight.position.copy(crystal.position);
  scene.add(crystalLight);
  animated.push((t) => {
    crystal.rotation.y = t / 900;
    crystal.position.y = 2.25 + Math.sin(t / 500) * 0.08;
    crystalLight.intensity = 1 + Math.sin(t / 400) * 0.3;
  });

  // summoning circle on the floor
  const portal = new THREE.Group();
  const ringMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
  [[1.3, 1.36, "#4dabf7", 0.9], [0.95, 1.0, "#a5d8ff", 0.9], [0.5, 0.54, "#4dabf7", 0.8]].forEach(([a, b, color, o]) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(a, b, 48), ringMat(color, o));
    ring.rotation.x = -Math.PI / 2;
    portal.add(ring);
  });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), ringMat("#a5d8ff", 0.18));
  glow.rotation.x = -Math.PI / 2;
  portal.add(glow);
  const runes = new THREE.Group();
  for (let k = 0; k < 6; k += 1) {
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), ringMat("#e7f5ff", 0.95));
    rune.rotation.x = -Math.PI / 2;
    const a = (k * Math.PI) / 3;
    rune.position.set(Math.cos(a) * 1.15, 0.001, Math.sin(a) * 1.15);
    runes.add(rune);
  }
  portal.add(runes);
  portal.position.set(PORTAL.x, top + 0.01, PORTAL.z);
  scene.add(portal);
  animated.push((t) => {
    runes.rotation.y = t / 1500;
    glow.material.opacity = 0.12 + (Math.sin(t / 400) + 1) * 0.06;
  });

  // cabinets + cooler along the left wall
  for (const z of [9.5, 10.3]) {
    const c = makeCabinet();
    c.position.set(OFFICE.x0 + 0.35, top, z);
    scene.add(c);
  }
  const cooler = makeCooler();
  cooler.position.set(11.55, top, 15.45);
  scene.add(cooler);

  // lamps (only a few cast real light to stay fast)
  [[23.6, 11, true], [12.7, 18.6, true], [4.6, 21.6, false], [11, 22.6, false], [16, 22.6, true], [21, 22.6, false], [27.6, 17, false], [27.6, 11, false], [27.6, 5, false]]
    .forEach(([x, z, light]) => {
      const l = makeLamp(light);
      l.position.set(x, x < OFFICE.x1 && z < OFFICE.z1 && x > OFFICE.x0 ? top : 0, z);
      scene.add(l);
    });

  // planters and bushes outside the railing
  [[8.5, 1], [11.2, 2], [17, 3], [20.5, 4]].forEach(([x, k]) => {
    const p = makePlanter(40 + k);
    p.position.set(x, 0, OFFICE.z1 + 0.35);
    scene.add(p);
  });
  for (let z = OFFICE.z0 + 1; z <= OFFICE.z1 - 1; z += 2) {
    const b = makeBush(70 + z);
    b.position.set(OFFICE.x1 + 0.6, 0, z);
    scene.add(b);
  }

  // trees around the garden
  const r = rand(4242);
  for (let j = -4; j < N + 4; j += 1) {
    for (let i = -4; i < N + 4; i += 1) {
      const nearOffice = i >= 2 && i <= 28 && j >= 1 && j <= 23;
      if (nearOffice || isPath(i, j)) continue;
      if (r() > 0.3) continue;
      const kind = r();
      const scale = 0.85 + r() * 0.45;
      const tree = kind < 0.45 ? makePine(scale) : kind < 0.85 ? makeRoundTree(scale, Math.floor(r() * 1e6)) : makeBush(Math.floor(r() * 1e6));
      tree.position.set(i + 0.2 + r() * 0.6, 0, j + 0.2 + r() * 0.6);
      tree.rotation.y = r() * Math.PI * 2;
      scene.add(tree);
    }
  }
  for (const [x, z] of [[4.2, 21], [25, 23.6], [28.6, 20], [2.4, 12], [28.6, 8], [13, 23.6]]) {
    const b = makeBush(x * 10 + z);
    b.position.set(x, 0, z);
    scene.add(b);
  }

  return { update: (t) => animated.forEach((fn) => fn(t)), floorTop: top, setDesks };
};
