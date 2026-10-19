// Wall pieces shared by the partitions between rooms and the outer walls of the building: a solid
// dark base with a neon strip, glass above it (so agents behind a wall stay visible from the
// camera), stone door posts and a low glass railing for open edges such as the terrace.
import * as THREE from "three";
import { box, mat } from "./helpers.js";

const WALL = "#232b47";
const CAP = "#4a5a86";
const POST = "#181f38";
const STONE = "#6e788f";
export const BASE = 0.75; // the solid part of a wall
export const TOP = 1.6; // top of the glass
const TH = 0.16; // wall thickness

let neonMat = null;
let glassMat = null;
const neon = () => (neonMat ??= new THREE.MeshBasicMaterial({ color: "#4dabf7" }));
const glass = () => (glassMat ??= new THREE.MeshLambertMaterial({ color: "#8cc4ff", transparent: true, opacity: 0.26, depthWrite: false }));

// One straight wall piece from a to b along x ("x", at z = at) or along z ("z", at x = at).
// `y` is the floor surface of the level; the style is "wall" or "rail".
export const wallPiece = (group, y, along, at, a, b, style = "wall") => {
  const len = b - a;
  if (len <= 0.01) return;
  const x = along === "x";
  const mid = a + len / 2;
  const [px, pz] = x ? [mid, at] : [at, mid];
  const sx = (l, t) => (x ? [l, 0, t] : [t, 0, l]); // [w, _, d] for a piece of length l and thickness t
  const add = (l, h, t, material, yy, shadow = true) => {
    const [w, , d] = sx(l, t);
    group.add(box(w, h, d, material, px, yy, pz, shadow));
  };
  if (style === "rail") {
    const h = 0.9;
    const [w, , d] = sx(len, 0.04);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.1, d), glass());
    pane.position.set(px, y + 0.1 + (h - 0.1) / 2, pz);
    group.add(pane);
    add(len, 0.05, 0.08, neon(), y + h, false);
    for (let p = a; p <= b + 0.001; p += 1.5) group.add(x ? box(0.07, h, 0.07, mat(STONE), p, y + h / 2, at, false) : box(0.07, h, 0.07, mat(STONE), at, y + h / 2, p, false));
    return;
  }
  add(len, BASE, TH, mat(WALL), y + BASE / 2); // solid base
  add(len + 0.02, 0.07, TH + 0.08, mat(CAP), y + BASE + 0.035, false); // cap
  add(len, 0.04, 0.03, neon(), y + BASE + 0.09, false); // neon strip
  const gh = TOP - BASE - 0.1;
  const [w, , d] = sx(len, 0.04);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(w, gh, d), glass());
  pane.position.set(px, y + BASE + 0.1 + gh / 2, pz);
  group.add(pane);
  add(len, 0.06, 0.08, mat(CAP), y + TOP, false); // top rail
  for (let p = a; p <= b + 0.001; p += 1.5) {
    group.add(x ? box(0.07, TOP - BASE, 0.1, mat(POST), p, y + BASE + (TOP - BASE) / 2, at, false) : box(0.1, TOP - BASE, 0.07, mat(POST), at, y + BASE + (TOP - BASE) / 2, p, false));
  }
};

// A door post: a stone pillar with a blue strip, a little taller than the wall.
export const doorPost = (group, y, along, at, p) => {
  const [px, pz] = along === "x" ? [p, at] : [at, p];
  group.add(box(0.22, TOP + 0.3, 0.22, mat(STONE), px, y + (TOP + 0.3) / 2, pz));
  group.add(box(0.07, TOP - 0.2, 0.24, neon(), px, y + TOP / 2, pz, false));
};

// A wall with gaps (doors): pieces between the gaps, posts at the gap edges and a lintel above each.
export const wallWithGaps = (group, y, along, at, from, to, gaps = [], style = "wall") => {
  const sorted = [...gaps].sort((g1, g2) => g1[0] - g2[0]);
  let cursor = from;
  for (const [g0, g1] of sorted) {
    wallPiece(group, y, along, at, cursor, g0, style);
    for (const p of [g0, g1]) doorPost(group, y, along, at, p);
    const lintel = along === "x" ? box(g1 - g0, 0.1, 0.14, mat(CAP), (g0 + g1) / 2, y + TOP + 0.25, at, false) : box(0.14, 0.1, g1 - g0, mat(CAP), at, y + TOP + 0.25, (g0 + g1) / 2, false);
    group.add(lintel);
    cursor = g1;
  }
  wallPiece(group, y, along, at, cursor, to, style);
};

// A corner post where two walls meet.
export const cornerPost = (group, y, x, z) => {
  group.add(box(0.28, TOP + 0.1, 0.28, mat(STONE), x, y + (TOP + 0.1) / 2, z));
};
