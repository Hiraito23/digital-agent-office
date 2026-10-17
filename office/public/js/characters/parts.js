// Shared building blocks for characters: materials, colour helper, boxes,
// cylinders, cones and the head size every part is measured against.
import * as THREE from "three";

export const lambert = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

export const darker = (hex, f) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
};

export const part = (w, h, d, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

// 16x16 pixel face for the front of the head.

export const HEAD = { w: 0.5, h: 0.46, d: 0.46, y: 0.9 };


export const cylinder = (rTop, rBottom, h, material, x, y, z) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 12), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};


export const glow = (color) => new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.8, flatShading: true });

export const cone = (r, h, material, x, y, z, segments = 4) => {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};
