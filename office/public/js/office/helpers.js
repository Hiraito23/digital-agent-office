// Small building blocks shared by the scene modules: seeded random numbers,
// cached materials, boxes/cones and pixel-art canvas textures.
import * as THREE from "three";

export const rand = (seed) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 100000) / 100000;
  };
};

export const pixelTexture = (w, h, draw, repeat = [1, 1]) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"));
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  return tex;
};

export const matCache = new Map();
export const mat = (color, opts = {}) => {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return matCache.get(key);
};

export const box = (w, h, d, material, x = 0, y = 0, z = 0, shadow = true) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
};

export const cone = (r, h, material, x, y, z, segments = 4) => {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

export const canvasTexture = (w, h, draw) => {
  const tex = pixelTexture(w, h, draw);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};
