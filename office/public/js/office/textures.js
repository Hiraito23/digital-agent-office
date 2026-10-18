// Pixel-art textures drawn on a canvas: grass/path ground, room floors,
// monitor screens, windows and room name signs.
import { canvasTexture, pixelTexture, rand } from "./helpers.js";
import { N, OFFICE, isPath, roomAt } from "./layout.js";

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

export const drawFloorTile = (ctx, ox, oz, style) => {
  const c = FLOOR_STYLES[style];
  ctx.fillStyle = c.base;
  ctx.fillRect(ox, oz, TPX, TPX);
  if (style === "wood") {
    // planks: a seam every 4px, staggered joints
    ctx.fillStyle = c.grout;
    for (let y = 3; y < TPX; y += 4) ctx.fillRect(ox, oz + y, TPX, 1);
    ctx.fillRect(ox + 5, oz, 1, 3); ctx.fillRect(ox + 11, oz + 4, 1, 3); ctx.fillRect(ox + 3, oz + 8, 1, 3); ctx.fillRect(ox + 13, oz + 12, 1, 3);
    ctx.fillStyle = c.light;
    ctx.fillRect(ox + 1, oz + 1, 4, 1); ctx.fillRect(ox + 7, oz + 9, 4, 1);
    return;
  }
  if (style === "carpet") {
    ctx.fillStyle = c.fleck;
    for (let k = 0; k < 6; k += 1) ctx.fillRect(ox + ((k * 7) % TPX), oz + ((k * 5 + 3) % TPX), 1, 1);
    ctx.fillStyle = c.light;
    ctx.fillRect(ox + 4, oz + 12, 1, 1); ctx.fillRect(ox + 12, oz + 2, 1, 1);
    return;
  }
  ctx.fillStyle = c.grout;
  ctx.fillRect(ox, oz + TPX - 1, TPX, 1);
  ctx.fillRect(ox + TPX - 1, oz, 1, TPX);
  ctx.fillStyle = c.light;
  ctx.fillRect(ox + 1, oz + 1, 6, 1);
  ctx.fillRect(ox + 1, oz + 1, 1, 6);
  ctx.fillStyle = c.fleck;
  if (style === "dark") ctx.fillRect(ox + 6, oz + 7, 4, 1);
  else if (style === "marble") { ctx.fillRect(ox + 3, oz + 11, 5, 1); ctx.fillRect(ox + 8, oz + 4, 1, 1); }
  else ctx.fillRect(ox + 9, oz + 10, 2, 1);
};

export const floorTexture = () => {
  const w = OFFICE.x1 - OFFICE.x0;
  const h = OFFICE.z1 - OFFICE.z0;
  return pixelTexture(w * TPX, h * TPX, (ctx) => {
    for (let tz = 0; tz < h; tz += 1) {
      for (let tx = 0; tx < w; tx += 1) {
        const room = roomAt(OFFICE.x0 + tx + 0.5, OFFICE.z0 + tz + 0.5);
        drawFloorTile(ctx, tx * TPX, tz * TPX, room?.floor ?? "tile");
      }
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
