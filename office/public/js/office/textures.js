// Pixel-art textures drawn on a canvas: grass/path ground, room floors,
// monitor screens, windows and room name signs.
import { canvasTexture, pixelTexture, rand } from "./helpers.js";
import { LEVELS, N, ROOMS, isPath } from "./layout.js";

export const TPX = 16; // texture pixels per tile

export const groundTexture = () =>
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

export const outerGrassTexture = () =>
  pixelTexture(32, 32, (ctx) => {
    const r = rand(99);
    const grass = ["#4e9a34", "#5fae3f", "#5fae3f", "#74c24f"];
    for (let y = 0; y < 32; y += 1) for (let x = 0; x < 32; x += 1) {
      ctx.fillStyle = grass[Math.floor(r() * grass.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }, [40, 40]);

// One 16px tile, styled by the room it belongs to.
export const FLOOR_STYLES = {
  tile: { base: "#e6ebef", grout: "#c3ccd5", light: "#f6f9fb", fleck: "#d3dbe2" },
  dark: { base: "#2c3753", grout: "#222b44", light: "#3a4870", fleck: "#4dabf7" },
  wood: { base: "#c08552", grout: "#8d5a2b", light: "#d9a066", fleck: "#a86b3c" },
  carpet: { base: "#5f3dc4", grout: "#5f3dc4", light: "#7048e8", fleck: "#9775fa" },
  marble: { base: "#f1f3f5", grout: "#dee2e6", light: "#ffffff", fleck: "#e9c46a" },
};

// Floor tiles are drawn at FPX pixels per tile (a multiple of 10) so that room borders
// at tenths of a tile (e.g. a wall at z = 9.6) fall exactly on a pixel.
export const FPX = 20;

// One tile at (ox, oz), `size` px wide, styled by the room it belongs to. The 16px design is
// scaled: offsets and lengths are multiplied by size / 16, lines stay one pixel thick.
export const drawFloorTile = (ctx, ox, oz, style, size = TPX) => {
  const c = FLOOR_STYLES[style];
  const s = (v) => Math.round((v * size) / 16);
  ctx.fillStyle = c.base;
  ctx.fillRect(ox, oz, size, size);
  if (style === "wood") {
    // planks: a seam every ~4px, staggered joints
    ctx.fillStyle = c.grout;
    for (let y = s(3); y < size; y += s(4)) ctx.fillRect(ox, oz + y, size, 1);
    ctx.fillRect(ox + s(5), oz, 1, s(3)); ctx.fillRect(ox + s(11), oz + s(4), 1, s(3)); ctx.fillRect(ox + s(3), oz + s(8), 1, s(3)); ctx.fillRect(ox + s(13), oz + s(12), 1, s(3));
    ctx.fillStyle = c.light;
    ctx.fillRect(ox + s(1), oz + s(1), s(4), 1); ctx.fillRect(ox + s(7), oz + s(9), s(4), 1);
    return;
  }
  if (style === "carpet") {
    ctx.fillStyle = c.fleck;
    for (let k = 0; k < 6; k += 1) ctx.fillRect(ox + ((k * s(7)) % size), oz + ((k * s(5) + s(3)) % size), 1, 1);
    ctx.fillStyle = c.light;
    ctx.fillRect(ox + s(4), oz + s(12), 1, 1); ctx.fillRect(ox + s(12), oz + s(2), 1, 1);
    return;
  }
  ctx.fillStyle = c.grout;
  ctx.fillRect(ox, oz + size - 1, size, 1);
  ctx.fillRect(ox + size - 1, oz, 1, size);
  ctx.fillStyle = c.light;
  ctx.fillRect(ox + 1, oz + 1, s(6), 1);
  ctx.fillRect(ox + 1, oz + 1, 1, s(6));
  ctx.fillStyle = c.fleck;
  if (style === "dark") ctx.fillRect(ox + s(6), oz + s(7), s(4), 1);
  else if (style === "marble") { ctx.fillRect(ox + s(3), oz + s(11), s(5), 1); ctx.fillRect(ox + s(8), oz + s(4), 1, 1); }
  else ctx.fillRect(ox + s(9), oz + s(10), s(2), 1);
};

// Bounding box of the floor of one level.
export const levelBounds = (level) => LEVELS[level].rects.reduce((b, [x0, x1, z0, z1]) => ({
  x0: Math.min(b.x0, x0), x1: Math.max(b.x1, x1), z0: Math.min(b.z0, z0), z1: Math.max(b.z1, z1),
}), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });

// The floor texture of one level (covers its bounding box): the hall tiles first, then every room's
// own floor clipped to the room's exact rectangle, so floors end precisely under the walls.
export const floorTexture = (level) => {
  const b = levelBounds(level);
  const w = b.x1 - b.x0;
  const h = b.z1 - b.z0;
  return pixelTexture(Math.round(w * FPX), Math.round(h * FPX), (ctx) => {
    const pattern = (style) => {
      const cv = document.createElement("canvas");
      cv.width = Math.round(w * FPX);
      cv.height = Math.round(h * FPX);
      const c = cv.getContext("2d");
      for (let tz = 0; tz < Math.ceil(h); tz += 1) for (let tx = 0; tx < Math.ceil(w); tx += 1) drawFloorTile(c, tx * FPX, tz * FPX, style, FPX);
      return cv;
    };
    const cache = new Map();
    const get = (style) => { if (!cache.has(style)) cache.set(style, pattern(style)); return cache.get(style); };
    ctx.drawImage(get("tile"), 0, 0);
    for (const room of ROOMS) {
      if (room.level !== level) continue;
      const style = room.floor ?? "tile";
      if (style === "tile") continue;
      const x = Math.round((room.x0 - b.x0) * FPX);
      const z = Math.round((room.z0 - b.z0) * FPX);
      const rw = Math.round((room.x1 - room.x0) * FPX);
      const rh = Math.round((room.z1 - room.z0) * FPX);
      ctx.drawImage(get(style), x, z, rw, rh, x, z, rw, rh);
    }
  });
};

export const screenTexture = () =>
  pixelTexture(16, 12, (ctx) => {
    ctx.fillStyle = "#2f74b5";
    ctx.fillRect(0, 0, 16, 12);
    ctx.fillStyle = "#9bd1ff";
    [[2, 2, 8], [2, 4, 5], [2, 6, 10], [2, 8, 6]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 1));
    ctx.fillStyle = "#ff8787";
    ctx.fillRect(11, 7, 3, 3);
  });

export const windowTexture = () =>
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


export const signTexture = (text) => canvasTexture(128, 16, (ctx) => {
  ctx.fillStyle = "#1a2138"; ctx.fillRect(0, 0, 128, 16);
  ctx.fillStyle = "#ffd43b"; ctx.font = "bold 10px Poppins, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 8);
});
