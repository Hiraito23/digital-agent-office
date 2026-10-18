// Wall decor of the main hall: whiteboard, neon sign and clock. Movable furniture (lounge,
// pantry, aquarium, bookshelf, arcade, ping-pong, plants, ...) lives in furniture.js.
// Animated pieces push an update(t) callback into `animated`.
import * as THREE from "three";
import { box, canvasTexture, mat } from "./helpers.js";
import { OFFICE } from "./layout.js";

export const addDecor = (scene, top, animated) => {
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
    ctx.font = "bold 11px Poppins, sans-serif"; ctx.textBaseline = "middle";
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
};
