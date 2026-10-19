// Builds the whole office scene (ground, floor, walls, railing, desks, rooms,
// decor, garden) and returns { update, floorTop, setDesks, furniture }.
import * as THREE from "three";
import { addDecor } from "./decor.js";
import { createFurniture } from "./furniture.js";
import { box, mat, rand } from "./helpers.js";
import { DESK_SLOTS, GATE, N, OFFICE, PORTAL, isPath, seatOf } from "./layout.js";
import { C, makeBush, makeChair, makeDesk, makeLamp, makePillar, makePine, makePlanter, makeRoundTree } from "./props.js";
import { addRooms } from "./rooms.js";
import { floorTexture, groundTexture, screenTexture, windowTexture } from "./textures.js";

const PONDS = { x: 2.4, z: 20, rx: 1.7, rz: 2.4 };

export const buildOffice = (scene, layout) => {
  const animated = [];

  // the garden is a floating island: a grass-topped block of earth on a tapering rock
  const dirt = mat("#7a5436");
  const rock = mat("#76675a");
  const ground = new THREE.Mesh(new THREE.BoxGeometry(N, 2.4, N), [
    dirt, dirt, new THREE.MeshLambertMaterial({ map: groundTexture() }), dirt, dirt, dirt,
  ]);
  ground.position.set(N / 2, -0.01 - 1.2, N / 2);
  ground.receiveShadow = true;
  scene.add(ground);
  const taper = new THREE.Mesh(new THREE.ConeGeometry(N / 2 / Math.SQRT1_2, 16, 4), rock);
  taper.rotation.set(Math.PI, Math.PI / 4, 0); // upside down, its square base flush with the earth block
  taper.position.set(N / 2, -2.41 - 8, N / 2);
  taper.receiveShadow = true;
  scene.add(taper);
  // a few rock chunks floating below the island
  [[-1.5, -9, 4.5, 1.1], [N + 1.2, -7, N - 6, 0.8], [N / 2 + 6, -14, N + 2, 0.6], [4, -12, N + 1, 0.5]].forEach(([x, y, z, s], i) => {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(s * 1.4, 0), rock);
    chunk.position.set(x, y, z);
    scene.add(chunk);
    animated.push((t) => { chunk.position.y = y + Math.sin(t / 900 + i * 1.7) * 0.25; chunk.rotation.y = t / 3000 + i; });
  });

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
  const wallH = 1.9;
  const T = 0.34; // wall thickness: chunky, like the reference
  const backWall = box(fw, wallH, T, mat(C.wall), OFFICE.x0 + fw / 2, top + wallH / 2, OFFICE.z0 - T / 2);
  const sideWall = box(T, wallH, fd + T, mat(C.wall), OFFICE.x0 - T / 2, top + wallH / 2, OFFICE.z0 + fd / 2 - T / 2);
  scene.add(backWall, sideWall);
  scene.add(box(fw + 0.1, 0.09, T + 0.12, mat(C.wallTop), OFFICE.x0 + fw / 2, top + wallH + 0.045, OFFICE.z0 - T / 2, false));
  scene.add(box(T + 0.12, 0.09, fd + T + 0.1, mat(C.wallTop), OFFICE.x0 - T / 2, top + wallH + 0.045, OFFICE.z0 + fd / 2 - T / 2, false));
  // pilasters between the windows
  const pil = mat("#181f38");
  for (let x = OFFICE.x0 + 2; x < OFFICE.x1; x += 2) scene.add(box(0.14, wallH - 0.1, 0.06, pil, x, top + wallH / 2, OFFICE.z0 + 0.03, false));
  for (let z = OFFICE.z0 + 2; z < OFFICE.z1; z += 2) scene.add(box(0.06, wallH - 0.1, 0.14, pil, OFFICE.x0 + 0.03, top + wallH / 2, z, false));
  for (let x = OFFICE.x0 + 1; x < OFFICE.x1; x += 2) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), winMat);
    w.position.set(x, top + 1.15, OFFICE.z0 + 0.008);
    scene.add(w);
  }
  for (let z = OFFICE.z0 + 1; z < OFFICE.z1; z += 2) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), winMat);
    w.rotation.y = Math.PI / 2;
    w.position.set(OFFICE.x0 + 0.008, top + 1.15, z);
    scene.add(w);
  }
  // neon strips: low along the base and high under the cap
  for (const y of [0.2, wallH - 0.1]) {
    scene.add(box(fw, 0.05, 0.02, trimMat, OFFICE.x0 + fw / 2, top + y, OFFICE.z0 + 0.012, false));
    scene.add(box(0.02, 0.05, fd, trimMat, OFFICE.x0 + 0.012, top + y, OFFICE.z0 + fd / 2, false));
  }

  // glass railing on the front and right edges, with a gate into the lobby
  const glass = new THREE.MeshLambertMaterial({ color: "#8cc4ff", transparent: true, opacity: 0.32 });
  const railSegment = (x0, x1) => {
    const len = x1 - x0;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.03), glass);
    pane.position.set(x0 + len / 2, top + 0.3, OFFICE.z1);
    scene.add(pane);
    scene.add(box(len, 0.04, 0.06, trimMat, x0 + len / 2, top + 0.56, OFFICE.z1, false));
    for (let x = x0; x <= x1 + 0.001; x += 1) scene.add(box(0.06, 0.58, 0.06, mat(C.rail), x, top + 0.29, OFFICE.z1));
  };
  railSegment(OFFICE.x0, GATE.x0);
  railSegment(GATE.x1, OFFICE.x1);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, fd), glass);
  right.position.set(OFFICE.x1, top + 0.3, OFFICE.z0 + fd / 2);
  scene.add(right);
  scene.add(box(0.06, 0.04, fd, trimMat, OFFICE.x1, top + 0.56, OFFICE.z0 + fd / 2, false));
  for (let z = OFFICE.z0; z <= OFFICE.z1; z += 1) scene.add(box(0.06, 0.58, 0.06, mat(C.rail), OFFICE.x1, top + 0.29, z));

  // Open desks for agents beyond the number of desks in the layout (furniture.setDesks
  // rebuilds them whenever the roster or the layout changes).
  const screenTex = screenTexture();
  const addAutoDesk = (group, count) => {
    const slots = DESK_SLOTS.filter((s) => !s.room).slice(0, count);
    slots.forEach((slot, i) => {
      const d = makeDesk(screenTex, i);
      d.position.set(slot.x, top, slot.z);
      group.add(d);
      const seat = seatOf(slot);
      const c = makeChair();
      c.position.set(seat.x, top, seat.z);
      group.add(c);
    });
    return slots.map(seatOf);
  };

  const rooms = addRooms(scene, top);
  // stone pillars with a blue light strip at the corners and beside the gate
  for (const [x, z] of [[OFFICE.x1 + 0.05, OFFICE.z0 - 0.05], [OFFICE.x0 - 0.05, OFFICE.z1 + 0.05], [OFFICE.x1 + 0.05, OFFICE.z1 + 0.05], [OFFICE.x0 - 0.05, OFFICE.z0 - 0.05], [GATE.x0 - 0.1, OFFICE.z1 + 0.05], [GATE.x1 + 0.1, OFFICE.z1 + 0.05]]) {
    const p = makePillar();
    p.position.set(x, top, z);
    scene.add(p);
  }

  // blue circle with ticks and gold corner lines on the floor of the north commons
  const decal = (color, opacity = 0.85) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const floorDecal = new THREE.Group();
  [[2.0, 2.05], [1.55, 1.58]].forEach(([a, b]) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(a, b, 64), decal("#5b9bff", 0.8));
    ring.rotation.x = -Math.PI / 2;
    floorDecal.add(ring);
  });
  for (let k = 0; k < 16; k += 1) {
    const t = box(0.22, 0.004, 0.04, decal("#5b9bff", 0.8), Math.cos((k * Math.PI) / 8) * 1.8, 0, Math.sin((k * Math.PI) / 8) * 1.8, false);
    t.rotation.y = -(k * Math.PI) / 8;
    floorDecal.add(t);
  }
  floorDecal.add(box(0.04, 0.004, 3.4, decal("#5b9bff", 0.35), 0, 0, 0, false), box(3.4, 0.004, 0.04, decal("#5b9bff", 0.35), 0, 0, 0, false));
  [[-2.3, -1.5, 0], [2.3, -1.5, 1]].forEach(([x, z, flip]) => {
    floorDecal.add(box(1.2, 0.004, 0.05, decal("#e0a93a", 0.8), x + (flip ? -0.6 : 0.6), 0, z, false));
    floorDecal.add(box(0.05, 0.004, 0.8, decal("#e0a93a", 0.8), x, 0, z + 0.4, false));
  });
  floorDecal.position.set(16, top + 0.006, 10.4);
  scene.add(floorDecal);


  // Movable furniture: desks, cabinets, lounge, server racks, game room, ... (furniture.js).
  const furniture = createFurniture({ scene, top, animated, screenTex, rooms, makeAutoDesk: addAutoDesk, items: layout });
  addDecor(scene, top, animated);

  // server corner + floating crystal
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshLambertMaterial({ color: "#74c0fc", emissive: "#1c7ed6", emissiveIntensity: 0.8, flatShading: true }),
  );
  crystal.scale.set(1.35, 2.2, 1.35);
  crystal.position.set(21, 2.6, OFFICE.z0 + 1.7);
  scene.add(crystal);
  const crystalLight = new THREE.PointLight("#74c0fc", 1.2, 5, 1.5);
  crystalLight.position.copy(crystal.position);
  scene.add(crystalLight);
  animated.push((t) => {
    crystal.rotation.y = t / 900;
    crystal.position.y = 2.6 + Math.sin(t / 500) * 0.1;
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

  // lamps (only a few cast real light to stay fast); their lights are returned so the sky can switch them on at night
  const lampLights = [];
  const outsideX = OFFICE.x1 + 3.6;
  const outsideZ = OFFICE.z1 + 3.6;
  [[OFFICE.x1 - 0.7, OFFICE.z1 - 0.7, true], [OFFICE.x0 + 0.7, OFFICE.z1 - 0.7, true],
    [9, outsideZ, false], [12, outsideZ, true], [20, outsideZ, true], [23, outsideZ, false],
    [outsideX, 10, false], [outsideX, 16, false], [outsideX, 22, false], [OFFICE.x0 - 3.6, 12, false], [OFFICE.x0 - 3.6, 20, false]]
    .forEach(([x, z, light]) => {
      const l = makeLamp(light);
      l.position.set(x, x < OFFICE.x1 && z < OFFICE.z1 && x > OFFICE.x0 ? top : 0, z);
      scene.add(l);
      l.traverse((o) => { if (o.isPointLight) lampLights.push(o); });
    });

  // planters and bushes outside the railing
  [[9, 1], [11.5, 2], [19.5, 3], [22, 4]].forEach(([x, k]) => {
    const p = makePlanter(40 + k);
    p.position.set(x, 0, OFFICE.z1 + 0.35);
    scene.add(p);
  });
  for (let z = OFFICE.z0 + 1; z <= OFFICE.z1 - 1; z += 2) {
    const b = makeBush(70 + z);
    b.position.set(OFFICE.x1 + 0.6, 0, z);
    scene.add(b);
  }

  // pond, rocks and a bench in the garden
  const pond = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.04, 20), mat("#8a6a45"));
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.05, 20), new THREE.MeshBasicMaterial({ color: "#3a86d6" }));
  water.position.y = 0.012;
  pond.add(rim, water);
  pond.scale.set(PONDS.rx, 1, PONDS.rz);
  pond.position.set(PONDS.x, 0.02, PONDS.z);
  scene.add(pond);
  animated.push((t) => water.material.color.set("#3a86d6").offsetHSL(0, 0, Math.sin(t / 700) * 0.03));
  for (const [x, z, s] of [[1.2, 16, 0.45], [3.6, 25.4, 0.35], [2, 26.4, 0.5], [28.6, 9, 0.4], [29.6, 20, 0.5], [16, 29.8, 0.35]]) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat("#8b9199"));
    stone.position.set(x, s * 0.5, z);
    stone.rotation.y = x;
    stone.castShadow = true;
    scene.add(stone);
  }
  const bench = new THREE.Group();
  bench.add(box(1.5, 0.08, 0.45, mat("#a9733f"), 0, 0.42, 0), box(1.5, 0.35, 0.06, mat("#a9733f"), 0, 0.68, -0.2), box(0.08, 0.42, 0.4, mat("#5d4630"), -0.62, 0.21, 0), box(0.08, 0.42, 0.4, mat("#5d4630"), 0.62, 0.21, 0));
  bench.position.set(9, 0, 29.6);
  scene.add(bench);

  // trees around the garden (all on the island)
  const r = rand(4242);
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const nearOffice = i >= OFFICE.x0 - 4 && i <= OFFICE.x1 + 4 && j >= OFFICE.z0 - 4 && j <= OFFICE.z1 + 4;
      const inPond = Math.abs(i + 0.5 - PONDS.x) < PONDS.rx + 0.8 && Math.abs(j + 0.5 - PONDS.z) < PONDS.rz + 0.8;
      if (nearOffice || inPond || isPath(i, j)) continue;
      if (r() > 0.3) continue; // dense enough to look like a park, light enough to stay fast
      const kind = r();
      const scale = 0.85 + r() * 0.45;
      const tree = kind < 0.45 ? makePine(scale) : kind < 0.85 ? makeRoundTree(scale, Math.floor(r() * 1e6)) : makeBush(Math.floor(r() * 1e6));
      tree.position.set(i + 0.2 + r() * 0.6, 0, j + 0.2 + r() * 0.6);
      tree.rotation.y = r() * Math.PI * 2;
      tree.traverse((o) => { o.castShadow = false; }); // garden plants do not need shadows
      scene.add(tree);
    }
  }
  for (const [x, z] of [[3, 27], [OFFICE.x1 + 4.6, 27], [OFFICE.x1 + 4.6, 12], [2.4, 12], [OFFICE.x1 + 4.6, 6], [10, 28.6], [22, 28.6]]) {
    const b = makeBush(x * 10 + z);
    b.position.set(x, 0, z);
    scene.add(b);
  }

  return { update: (t) => animated.forEach((fn) => fn(t)), floorTop: top, setDesks: furniture.setDesks, furniture, windowMat: winMat, lampLights };
};
