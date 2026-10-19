// Builds the whole office scene: the garden, the three-storey building (building.js), its rooms
// and walls (rooms.js), decor, furniture and the lamps and plants around it. Returns
// { update, floorTop, levelGroups, lift, rooms, setDesks, furniture, lampLights }.
import * as THREE from "three";
import { buildBuilding } from "./building.js";
import { addDecor } from "./decor.js";
import { createFurniture } from "./furniture.js";
import { box, mat, prepareFade, rand } from "./helpers.js";
import { DESK_SLOTS, GATE, N, OFFICE, PORTAL, isPath, levelTop, seatOf } from "./layout.js";
import { makeBush, makeChair, makeDesk, makeLamp, makePine, makePlanter, makeRoundTree } from "./props.js";
import { addRooms } from "./rooms.js";
import { groundTexture, outerGrassTexture, screenTexture } from "./textures.js";

export const buildOffice = (scene, layout, { name } = {}) => {
  const animated = [];

  // outer grass and the garden ground
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

  // the building: floors, outer walls, lift
  const { groups, lift, slabs } = buildBuilding(scene);
  const top = levelTop(0);

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

  const rooms = addRooms(groups);

  // Movable furniture: desks, cabinets, lounge, server racks, game room, ... (furniture.js).
  const furniture = createFurniture({ groups, animated, screenTex, rooms, makeAutoDesk: addAutoDesk, items: layout });
  addDecor(groups, animated, name);

  // server room (level 2): a floating crystal above the racks
  const top2 = levelTop(2);
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3, 0),
    new THREE.MeshLambertMaterial({ color: "#74c0fc", emissive: "#1c7ed6", emissiveIntensity: 0.8, flatShading: true }),
  );
  crystal.scale.set(1, 1.6, 1);
  crystal.position.set(25, top2 + 1.95, 16);
  groups[2].add(crystal);
  const crystalLight = new THREE.PointLight("#74c0fc", 1.2, 5, 1.5);
  crystalLight.position.copy(crystal.position);
  groups[2].add(crystalLight);
  animated.push((t) => {
    crystal.rotation.y = t / 900;
    crystal.position.y = top2 + 1.95 + Math.sin(t / 500) * 0.08;
    crystalLight.intensity = 1 + Math.sin(t / 400) * 0.3;
  });

  // summoning circle on the lobby floor (level 0)
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
  groups[0].add(portal);
  animated.push((t) => {
    runes.rotation.y = t / 1500;
    glow.material.opacity = 0.12 + (Math.sin(t / 400) + 1) * 0.06;
  });

  // lamps along the garden path (only a few cast real light to stay fast); their lights are returned
  // so the sky can switch them on at night
  const lampLights = [];
  const outsideX = OFFICE.x1 + 3.6;
  const outsideZ = OFFICE.z1 + 3.6;
  const northZ = OFFICE.z0 - 3.6;
  [[9, outsideZ, false], [17, outsideZ, true], [24, outsideZ, true], [29, outsideZ, false],
    [outsideX, 10, false], [outsideX, 18, true], [outsideX, 26, false],
    [10, northZ, false], [20, northZ, true], [30, northZ, false]]
    .forEach(([x, z, light]) => {
      const l = makeLamp(light);
      l.position.set(x, 0, z);
      scene.add(l);
      l.traverse((o) => { if (o.isPointLight) lampLights.push(o); });
    });

  // planters and bushes outside the front wall and along the east side
  [[8, 1], [16, 2], [20, 3], [24, 4]].forEach(([x, k]) => {
    const p = makePlanter(40 + k);
    p.position.set(x, 0, OFFICE.z1 + 0.35);
    scene.add(p);
  });
  for (let z = OFFICE.z0 + 2; z <= OFFICE.z1 - 2; z += 3) {
    const b = makeBush(70 + z);
    b.position.set(OFFICE.x1 + 0.6, 0, z);
    scene.add(b);
  }

  // trees around the garden
  const r = rand(4242);
  for (let j = -4; j < N + 4; j += 1) {
    for (let i = -4; i < N + 4; i += 1) {
      const nearOffice = i >= OFFICE.x0 - 4 && i <= OFFICE.x1 + 4 && j >= OFFICE.z0 - 4 && j <= OFFICE.z1 + 4;
      if (nearOffice || isPath(i, j)) continue;
      if (r() > 0.16) continue; // a lighter garden keeps the scene cheap to draw
      const kind = r();
      const scale = 0.85 + r() * 0.45;
      const tree = kind < 0.45 ? makePine(scale) : kind < 0.85 ? makeRoundTree(scale, Math.floor(r() * 1e6)) : makeBush(Math.floor(r() * 1e6));
      tree.position.set(i + 0.2 + r() * 0.6, 0, j + 0.2 + r() * 0.6);
      tree.rotation.y = r() * Math.PI * 2;
      tree.traverse((o) => { o.castShadow = false; }); // garden plants do not need shadows
      scene.add(tree);
    }
  }
  for (const [x, z] of [[4, 31], [OFFICE.x1 + 4.6, 31], [OFFICE.x1 + 4.6, 14], [2.4, 12], [OFFICE.x1 + 4.6, 5], [10, 32.4], [26, 32.4]]) {
    const b = makeBush(x * 10 + z);
    b.position.set(x, 0, z);
    scene.add(b);
  }

  groups.forEach((g) => prepareFade(g)); // every level can be faded on its own

  return {
    update: (t) => animated.forEach((fn) => fn(t)),
    floorTop: top,
    levelGroups: groups,
    lift,
    slabs,
    rooms,
    setDesks: furniture.setDesks,
    furniture,
    windowMat: null,
    lampLights,
  };
};
