// Wall decor of the main hall: whiteboard, neon sign and clock. Movable furniture (lounge,
// pantry, aquarium, bookshelf, arcade, ping-pong, plants, ...) lives in furniture.js.
// Animated pieces push an update(t) callback into `animated`.
import * as THREE from "three";
import { box, canvasTexture, mat } from "./helpers.js";
import { levelTop } from "./layout.js";

export const addDecor = (groups, animated, officeName = "Agentic Digital Office") => {
  // --- whiteboard with sticky notes (north wall of the meeting room, level 2) ---
  const boardTex = canvasTexture(64, 32, (ctx) => {
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(0, 0, 64, 1); ctx.fillRect(0, 31, 64, 1);
    ctx.fillStyle = "#495057"; ctx.fillRect(3, 3, 14, 1); ctx.fillRect(25, 3, 14, 1); ctx.fillRect(47, 3, 14, 1);
    const notes = [["#ffd43b", 3, 7], ["#69db7c", 3, 15], ["#ffa8a8", 25, 7], ["#74c0fc", 25, 15], ["#ffd43b", 25, 23], ["#69db7c", 47, 7]];
    for (const [c, x, y] of notes) { ctx.fillStyle = c; ctx.fillRect(x, y, 10, 6); ctx.fillStyle = "#868e96"; ctx.fillRect(x + 2, y + 2, 6, 1); }
    ctx.fillStyle = "#e03131"; ctx.fillRect(20, 26, 3, 3);
  });
  const top2 = levelTop(2);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.position.set(10.2, top2 + 1.15, 14.1);
  groups[2].add(board);
  groups[2].add(box(2.3, 0.06, 0.06, mat("#868e96"), 10.2, top2 + 0.62, 14.13, false));

  // --- neon sign with the office name (south facade, level 2) ---
  const neonTex = canvasTexture(128, 20, (ctx) => {
    ctx.fillStyle = "#1a2138"; ctx.fillRect(0, 0, 128, 20);
    // the last word in blue, the rest in pink; the font shrinks until the name fits
    const words = officeName.toUpperCase().split(/\s+/);
    const last = words.length > 1 ? words.pop() : "";
    const first = words.join(" ");
    ctx.textBaseline = "middle";
    let size = 11;
    const widthOf = () => ctx.measureText(`${first} ${last}`).width;
    for (; size > 5; size -= 1) { ctx.font = `bold ${size}px Poppins, sans-serif`; if (widthOf() <= 120) break; }
    ctx.font = `bold ${size}px Poppins, sans-serif`;
    const start = Math.max(2, (128 - widthOf()) / 2);
    ctx.fillStyle = "#ff8cc6"; ctx.fillText(first, start, 10);
    ctx.fillStyle = "#74c0fc"; ctx.fillText(last, start + ctx.measureText(`${first} `).width, 10);
  });
  const top1 = levelTop(1);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.56), new THREE.MeshBasicMaterial({ map: neonTex }));
  neon.position.set(16, top1 + 1.25, 24.1);
  groups[1].add(neon);
  animated.push((t) => { neon.material.color.setScalar(Math.floor(t / 2600) % 7 === 0 && (t % 2600) < 160 ? 0.55 : 1); });
};
