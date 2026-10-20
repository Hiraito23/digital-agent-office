// Movable furniture: the catalog (what can be placed), the default layout, and the
// manager that builds, moves, validates and saves the pieces. The 🛠 Layout editor
// (ui/layout-editor.js) drives it; layouts are saved on the server (config/layout.json).
//
// Every item is { id, type, x, z, rot, variant? }: x/z is the centre of its footprint in
// tiles, rot is quarter turns (0-3), variant picks a colour or a personal desk item.
// Activity spots (sofa, arcade, chairs, ...) and desk seats belong to their furniture
// and move with it, so agents keep using whatever the layout looks like now.
import * as THREE from "three";
import { box, canvasTexture, cone, mat, prepareFade, setFade } from "./helpers.js";
import { ACTIVITY_SPOTS, BEDS, GATE, LEVELS, LIFT, MEETING, PORTAL, ROOMS, levelTop, roomAt } from "./layout.js";

// Bump this when the floor plan changes: layouts saved for an older plan are ignored.
export const LAYOUT_VERSION = 4;
import { C, makeCabinet, makeChair, makeCooler, makeDesk, makeRack } from "./props.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Rotates a local (x, z) offset by `rot` quarter turns, like THREE's rotation.y does.
const rot = (r, x, z) => [[x, z], [z, -x], [-x, -z], [-z, x]][((r % 4) + 4) % 4];
const norm = (r) => ((Math.round(r) % 4) + 4) % 4;

// ---------------------------------------------------------------------------
// Catalog. Every builder returns a Group whose origin is the centre of the footprint
// on the floor. A builder may set group.userData.tick(t) for animation.
// rects: footprint pieces in local coordinates { x, z, w, d } (used for collisions).
// spots: where agents stand/sit, in local coordinates (heading is relative to the item).
// ---------------------------------------------------------------------------

const rugTexture = (() => {
  let tex = null;
  return () => tex ??= canvasTexture(34, 26, (ctx) => {
    ctx.fillStyle = "#c2255c"; ctx.fillRect(0, 0, 34, 26);
    ctx.fillStyle = "#f783ac"; ctx.fillRect(2, 2, 30, 22);
    ctx.fillStyle = "#c2255c"; ctx.fillRect(4, 4, 26, 18);
    ctx.fillStyle = "#ffdeeb"; for (let i = 6; i < 28; i += 4) ctx.fillRect(i, 12, 2, 2);
  });
})();

const BEANBAG_COLORS = ["#f59f00", "#7048e8", "#e64980", "#12b886"];
const BLANKET_COLORS = ["#4dabf7", "#f06595", "#51cf66", "#ffa94d"];
const ARCADE_COLORS = ["#e03131", "#1971c2", "#2b8a3e", "#f59f00"];
const ARCADE_SCREEN = ["#2b8a3e", "#5f3dc4", "#c92a2a", "#1971c2", "#e67700"];

export const CATALOG = {
  desk: {
    label: "Meja kerja", icon: "🖥", variants: 5, max: 40,
    rects: [{ x: 0, z: 0, w: 1.3, d: 0.75 }, { x: 0, z: 0.775, w: 0.5, d: 0.5 }],
    // the agent sits on the chair; the seat belongs to the desk in layout order
    seat: { dx: 0, dz: 0.775, heading: Math.PI },
    build: (ctx, item) => {
      const g = new THREE.Group();
      const d = makeDesk(ctx.screenTex, item.variant ?? 0);
      d.position.set(-0.65, 0, -0.375);
      g.add(d);
      const c = makeChair();
      c.position.set(0, 0, 0.775);
      g.add(c);
      return g;
    },
  },
  sofa: {
    label: "Sofa", icon: "🛋",
    rects: [{ x: 0, z: 0, w: 0.7, d: 2.0 }],
    spots: [
      { id: "a", dx: 0.45, dz: -0.5, heading: Math.PI / 2, pose: "lounge", icon: "🛋" },
      { id: "b", dx: 0.45, dz: 0.5, heading: Math.PI / 2, pose: "lounge", icon: "🛋" },
    ],
    build: () => {
      const g = new THREE.Group();
      g.add(box(0.7, 0.32, 2.0, mat("#1971c2"), 0, 0.16, 0));
      g.add(box(0.2, 0.42, 2.0, mat("#1864ab"), -0.27, 0.5, 0));
      for (const z of [-1.0, 1.0]) g.add(box(0.7, 0.24, 0.16, mat("#1864ab"), 0, 0.4, z));
      for (const z of [-0.45, 0.45]) g.add(box(0.5, 0.06, 0.82, mat("#4dabf7"), 0.03, 0.35, z));
      return g;
    },
  },
  "coffee-table": {
    label: "Meja kopi", icon: "☕",
    rects: [{ x: 0, z: 0, w: 0.9, d: 0.6 }],
    build: () => {
      const g = new THREE.Group();
      g.add(box(0.9, 0.06, 0.6, mat("#8d5a2b"), 0, 0.32, 0));
      for (const [x, z] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) g.add(box(0.05, 0.3, 0.05, mat("#5a3418"), x, 0.15, z));
      g.add(box(0.08, 0.1, 0.08, mat("#ffffff"), 0.2, 0.4, 0.1));
      g.add(box(0.26, 0.03, 0.2, mat("#e64980"), -0.15, 0.36, -0.05));
      return g;
    },
  },
  beanbag: {
    label: "Bean bag", icon: "🟠", variants: 4,
    rects: [{ x: 0, z: 0, w: 0.75, d: 0.75 }],
    spots: [{ id: "a", dx: 0, dz: 0, heading: 0, pose: "beanbag", icon: "🛋" }],
    build: (ctx, item) => {
      const g = new THREE.Group();
      const bag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), mat(BEANBAG_COLORS[(item.variant ?? 0) % BEANBAG_COLORS.length]));
      bag.scale.set(1, 0.6, 1);
      bag.position.y = 0.2;
      bag.castShadow = true;
      g.add(bag);
      return g;
    },
  },
  rug: {
    label: "Karpet", icon: "🟥", floor: true,
    rects: [{ x: 0, z: 0, w: 3.4, d: 2.6 }],
    build: () => {
      const g = new THREE.Group();
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshLambertMaterial({ map: rugTexture() }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.y = 0.012;
      rug.receiveShadow = true;
      g.add(rug);
      return g;
    },
  },
  counter: {
    label: "Pantry kopi", icon: "☕",
    rects: [{ x: 0, z: 0, w: 0.6, d: 1.4 }],
    spots: [{ id: "a", dx: 0.8, dz: 0, heading: -Math.PI / 2, pose: "drink", icon: "☕" }],
    build: () => {
      const g = new THREE.Group();
      g.add(box(0.6, 0.85, 1.4, mat("#dee2e6"), 0, 0.425, 0));
      g.add(box(0.64, 0.05, 1.44, mat("#495057"), 0, 0.87, 0));
      g.add(box(0.36, 0.42, 0.3, mat("#343a40"), 0, 1.1, -0.3)); // coffee machine
      g.add(box(0.04, 0.08, 0.1, new THREE.MeshBasicMaterial({ color: "#51cf66" }), 0.18, 1.2, -0.3));
      g.add(box(0.4, 0.26, 0.42, mat("#f1f3f5"), 0, 1.02, 0.35)); // microwave
      g.add(box(0.02, 0.18, 0.26, mat("#212529"), 0.21, 1.02, 0.32));
      const steam = new THREE.Group();
      for (let k = 0; k < 3; k += 1) steam.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.6 })));
      steam.position.set(0.07, 1.35, -0.3);
      g.add(steam);
      g.userData.tick = (t) => steam.children.forEach((p, k) => {
        const phase = ((t / 1400) + k / 3) % 1;
        p.position.set(Math.sin(phase * 6 + k) * 0.04, phase * 0.4, 0);
        p.material.opacity = 0.6 * (1 - phase);
      });
      return g;
    },
  },
  aquarium: {
    label: "Akuarium", icon: "🐟",
    rects: [{ x: 0, z: 0, w: 0.5, d: 1.0 }],
    spots: [{ id: "a", dx: 0.85, dz: 0, heading: -Math.PI / 2, pose: "look", icon: "🐟" }],
    build: () => {
      const g = new THREE.Group();
      g.add(box(0.5, 0.7, 1.0, mat("#5c3d24"), 0, 0.35, 0));
      const water = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.96), new THREE.MeshLambertMaterial({ color: "#4dabf7", transparent: true, opacity: 0.45 }));
      water.position.y = 0.96;
      g.add(water);
      g.add(box(0.48, 0.04, 0.98, mat("#212529"), 0, 1.23, 0));
      g.add(box(0.44, 0.06, 0.94, mat("#e9c46a"), 0, 0.74, 0)); // sand
      for (const z of [-0.3, 0.25]) g.add(cone(0.04, 0.26, mat("#2f9e44"), 0, 0.9, z, 5));
      const fish = ["#ff922b", "#ffd43b", "#f06595"].map((c) => {
        const f = new THREE.Group();
        f.add(box(0.03, 0.06, 0.1, new THREE.MeshBasicMaterial({ color: c }), 0, 0, 0));
        f.add(box(0.025, 0.05, 0.04, new THREE.MeshBasicMaterial({ color: c }), 0, 0, -0.07));
        g.add(f);
        return f;
      });
      g.userData.tick = (t) => fish.forEach((f, k) => {
        const a = t / (1600 + k * 400) + k * 2;
        f.position.set(Math.sin(a * 0.7) * 0.1, 0.9 + Math.sin(a * 1.3) * 0.12, Math.sin(a) * 0.38);
        f.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI;
      });
      return g;
    },
  },
  bookshelf: {
    label: "Rak buku", icon: "📚",
    rects: [{ x: 0, z: 0, w: 0.4, d: 1.1 }],
    spots: [{ id: "a", dx: 0.75, dz: -0.5, heading: -Math.PI / 2, pose: "read", icon: "📖" }],
    build: () => {
      const g = new THREE.Group();
      g.add(box(0.4, 1.5, 1.1, mat("#8d5a2b"), 0, 0.75, 0));
      const bookColors = ["#e03131", "#1971c2", "#2f9e44", "#f59f00", "#7048e8", "#0c8599"];
      for (let row = 0; row < 4; row += 1) {
        g.add(box(0.36, 0.03, 1.04, mat("#5a3418"), 0.03, 0.2 + row * 0.35, 0));
        for (let k = 0; k < 7; k += 1) g.add(box(0.26, 0.24 + ((k + row) % 3) * 0.03, 0.1, mat(bookColors[(k + row) % 6]), 0.08, 0.34 + row * 0.35, -0.42 + k * 0.14));
      }
      return g;
    },
  },
  arcade: {
    label: "Mesin arcade", icon: "🎮", variants: 4,
    rects: [{ x: 0, z: 0, w: 0.6, d: 0.6 }],
    spots: [{ id: "a", dx: -0.9, dz: 0, heading: Math.PI / 2, pose: "play", icon: "🎮" }],
    build: (ctx, item) => {
      const v = item.variant ?? 0;
      const g = new THREE.Group();
      g.add(box(0.55, 1.5, 0.6, mat(ARCADE_COLORS[v % ARCADE_COLORS.length]), 0, 0.75, 0));
      g.add(box(0.2, 0.12, 0.56, mat("#212529"), -0.32, 0.95, 0)); // control panel
      g.add(box(0.06, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: "#ffd43b" }), -0.38, 1.03, -0.12));
      g.add(box(0.05, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: "#51cf66" }), -0.38, 1.03, 0.1));
      const screenMat = new THREE.MeshBasicMaterial({ color: "#2b8a3e" });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36), screenMat);
      scr.rotation.y = -Math.PI / 2;
      scr.position.set(-0.281, 1.22, 0);
      g.add(scr);
      g.add(box(0.56, 0.16, 0.62, mat("#212529"), 0, 1.52, 0));
      g.userData.tick = (t) => screenMat.color.set(ARCADE_SCREEN[Math.floor(t / 450 + v * 2) % ARCADE_SCREEN.length]);
      return g;
    },
  },
  pingpong: {
    label: "Meja pingpong", icon: "🏓",
    rects: [{ x: 0, z: 0, w: 2.0, d: 1.1 }],
    spots: [
      { id: "a", dx: -1.35, dz: 0, heading: Math.PI / 2, pose: "pingpong", icon: "🏓" },
      { id: "b", dx: 1.35, dz: 0, heading: -Math.PI / 2, pose: "pingpong", icon: "🏓" },
    ],
    build: () => {
      const g = new THREE.Group();
      g.add(box(2.0, 0.05, 1.1, mat("#1864ab"), 0, 0.5, 0));
      g.add(box(2.0, 0.006, 0.03, mat("#ffffff"), 0, 0.53, 0));
      g.add(box(0.03, 0.12, 1.14, mat("#f1f3f5"), 0, 0.58, 0)); // net
      for (const [x, z] of [[-0.9, -0.48], [0.9, -0.48], [-0.9, 0.48], [0.9, 0.48]]) g.add(box(0.05, 0.48, 0.05, mat("#343a40"), x, 0.24, z));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: "#ff922b" }));
      g.add(ball);
      g.userData.tick = (t) => {
        const ph = (t / 900) % 2;
        const x = ph < 1 ? -0.85 + ph * 1.7 : 0.85 - (ph - 1) * 1.7;
        ball.position.set(x, 0.56 + Math.abs(Math.sin(ph * Math.PI)) * 0.25, Math.sin(t / 700) * 0.2);
      };
      return g;
    },
  },
  plant: {
    label: "Tanaman", icon: "🪴",
    rects: [{ x: 0, z: 0, w: 0.4, d: 0.4 }],
    build: () => {
      const g = new THREE.Group();
      g.add(box(0.36, 0.4, 0.36, mat("#d9480f"), 0, 0.2, 0));
      for (let k = 0; k < 5; k += 1) {
        const leaf = cone(0.12, 0.6, mat(C.leaves[k % 4]), Math.cos(k * 1.3) * 0.12, 0.7, Math.sin(k * 1.3) * 0.12, 4);
        leaf.rotation.set(Math.sin(k) * 0.4, 0, Math.cos(k) * 0.4);
        g.add(leaf);
      }
      return g;
    },
  },
  rack: {
    label: "Rak server", icon: "🗄",
    rects: [{ x: 0, z: 0, w: 0.85, d: 0.65 }],
    spots: [{ id: "a", dx: 0, dz: 1.15, heading: Math.PI, pose: "look", icon: "🖥" }],
    build: () => makeRack(),
  },
  cabinet: {
    label: "Lemari", icon: "🗃",
    rects: [{ x: 0, z: 0, w: 0.55, d: 0.75 }],
    build: () => makeCabinet(),
  },
  cooler: {
    label: "Dispenser air", icon: "🚰",
    rects: [{ x: 0, z: 0, w: 0.4, d: 0.4 }],
    build: () => makeCooler(),
  },
  "dining-table": {
    label: "Meja makan", icon: "🍜",
    rects: [{ x: 0, z: 0, w: 1.6, d: 0.9 }, { x: -0.5, z: -0.75, w: 0.45, d: 0.45 }, { x: 0.5, z: -0.75, w: 0.45, d: 0.45 }, { x: -0.5, z: 0.75, w: 0.45, d: 0.45 }, { x: 0.5, z: 0.75, w: 0.45, d: 0.45 }],
    // four chairs: agents sit and eat here
    spots: [
      { id: "1", dx: -0.5, dz: -0.75, heading: 0, pose: "meeting", icon: "🍜", chair: true },
      { id: "2", dx: 0.5, dz: -0.75, heading: 0, pose: "meeting", icon: "🍜", chair: true },
      { id: "3", dx: -0.5, dz: 0.75, heading: Math.PI, pose: "meeting", icon: "🍜", chair: true },
      { id: "4", dx: 0.5, dz: 0.75, heading: Math.PI, pose: "meeting", icon: "🍜", chair: true },
    ],
    build: () => {
      const g = new THREE.Group();
      g.add(box(1.6, 0.06, 0.9, mat("#c08552"), 0, 0.55, 0));
      for (const [x, z] of [[-0.74, -0.38], [0.74, -0.38], [-0.74, 0.38], [0.74, 0.38]]) g.add(box(0.06, 0.52, 0.06, mat("#8d5a2b"), x, 0.26, z));
      g.add(box(0.2, 0.02, 0.2, mat("#f8f9fa"), -0.4, 0.59, 0)); // plates
      g.add(box(0.2, 0.02, 0.2, mat("#f8f9fa"), 0.4, 0.59, 0));
      g.add(box(0.08, 0.1, 0.08, mat("#e03131"), 0, 0.64, 0)); // a bottle
      for (const s of CATALOG["dining-table"].spots) {
        const chair = makeChair();
        chair.position.set(s.dx, 0, s.dz);
        chair.rotation.y = s.heading === 0 ? Math.PI : 0;
        g.add(chair);
      }
      return g;
    },
  },
  bed: {
    label: "Tempat tidur", icon: "🛏", variants: 4,
    bed: true, // agents that are switched off sleep here (the next free bed, in layout order)
    rects: [{ x: 0, z: 0, w: 0.9, d: 2.0 }],
    build: (ctx, item) => {
      const v = item.variant ?? 0;
      const g = new THREE.Group();
      const wood = mat("#8d5a2b");
      g.add(box(0.9, 0.2, 2.0, wood, 0, 0.12, 0)); // frame
      g.add(box(0.84, 0.14, 1.92, mat("#f1f3f5"), 0, 0.29, 0)); // mattress
      g.add(box(0.5, 0.1, 0.3, mat("#ffffff"), 0, 0.41, -0.75)); // pillow
      g.add(box(0.86, 0.07, 1.1, mat(BLANKET_COLORS[v % BLANKET_COLORS.length]), 0, 0.39, 0.35)); // blanket
      g.add(box(0.9, 0.55, 0.06, mat("#5a3418"), 0, 0.45, -1.0)); // headboard
      for (const [x, z] of [[-0.4, 0.95], [0.4, 0.95]]) g.add(box(0.06, 0.12, 0.06, mat("#5a3418"), x, 0.04, z)); // foot legs
      return g;
    },
  },
  "meeting-table": {
    label: "Meja rapat", icon: "🪑", max: 1,
    rects: [{ x: 0, z: 0, w: 2.2, d: 1.0 }, { x: -0.6, z: -0.95, w: 0.45, d: 0.45 }, { x: 0.6, z: -0.95, w: 0.45, d: 0.45 }, { x: -0.6, z: 0.95, w: 0.45, d: 0.45 }, { x: 0.6, z: 0.95, w: 0.45, d: 0.45 }],
    // chairs: ACTIVITY_SPOTS meeting-1..4 and MEETING.seats 0..3; the fifth person stands by the table
    spots: [
      { id: "1", dx: -0.6, dz: -0.95, heading: 0, pose: "meeting", icon: "💬", chair: true, seat: 0 },
      { id: "2", dx: 0.6, dz: -0.95, heading: 0, pose: "meeting", icon: "💬", chair: true, seat: 1 },
      { id: "3", dx: -0.6, dz: 0.95, heading: Math.PI, pose: "meeting", icon: "💬", chair: true, seat: 2 },
      { id: "4", dx: 0.6, dz: 0.95, heading: Math.PI, pose: "meeting", icon: "💬", chair: true, seat: 3 },
      { id: "5", dx: 2.1, dz: 0.1, heading: -Math.PI / 2, pose: "look", icon: "💬", activity: false, seat: 4 },
    ],
    build: (ctx, item) => {
      const g = new THREE.Group();
      g.add(box(2.2, 0.06, 1.0, mat("#8d5a2b"), 0, 0.55, 0));
      for (const [x, z] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) g.add(box(0.06, 0.52, 0.06, mat("#5a3418"), x, 0.26, z));
      g.add(box(0.5, 0.02, 0.3, mat("#f8f9fa"), -0.3, 0.59, 0.1)); // papers
      g.add(box(0.36, 0.04, 0.26, mat("#343a40"), 0.5, 0.6, -0.05)); // laptop
      for (const s of CATALOG["meeting-table"].spots.filter((p) => p.chair)) {
        const chair = makeChair();
        chair.position.set(s.dx, 0, s.dz);
        chair.rotation.y = s.heading === 0 ? Math.PI : 0; // backrest behind the sitter
        g.add(chair);
      }
      return g;
    },
  },
};

export const CATALOG_ORDER = ["desk", "sofa", "coffee-table", "dining-table", "bed", "beanbag", "rug", "counter", "aquarium", "bookshelf", "arcade", "pingpong", "plant", "rack", "cabinet", "cooler", "meeting-table"];

// ---------------------------------------------------------------------------
// Default layout: lobby, game room and canteen (level 0), one room per agent (level 1),
// meeting room, server room and terrace (level 2)
// ---------------------------------------------------------------------------

export const defaultLayout = () => {
  const items = [];
  const add = (level, type, x, z, r = 0, variant) => items.push({ type, level, x, z, rot: r, ...(variant === undefined ? {} : { variant }) });

  // ---- level 0 ----
  // lobby (south band): waiting corner, plants, a water cooler
  add(0, "rug", 19, 21.9);
  add(0, "coffee-table", 19, 21.9);
  add(0, "sofa", 19, 23.25, 1);
  add(0, "beanbag", 16.4, 21.2, 0, 0);
  add(0, "beanbag", 21.6, 21.2, 0, 1);
  add(0, "cooler", 31.3, 20.6);
  for (const [x, z] of [[7.1, 23.5], [15, 23.5], [24.5, 23.5], [31.2, 23.5], [7.1, 15]]) add(0, "plant", x, z);
  // kantin: pantry counters on the north wall, a cooler, a dining table, aquarium
  add(0, "counter", 9.4, 14.6, 3);
  add(0, "counter", 10.9, 14.6, 3);
  add(0, "counter", 12.4, 14.6, 3);
  add(0, "cooler", 13.5, 14.5);
  add(0, "aquarium", 13.6, 16.6);
  add(0, "dining-table", 9.7, 17.1);
  add(0, "plant", 8.5, 18.4);
  add(0, "plant", 13.5, 18.4);
  // ruang tidur: twelve beds (agents that are switched off sleep here); two rows, the second row leaves the door free
  for (let k = 0; k < 7; k += 1) add(0, "bed", 14.6 + k * 1.05, 15.2, 0, k);
  for (const x of [14.6, 15.65, 16.7, 19.85, 20.9]) add(0, "bed", x, 17.25, 0, Math.round(x));
  // game room: arcade row on the east wall, two ping-pong tables, bean bags
  [14.7, 15.7, 16.7, 17.7].forEach((z, i) => add(0, "arcade", 31.4, z, 0, i));
  add(0, "pingpong", 24.6, 16.3);
  add(0, "pingpong", 28.8, 16.3);
  [14.7, 15.7, 16.7].forEach((z, i) => add(0, "beanbag", 22.7, z, 0, i));
  add(0, "plant", 22.6, 18.4);
  add(0, "plant", 30.8, 18.4);

  // ---- level 1: one room per agent; agent i sits at desk i (Hermes first) ----
  const roomW = 26 / 6;
  for (let i = 0; i < 12; i += 1) {
    const north = i < 6;
    const x0 = 6 + (i % 6) * roomW;
    const cx = x0 + roomW / 2;
    if (north) {
      add(1, "desk", cx, 14.95, 0, i);
      add(1, "cabinet", x0 + 0.45, 14.6);
      add(1, "plant", x0 + roomW - 0.4, 17.55);
    } else {
      add(1, "desk", cx, 23.05, 2, i);
      add(1, "cabinet", x0 + 0.45, 23.4);
      add(1, "plant", x0 + roomW - 0.4, 20.45);
    }
  }

  // ---- level 2 ----
  add(2, "meeting-table", 12, 16);
  add(2, "bookshelf", 6.35, 15.4);
  add(2, "plant", 17.4, 14.6);
  add(2, "plant", 6.7, 17.4);
  [20.5, 21.6, 22.7, 23.8, 24.9, 26, 27.1, 28.2, 29.3].forEach((x) => add(2, "rack", x, 14.5));
  // terrace
  add(2, "sofa", 13, 22.9, 1);
  add(2, "coffee-table", 13, 21.8);
  add(2, "beanbag", 19.5, 22.4, 0, 2);
  add(2, "beanbag", 21.5, 22.4, 0, 3);
  for (const [x, z] of [[7, 20.9], [10, 23.4], [16.5, 23.4], [26.3, 20.9], [26.8, 23.4], [30.8, 20.9], [31.2, 23.4]]) add(2, "plant", x, z);
  return withIds(items);
};

const withIds = (items) => {
  const next = {};
  const used = new Set(items.map((i) => i.id).filter(Boolean));
  for (const item of items) {
    if (item.id) continue;
    do { next[item.type] = (next[item.type] ?? 0) + 1; item.id = `${item.type}-${next[item.type]}`; } while (used.has(item.id));
    used.add(item.id);
  }
  return items;
};

// ---------------------------------------------------------------------------
// Placement rules: footprints, walls, doors, bounds (all per level)
// ---------------------------------------------------------------------------

const EPS = 0.015;
const WALL_HALF = 0.09; // half the thickness of the outer walls: furniture stays inside them
const rectOf = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const LEVEL_COUNT = LEVELS.length;

// Partitions as thin rectangles (door gaps left open) + door clearance, per level.
const WALL_RECTS = LEVELS.map(() => []);
const BLOCK_RECTS = LEVELS.map(() => []);
for (const room of ROOMS) {
  for (const wall of room.walls) {
    const gaps = [...(wall.gaps ?? [])].sort((a, b) => a[0] - b[0]);
    let cursor = wall.from;
    const pieces = [];
    for (const [g0, g1] of gaps) { pieces.push([cursor, g0]); cursor = g1; }
    pieces.push([cursor, wall.to]);
    for (const [a, b] of pieces) {
      if (b - a < 0.02) continue;
      WALL_RECTS[room.level].push(wall.along === "x" ? rectOf(a, b, wall.at - 0.07, wall.at + 0.07) : rectOf(wall.at - 0.07, wall.at + 0.07, a, b));
    }
    for (const [g0, g1] of gaps) {
      BLOCK_RECTS[room.level].push(wall.along === "x" ? rectOf(g0 - 0.05, g1 + 0.05, wall.at - 0.8, wall.at + 0.8) : rectOf(wall.at - 0.8, wall.at + 0.8, g0 - 0.05, g1 + 0.05));
    }
  }
}
for (let l = 0; l < LEVEL_COUNT; l += 1) BLOCK_RECTS[l].push(rectOf(LIFT.door.x - 1.6, LIFT.door.x + 0.4, LIFT.gap[0] - 0.1, LIFT.gap[1] + 0.1)); // in front of the lift doorway
BLOCK_RECTS[0].push(rectOf(PORTAL.x - 1.4, PORTAL.x + 1.4, PORTAL.z - 1.1, GATE.z)); // summoning circle + gate path

const overlap = (a, b) => a.x0 < b.x1 - EPS && a.x1 > b.x0 + EPS && a.z0 < b.z1 - EPS && a.z1 > b.z0 + EPS;

// A footprint is on the floor of a level when it lies inside one of the level's rectangles
// (shrunk by the thickness of the outer wall).
const insideFloor = (b, level) => LEVELS[level].rects.some(([x0, x1, z0, z1]) =>
  b.x0 >= x0 + WALL_HALF - EPS && b.x1 <= x1 - WALL_HALF + EPS && b.z0 >= z0 + WALL_HALF - EPS && b.z1 <= z1 - WALL_HALF + EPS);

export const worldRects = (item) => {
  const def = CATALOG[item.type];
  const r = norm(item.rot);
  return def.rects.map((rc) => {
    const [cx, cz] = rot(r, rc.x, rc.z);
    const [w, d] = r % 2 ? [rc.d, rc.w] : [rc.w, rc.d];
    return rectOf(item.x + cx - w / 2, item.x + cx + w / 2, item.z + cz - d / 2, item.z + cz + d / 2);
  });
};

const bbox = (rects) => rects.reduce((b, r) => rectOf(Math.min(b.x0, r.x0), Math.max(b.x1, r.x1), Math.min(b.z0, r.z0), Math.max(b.z1, r.z1)),
  rectOf(Infinity, -Infinity, Infinity, -Infinity));

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export const createFurniture = ({ groups, animated, screenTex, rooms, makeAutoDesk, items: initial }) => {
  const autoDesks = new THREE.Group(); // open desks for agents beyond the number of desks
  groups[1].add(autoDesks);
  const ctx = { screenTex };
  const items = [];
  const objects = new Map(); // id -> { group }
  const spots = new Map(); // activity spot id -> spot object (kept in ACTIVITY_SPOTS)
  let people = [];
  const api = { items, onChange: null };

  const disposeGroup = (g) => g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  const levelOf = (item) => Math.min(LEVEL_COUNT - 1, Math.max(0, item.level ?? 0));
  const parentOf = (item) => groups[levelOf(item)];

  const place = (item) => {
    const g = objects.get(item.id).group;
    g.position.set(item.x, levelTop(levelOf(item)), item.z);
    g.rotation.y = (norm(item.rot) * Math.PI) / 2;
  };

  const make = (item) => {
    const def = CATALOG[item.type];
    const group = def.build(ctx, item);
    group.userData.furnitureId = item.id;
    prepareFade(group);
    const parent = parentOf(item);
    if ((parent.userData.fadeAlpha ?? 1) < 1) setFade(group, parent.userData.fadeAlpha); // a piece added to a faded level fades too
    parent.add(group);
    objects.set(item.id, { group });
    place(item);
  };

  const unmake = (id, item) => {
    const o = objects.get(id);
    o.group.parent?.remove(o.group);
    disposeGroup(o.group);
  };

  const spotWorld = (item, s) => {
    const r = norm(item.rot);
    const [ox, oz] = rot(r, s.dx, s.dz);
    return { x: item.x + ox, z: item.z + oz, heading: s.heading + (r * Math.PI) / 2 };
  };

  // Activity spots and meeting seats follow their furniture; agents keep their spot object.
  const syncSpots = () => {
    const seen = new Set();
    const seats = [];
    for (const item of items) {
      const level = levelOf(item);
      for (const s of CATALOG[item.type].spots ?? []) {
        const w = spotWorld(item, s);
        if (s.seat !== undefined) seats[s.seat] = { x: w.x, z: w.z, level, heading: w.heading, pose: s.pose, icon: s.icon };
        if (s.activity === false) continue;
        const id = `${item.id}/${s.id}`;
        seen.add(id);
        const room = roomAt(w.x, w.z, level)?.id ?? null;
        const existing = spots.get(id);
        if (existing) Object.assign(existing, { x: w.x, z: w.z, level, heading: w.heading, room });
        else spots.set(id, { id, room, level, x: w.x, z: w.z, heading: w.heading, pose: s.pose, icon: s.icon });
      }
    }
    for (const id of [...spots.keys()]) if (!seen.has(id)) spots.delete(id);
    // beds, in layout order: the body lies from the foot of the bed (+0.55 along the bed) towards its head
    BEDS.length = 0;
    for (const item of items) {
      if (!CATALOG[item.type].bed) continue;
      const r = norm(item.rot);
      const [ox, oz] = rot(r, 0, 0.55);
      BEDS.push({ id: item.id, x: item.x + ox, z: item.z + oz, level: levelOf(item), heading: (r * Math.PI) / 2 });
    }
    ACTIVITY_SPOTS.length = 0;
    ACTIVITY_SPOTS.push(...spots.values());
    MEETING.seats.length = 0;
    MEETING.seats.push(...seats.filter(Boolean));
  };

  const deskItems = () => items.filter((i) => i.type === "desk");
  const seatOfItem = (item) => {
    const s = spotWorld(item, CATALOG.desk.seat);
    const level = levelOf(item);
    return { x: s.x, z: s.z, level, heading: s.heading, room: roomAt(s.x, s.z, level)?.id ?? null };
  };

  // people: [{ id, name }] in desk order (Hermes first). Returns one seat per person; the private
  // room of each seat gets the person's name on its sign.
  api.setDesks = (list) => {
    people = list;
    const desks = deskItems();
    const seats = people.map((_, i) => (desks[i] ? seatOfItem(desks[i]) : null));
    seats.forEach((seat, i) => { if (seat?.room) rooms?.setLabel(seat.room, people[i].name.toUpperCase()); });
    autoDesks.clear();
    const extra = Math.max(0, people.length - desks.length);
    if (extra && makeAutoDesk) makeAutoDesk(autoDesks, extra).forEach((seat, k) => { seats[desks.length + k] = seat; });
    return seats;
  };

  const changed = () => {
    syncSpots();
    api.setDesks(people);
    api.onChange?.();
  };

  api.get = (id) => items.find((i) => i.id === id) ?? null;
  api.objectOf = (id) => objects.get(id)?.group ?? null;
  api.toJSON = () => items.map((i) => ({ ...i }));
  api.count = (type) => items.filter((i) => i.type === type).length;

  api.load = (list) => {
    for (const id of [...objects.keys()]) unmake(id);
    objects.clear();
    items.length = 0;
    const clean = (Array.isArray(list) ? list : []).filter((i) => i && CATALOG[i.type] && Number.isFinite(i.x) && Number.isFinite(i.z))
      .map((i) => ({ id: i.id, type: i.type, level: Math.min(LEVEL_COUNT - 1, Math.max(0, Math.round(i.level ?? 0))), x: i.x, z: i.z, rot: norm(i.rot ?? 0), ...(i.variant === undefined ? {} : { variant: i.variant }) }));
    withIds(clean);
    for (const item of clean) { items.push(item); make(item); }
    changed();
  };

  // silent: the caller (editor) decides when the change counts (after the placement is confirmed)
  api.add = (type, x, z, r = 0, variant, { silent = false, level = 0 } = {}) => {
    const def = CATALOG[type];
    if (!def) return null;
    const item = { type, level, x, z, rot: norm(r), ...(def.variants ? { variant: variant ?? api.count(type) % def.variants } : {}) };
    let n = 1;
    while (items.some((i) => i.id === `${type}-${n}`)) n += 1;
    item.id = `${type}-${n}`;
    items.push(item);
    make(item);
    if (!silent) changed();
    return item;
  };

  api.remove = (id, { silent = false } = {}) => {
    const i = items.findIndex((x) => x.id === id);
    if (i < 0) return;
    unmake(id);
    objects.delete(id);
    items.splice(i, 1);
    if (!silent) changed();
  };

  // Moves/rotates an item. preview = move the model only (while dragging), no data change.
  api.update = (id, patch, { preview = false } = {}) => {
    const item = api.get(id);
    if (!item) return;
    if (preview) {
      const g = objects.get(id).group;
      const x = patch.x ?? item.x;
      const z = patch.z ?? item.z;
      g.position.set(x, levelTop(levelOf(item)) + 0.1, z);
      g.rotation.y = (norm(patch.rot ?? item.rot) * Math.PI) / 2;
      return;
    }
    Object.assign(item, patch, patch.rot === undefined ? {} : { rot: norm(patch.rot) });
    if (patch.variant !== undefined) {
      // the model depends on the variant (colour, desk item): rebuild it
      unmake(id);
      make(item);
    } else place(item);
    changed();
  };

  // Puts a previewed model back where its data says it is (a drag that was refused).
  api.resetModel = (id) => { const item = api.get(id); if (item) place(item); };

  api.reset = () => api.load(defaultLayout());

  // Can this item stand here? { ok, reason }
  api.canPlace = (item, ignoreId = item.id) => {
    const def = CATALOG[item.type];
    const level = levelOf(item);
    const rects = worldRects(item);
    const b = bbox(rects);
    if (!insideFloor(b, level)) return { ok: false, reason: "Di luar lantai kantor" };
    if (rects.some((r) => WALL_RECTS[level].some((w) => overlap(r, w)))) return { ok: false, reason: "Menabrak dinding" };
    if (rects.some((r) => BLOCK_RECTS[level].some((w) => overlap(r, w)))) return { ok: false, reason: "Menutup pintu atau jalan masuk" };
    for (const other of items) {
      if (other.id === ignoreId || levelOf(other) !== level) continue;
      const od = CATALOG[other.type];
      if (def.floor !== od.floor) continue; // rugs lie under everything
      const orects = worldRects(other);
      if (rects.some((r) => orects.some((o) => overlap(r, o)))) return { ok: false, reason: "Bertabrakan dengan benda lain" };
    }
    if (def.max && items.filter((i) => i.type === item.type && i.id !== ignoreId).length >= def.max) return { ok: false, reason: `Hanya boleh ${def.max} ${def.label.toLowerCase()}` };
    return { ok: true, reason: "" };
  };

  // Snap a dragged item's centre: 0.1 grid, then flush to walls, the floor edge and neighbours.
  api.snap = (item, x, z) => {
    const g = 0.1;
    let nx = Math.round(x / g) * g;
    let nz = Math.round(z / g) * g;
    const level = levelOf(item);
    const moved = { ...item, x: nx, z: nz };
    const b = bbox(worldRects(moved));
    const R = 0.14;
    let dx = null;
    let dz = null;
    const pickD = (cur, d) => (Math.abs(d) < R && (cur === null || Math.abs(d) < Math.abs(cur)) ? d : cur);
    // the floor rectangle under the item (or the nearest one): flush to its inner wall faces
    const floor = LEVELS[level].rects.find(([x0, x1, z0, z1]) => nx >= x0 && nx <= x1 && nz >= z0 && nz <= z1) ?? LEVELS[level].rects[0];
    const [fx0, fx1, fz0, fz1] = floor;
    dx = pickD(dx, fx0 + WALL_HALF - b.x0); dx = pickD(dx, fx1 - WALL_HALF - b.x1);
    dz = pickD(dz, fz0 + WALL_HALF - b.z0); dz = pickD(dz, fz1 - WALL_HALF - b.z1);
    const def = CATALOG[item.type];
    const targets = [...WALL_RECTS[level]];
    for (const other of items) if (other.id !== item.id && levelOf(other) === level && !CATALOG[other.type].floor && !def.floor) targets.push(...worldRects(other));
    for (const t of targets) {
      if (t.z1 > b.z0 - 0.3 && t.z0 < b.z1 + 0.3) { dx = pickD(dx, t.x0 - b.x1); dx = pickD(dx, t.x1 - b.x0); }
      if (t.x1 > b.x0 - 0.3 && t.x0 < b.x1 + 0.3) { dz = pickD(dz, t.z0 - b.z1); dz = pickD(dz, t.z1 - b.z0); }
    }
    nx += dx ?? 0;
    nz += dz ?? 0;
    return { x: Math.round(nx * 1000) / 1000, z: Math.round(nz * 1000) / 1000 };
  };

  // The item under the pointer ray (nearest first); levels that are hidden cannot be picked.
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  // onlyLevel: pick only among the pieces of that level (the others are faded and cannot be touched).
  api.pick = (raycaster, onlyLevel = null) => {
    const hits = raycaster.intersectObjects([...objects.values()].map((o) => o.group), true);
    for (const hit of hits) {
      if (!shown(hit.object)) continue;
      let o = hit.object;
      while (o && !o.userData.furnitureId) o = o.parent;
      const item = o ? api.get(o.userData.furnitureId) : null;
      if (item && (onlyLevel === null || levelOf(item) === onlyLevel)) return item;
    }
    return null;
  };

  api.update3d = (t) => { for (const { group } of objects.values()) group.userData.tick?.(t); };
  animated.push((t) => api.update3d(t));

  api.load(initial ?? defaultLayout());
  return api;
};
