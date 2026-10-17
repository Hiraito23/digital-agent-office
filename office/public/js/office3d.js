// Low-poly 3D office with pixel-art textures. 1 world unit = 1 floor tile.
// x runs along the old "i" axis, z along "j"; y is up.
import * as THREE from "three";

export const N = 32;
export const OFFICE = { x0: 6, x1: 24, z0: 5, z1: 19 };
const SERVER_ZONE = { x0: 20, x1: 24, z0: 5, z1: 8 };
export const PORTAL = { x: 16, z: 16.6 };
export const CENTER = { x: (OFFICE.x0 + OFFICE.x1) / 2, z: (OFFICE.z0 + OFFICE.z1) / 2 };

// two rows of desks; corridors run between them (z 11.3) and in front (z 15.6)
const DESKS = [[8, 8.5], [11.5, 8.5], [15, 8.5], [8, 12.5], [11.5, 12.5], [15, 12.5], [18.5, 12.5]];
export const SEATS = DESKS.flatMap(([x, z]) => [
  { x: x + 0.55, z: z + 1.45 },
  { x: x + 1.55, z: z + 1.45 },
]);
export const WANDER = [
  [9, 11.3], [13, 11.3], [17, 11.3], [21.6, 11.3], [7, 11.3],
  [9, 15.6], [12.5, 17], [19, 15.6], [22, 17.5], [7.5, 17.6], [22.5, 13.8],
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
  const entrance = (i === 6 || i === 7) && j >= 19 && j <= 22;
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

const floorTexture = () => {
  const w = OFFICE.x1 - OFFICE.x0;
  const h = OFFICE.z1 - OFFICE.z0;
  return pixelTexture(w * TPX, h * TPX, (ctx) => {
    for (let tz = 0; tz < h; tz += 1) {
      for (let tx = 0; tx < w; tx += 1) {
        const wx = OFFICE.x0 + tx;
        const wz = OFFICE.z0 + tz;
        const dark = wx >= SERVER_ZONE.x0 && wx < SERVER_ZONE.x1 && wz >= SERVER_ZONE.z0 && wz < SERVER_ZONE.z1;
        const ox = tx * TPX;
        const oz = tz * TPX;
        ctx.fillStyle = dark ? "#2c3753" : "#e6ebef";
        ctx.fillRect(ox, oz, TPX, TPX);
        ctx.fillStyle = dark ? "#222b44" : "#c3ccd5";
        ctx.fillRect(ox, oz + TPX - 1, TPX, 1);
        ctx.fillRect(ox + TPX - 1, oz, 1, TPX);
        ctx.fillStyle = dark ? "#3a4870" : "#f6f9fb";
        ctx.fillRect(ox + 1, oz + 1, 6, 1);
        ctx.fillRect(ox + 1, oz + 1, 1, 6);
        if (dark) {
          ctx.fillStyle = "#4dabf7";
          ctx.fillRect(ox + 6, oz + 7, 4, 1);
        } else {
          ctx.fillStyle = "#d3dbe2";
          ctx.fillRect(ox + 9, oz + 10, 2, 1);
        }
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

const makeDesk = (screenTex) => {
  const g = new THREE.Group();
  g.add(box(2, 0.06, 1, mat(C.deskTop), 1, 0.55, 0.5));
  for (const [x, z] of [[0.08, 0.08], [1.92, 0.08], [1.92, 0.92]]) g.add(box(0.06, 0.52, 0.06, mat(C.leg), x, 0.26, z));
  g.add(box(0.6, 0.5, 0.95, mat(C.deskSide), 0.32, 0.26, 0.5)); // drawers
  for (const mx of [0.6, 1.4]) {
    g.add(box(0.06, 0.12, 0.06, mat(C.leg), mx, 0.64, 0.25));
    g.add(box(0.62, 0.42, 0.05, mat(C.monitor), mx, 0.9, 0.22));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.34), new THREE.MeshBasicMaterial({ map: screenTex }));
    screen.position.set(mx, 0.9, 0.25);
    g.add(screen);
  }
  g.add(box(0.6, 0.02, 0.18, mat("#495057"), 1, 0.59, 0.62)); // keyboard
  g.add(box(0.08, 0.1, 0.08, mat("#fa5252"), 1.8, 0.63, 0.6)); // mug
  g.add(box(0.12, 0.1, 0.12, mat("#c97b45"), 0.15, 0.63, 0.7)); // plant pot
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), mat(C.bush[1]));
  leaf.position.set(0.15, 0.76, 0.7);
  leaf.castShadow = true;
  g.add(leaf);
  return g;
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

  // glass railing on the front edges (entrance at the front-left)
  const glass = new THREE.MeshLambertMaterial({ color: "#d6ecff", transparent: true, opacity: 0.35 });
  const railLen = OFFICE.x1 - (OFFICE.x0 + 2);
  const front = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.5, 0.03), glass);
  front.position.set(OFFICE.x0 + 2 + railLen / 2, top + 0.3, OFFICE.z1);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, fd), glass);
  right.position.set(OFFICE.x1, top + 0.3, OFFICE.z0 + fd / 2);
  scene.add(front, right);
  scene.add(box(railLen, 0.04, 0.06, mat(C.rail), OFFICE.x0 + 2 + railLen / 2, top + 0.56, OFFICE.z1, false));
  scene.add(box(0.06, 0.04, fd, mat(C.rail), OFFICE.x1, top + 0.56, OFFICE.z0 + fd / 2, false));
  for (let x = OFFICE.x0 + 2; x <= OFFICE.x1; x += 1) scene.add(box(0.06, 0.58, 0.06, mat(C.rail), x, top + 0.29, OFFICE.z1));
  for (let z = OFFICE.z0; z <= OFFICE.z1; z += 1) scene.add(box(0.06, 0.58, 0.06, mat(C.rail), OFFICE.x1, top + 0.29, z));

  // desks and chairs
  const screenTex = screenTexture();
  for (const [x, z] of DESKS) {
    const d = makeDesk(screenTex);
    d.position.set(x, top, z);
    scene.add(d);
  }
  for (const seat of SEATS) {
    const c = makeChair();
    c.position.set(seat.x, top, seat.z);
    scene.add(c);
  }

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
  cooler.position.set(OFFICE.x0 + 0.35, top, 14.5);
  scene.add(cooler);

  // lamps (only a few cast real light to stay fast)
  [[23.6, 11, true], [6.6, 18.4, true], [4.6, 21.6, false], [11, 22.6, false], [16, 22.6, true], [21, 22.6, false], [27.6, 17, false], [27.6, 11, false], [27.6, 5, false]]
    .forEach(([x, z, light]) => {
      const l = makeLamp(light);
      l.position.set(x, x < OFFICE.x1 && z < OFFICE.z1 && x > OFFICE.x0 ? top : 0, z);
      scene.add(l);
    });

  // planters and bushes outside the railing
  [[9, 1], [12.5, 2], [16, 3], [19.5, 4]].forEach(([x, k]) => {
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

  return { update: (t) => animated.forEach((fn) => fn(t)), floorTop: top };
};
