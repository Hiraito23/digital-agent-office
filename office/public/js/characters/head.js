// The head: a 16x16 pixel face texture and the hair styles
// (short, long, bob, ponytail, bun, spiky, cap) plus the headset accessory.
import * as THREE from "three";
import { HEAD, darker, lambert, part } from "./parts.js";

export const faceTexture = (skin, withGlasses) => {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#1b1630";
  ctx.fillRect(4, 7, 2, 3);
  ctx.fillRect(10, 7, 2, 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 7, 1, 1);
  ctx.fillRect(10, 7, 1, 1);
  ctx.fillStyle = darker(skin, 0.6);
  ctx.fillRect(7, 12, 2, 1);
  ctx.fillStyle = "rgba(255,120,120,0.45)";
  ctx.fillRect(2, 10, 2, 1);
  ctx.fillRect(12, 10, 2, 1);
  if (withGlasses) {
    ctx.fillStyle = "#212529";
    ctx.fillRect(3, 6, 4, 1); ctx.fillRect(3, 10, 4, 1); ctx.fillRect(3, 6, 1, 5); ctx.fillRect(6, 6, 1, 5);
    ctx.fillRect(9, 6, 4, 1); ctx.fillRect(9, 10, 4, 1); ctx.fillRect(9, 6, 1, 5); ctx.fillRect(12, 6, 1, 5);
    ctx.fillRect(7, 7, 2, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};


export const addHair = (head, look) => {
  const hair = lambert(look.hairColor);
  const top = HEAD.h / 2;
  const back = -HEAD.d / 2;
  const add = (...args) => head.add(part(...args));
  const capped = look.hair === "cap";
  if (!capped) {
    add(HEAD.w + 0.04, 0.14, HEAD.d + 0.04, hair, 0, top + 0.03, 0); // crown
    add(HEAD.w + 0.04, 0.12, 0.1, hair, 0, top - 0.06, HEAD.d / 2 - 0.02); // fringe
    add(HEAD.w + 0.04, 0.34, 0.08, hair, 0, top - 0.17, back - 0.02); // back
    add(0.05, 0.22, HEAD.d * 0.7, hair, -HEAD.w / 2 - 0.02, top - 0.1, -0.05); // sides
    add(0.05, 0.22, HEAD.d * 0.7, hair, HEAD.w / 2 + 0.02, top - 0.1, -0.05);
  }
  switch (look.hair) {
    case "long":
      add(HEAD.w + 0.06, 0.62, 0.1, hair, 0, top - 0.32, back - 0.04);
      add(0.07, 0.5, 0.16, hair, -HEAD.w / 2 - 0.03, top - 0.28, 0.12);
      add(0.07, 0.5, 0.16, hair, HEAD.w / 2 + 0.03, top - 0.28, 0.12);
      break;
    case "bob":
      add(HEAD.w + 0.08, 0.42, 0.12, hair, 0, top - 0.22, back - 0.03);
      add(0.07, 0.38, HEAD.d * 0.9, hair, -HEAD.w / 2 - 0.03, top - 0.2, 0);
      add(0.07, 0.38, HEAD.d * 0.9, hair, HEAD.w / 2 + 0.03, top - 0.2, 0);
      break;
    case "ponytail":
      add(0.14, 0.14, 0.1, hair, 0, top - 0.12, back - 0.08);
      add(0.12, 0.36, 0.12, hair, 0, top - 0.36, back - 0.12);
      break;
    case "bun":
      add(0.22, 0.2, 0.22, hair, 0, top + 0.18, -0.06);
      break;
    case "spiky":
      for (const [x, z, h] of [[-0.16, 0.05, 0.18], [0, 0.08, 0.24], [0.16, 0.04, 0.18], [-0.08, -0.12, 0.2], [0.1, -0.12, 0.2]]) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, h, 4), hair);
        spike.position.set(x, top + 0.1 + h / 2, z);
        spike.castShadow = true;
        head.add(spike);
      }
      break;
    case "cap": {
      const capMat = lambert(look.cap ?? "#e03131");
      add(HEAD.w + 0.06, 0.18, HEAD.d + 0.06, capMat, 0, top + 0.04, 0);
      add(HEAD.w + 0.04, 0.04, 0.24, lambert(look.brim ?? "#a61e1e"), 0, top - 0.04, HEAD.d / 2 + 0.1);
      add(HEAD.w + 0.04, 0.22, 0.08, hair, 0, top - 0.14, back - 0.02);
      add(0.12, 0.08, 0.04, lambert("#ffffff"), 0, top + 0.06, HEAD.d / 2 + 0.035);
      break;
    }
    default:
      break;
  }
  if (look.accessory === "headset") {
    const band = lambert("#212529");
    add(HEAD.w + 0.1, 0.04, 0.06, band, 0, top + 0.12, 0);
    add(0.06, 0.16, 0.14, band, -HEAD.w / 2 - 0.06, 0, 0);
    add(0.06, 0.16, 0.14, band, HEAD.w / 2 + 0.06, 0, 0);
    add(0.03, 0.03, 0.18, band, -HEAD.w / 2 - 0.06, -0.08, 0.12);
  }
};
