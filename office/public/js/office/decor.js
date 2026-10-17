// Decor that makes the office lively: lounge, pantry, aquarium, bookshelf,
// whiteboard, neon sign, clock, arcade, ping-pong and big plants.
// Animated pieces push an update(t) callback into `animated`.
import * as THREE from "three";
import { box, canvasTexture, cone, mat } from "./helpers.js";
import { OFFICE } from "./layout.js";
import { C } from "./props.js";

export const addDecor = (scene, top, animated) => {
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
