// Builds the whole office scene (ground, floor, walls, railing, desks, rooms,
// decor, garden) and returns { update, floorTop, setDesks }.
import * as THREE from "three";
import { addDecor } from "./decor.js";
import { box, mat, rand } from "./helpers.js";
import { DESK_SLOTS, GATE, N, OFFICE, PORTAL, PRIVATE_OFFICES, isPath, seatOf } from "./layout.js";
import { C, makeBush, makeCabinet, makeChair, makeCooler, makeDesk, makeLamp, makePine, makePlanter, makeRack, makeRoundTree } from "./props.js";
import { addRooms } from "./rooms.js";
import { floorTexture, groundTexture, outerGrassTexture, screenTexture, windowTexture } from "./textures.js";

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
  let deskKey = "";
  let deskSeats = [];
  const addDesk = (group, slot, i) => {
    const d = makeDesk(screenTex, i);
    d.position.set(slot.x, top, slot.z);
    group.add(d);
    const seat = seatOf(slot);
    const c = makeChair();
    c.position.set(seat.x, top, seat.z);
    group.add(c);
  };
  // Every private office is furnished from the start.
  DESK_SLOTS.filter((s) => s.room).forEach((slot, i) => addDesk(scene, slot, i));
  // people: [{ id, name }] in desk order (Hermes first). Private offices are
  // filled first and their door sign shows the owner. Open desks in the main
  // hall only appear for agents beyond the number of private offices.
  let openCount = 0;
  const setDesks = (people) => {
    const key = people.map((p) => `${p.id}:${p.name}`).join("|");
    if (key === deskKey) return deskSeats;
    deskKey = key;
    const slots = DESK_SLOTS.slice(0, Math.min(people.length, DESK_SLOTS.length));
    PRIVATE_OFFICES.forEach((room, i) => rooms.setLabel(room.id, people[i] ? `RUANG ${people[i].name.toUpperCase()}` : `${room.name} (KOSONG)`));
    const open = slots.filter((s) => !s.room);
    if (open.length !== openCount) {
      openCount = open.length;
      deskGroup.clear();
      open.forEach((slot, i) => addDesk(deskGroup, slot, i));
    }
    deskSeats = slots.map(seatOf);
    return deskSeats;
  };

  const rooms = addRooms(scene, top);

  // furniture of the private offices: cabinet in the corner, a plant by the door
  PRIVATE_OFFICES.forEach((room, i) => {
    const back = room.door.outside.z > room.door.inside.z;
    const cab = makeCabinet();
    cab.position.set(room.x1 - 0.4, top, back ? room.z0 + 0.4 : room.z1 - 0.45);
    scene.add(cab);
    const plant = makePlanter(300 + i);
    plant.scale.setScalar(0.7);
    plant.position.set(room.x1 - 0.45, top, back ? room.z1 - 0.5 : room.z0 + 0.5);
    scene.add(plant);
  });
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
  const outsideX = OFFICE.x1 + 3.6;
  [[39.4, 18.4, true], [12.7, 18.6, true], [4.6, 21.6, false], [11, 22.6, false], [16, 22.6, true], [21, 22.6, false], [31, 22.6, false],
    [outsideX, 17, false], [outsideX, 11, false], [outsideX, 5, false]]
    .forEach(([x, z, light]) => {
      const l = makeLamp(light);
      l.position.set(x, x < OFFICE.x1 && z < OFFICE.z1 && x > OFFICE.x0 ? top : 0, z);
      scene.add(l);
    });

  // planters and bushes outside the railing
  [[8.5, 1], [11.2, 2], [17, 3], [20.5, 4], [26, 5], [29.5, 6], [33, 7], [37, 8]].forEach(([x, k]) => {
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
      const nearOffice = i >= OFFICE.x0 - 4 && i <= OFFICE.x1 + 4 && j >= OFFICE.z0 - 4 && j <= OFFICE.z1 + 4;
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
  for (const [x, z] of [[4.2, 21], [25, 23.6], [OFFICE.x1 + 4.6, 20], [2.4, 12], [OFFICE.x1 + 4.6, 8], [13, 23.6], [35, 23.6]]) {
    const b = makeBush(x * 10 + z);
    b.position.set(x, 0, z);
    scene.add(b);
  }

  return { update: (t) => animated.forEach((fn) => fn(t)), floorTop: top, setDesks };
};
