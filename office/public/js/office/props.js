// Reusable low-poly props (desk, chair, lamp, plants, trees, server rack, ...).
// Each function returns a THREE.Group positioned at its own origin.
import * as THREE from "three";
import { box, cone, mat, rand } from "./helpers.js";

export const C = {
  wall: "#232b47", wallTop: "#4a5a86", trim: "#4dabf7",
  deskTop: "#f1f4f7", deskSide: "#c3ccd5", leg: "#39404d",
  monitor: "#252a36", chair: "#fab005", chairDark: "#e67700", chairBase: "#343a40",
  rack: "#2a3148", lampPole: "#2b2f3a", planter: "#6b7280", soil: "#5c3d24",
  bush: ["#2f8a3e", "#40a94f", "#63c96b"], trunk: "#7a4a24",
  leaves: ["#318a2f", "#45a83a", "#62c450", "#86dc6b"], pine: ["#25793a", "#33964a", "#4db862"],
  rail: "#aeb7c6", cabinet: "#3a4256",
};

// Single desk (1.3 x 0.75) with one wide monitor and a personal item that
// differs per desk so the room does not look copy-pasted.
export const makeDesk = (screenTex, index = 0) => {
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

export const makeChair = () => {
  const g = new THREE.Group();
  g.add(box(0.42, 0.08, 0.42, mat(C.chair), 0, 0.36, 0));
  g.add(box(0.42, 0.46, 0.08, mat(C.chair), 0, 0.62, 0.2));
  g.add(box(0.36, 0.06, 0.06, mat(C.chairDark), 0, 0.42, 0.2));
  g.add(box(0.05, 0.3, 0.05, mat(C.chairBase), 0, 0.18, 0));
  g.add(box(0.4, 0.04, 0.04, mat(C.chairBase), 0, 0.03, 0));
  g.add(box(0.04, 0.04, 0.4, mat(C.chairBase), 0, 0.03, 0));
  return g;
};

export const makeLamp = (lights) => {
  const g = new THREE.Group();
  g.add(box(0.22, 0.12, 0.22, mat("#3a4256"), 0, 0.06, 0));
  g.add(box(0.08, 1.75, 0.08, mat(C.lampPole), 0, 0.95, 0));
  g.add(box(0.34, 0.07, 0.34, mat("#4a5268"), 0, 1.84, 0)); // lantern base
  g.add(box(0.28, 0.28, 0.28, new THREE.MeshBasicMaterial({ color: "#ffe27a" }), 0, 2.02, 0, false)); // glowing lantern
  g.add(box(0.38, 0.07, 0.38, mat("#4a5268"), 0, 2.2, 0)); // cap
  if (lights) {
    const light = new THREE.PointLight("#ffd98a", 0.9, 5, 1.6);
    light.position.set(0, 1.95, 0);
    g.add(light);
  }
  return g;
};

// Stone pillar with a vertical blue light strip on the two faces that look at the camera.
export const makePillar = () => {
  const g = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color: "#4dabf7" });
  g.add(box(0.62, 0.22, 0.62, mat("#4a5268"), 0, 0.11, 0));
  g.add(box(0.48, 1.65, 0.48, mat("#6e788f"), 0, 1.04, 0));
  g.add(box(0.07, 1.25, 0.04, glow, 0.0, 1.05, 0.25, false));
  g.add(box(0.04, 1.25, 0.07, glow, 0.25, 1.05, 0.0, false));
  g.add(box(0.66, 0.14, 0.66, mat("#2a3148"), 0, 1.93, 0));
  return g;
};

export const makePlanter = (seed) => {
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

export const makeBush = (seed) => {
  const r = rand(seed);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + r() * 0.1, 0), mat(C.bush[Math.floor(r() * 3)]));
  b.position.y = 0.22;
  b.castShadow = true;
  const g = new THREE.Group();
  g.add(b);
  return g;
};

export const makePine = (scale) => {
  const g = new THREE.Group();
  g.add(box(0.16, 0.6, 0.16, mat(C.trunk), 0, 0.3, 0));
  [[0.85, 0.95, 0.9, 0], [0.7, 0.9, 1.45, 1], [0.52, 0.85, 1.95, 1], [0.34, 0.8, 2.4, 2]].forEach(([rad, h, y, c]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), mat(C.pine[c]));
    cone.position.y = y;
    cone.castShadow = true;
    g.add(cone);
  });
  g.scale.setScalar(scale);
  return g;
};

export const makeRoundTree = (scale, seed) => {
  const r = rand(seed);
  const g = new THREE.Group();
  g.add(box(0.2, 1.0, 0.2, mat(C.trunk), 0, 0.5, 0));
  const blobs = [[0, 1.45, 0, 0.78], [-0.5, 1.2, 0.12, 0.5], [0.5, 1.25, -0.1, 0.52], [0.05, 1.95, 0.05, 0.55], [-0.2, 1.3, -0.45, 0.45], [0.2, 1.35, 0.45, 0.45]];
  blobs.forEach(([x, y, z, rad], k) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), mat(C.leaves[(k + Math.floor(r() * 2)) % 4]));
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  });
  g.scale.setScalar(scale);
  return g;
};

export const makeRack = () => {
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

export const makeCabinet = () => {
  const g = new THREE.Group();
  g.add(box(0.55, 0.8, 0.75, mat(C.cabinet), 0, 0.4, 0));
  for (let row = 0; row < 3; row += 1) g.add(box(0.02, 0.04, 0.2, mat("#ffd43b"), 0.285, 0.18 + row * 0.25, 0, false));
  g.add(box(0.3, 0.06, 0.25, mat("#f8f9fa"), 0, 0.83, 0));
  return g;
};

export const makeCooler = () => {
  const g = new THREE.Group();
  g.add(box(0.35, 0.7, 0.35, mat("#ced4da"), 0, 0.35, 0));
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.35, 8), new THREE.MeshLambertMaterial({ color: "#74c0fc", transparent: true, opacity: 0.85 }));
  bottle.position.y = 0.88;
  g.add(bottle);
  return g;
};
