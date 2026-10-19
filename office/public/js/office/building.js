// The building shell: one slab per level (floor texture on top), the outer walls built from the
// level's footprint (with the gate and the lift doorway left open) and the glass lift tower on the
// west side with its moving cabin. Returns one THREE.Group per level (the groups are shown and
// hidden by the "Lantai" buttons) and the lift.
import * as THREE from "three";
import { box, mat } from "./helpers.js";
import { GATE, LEVELS, LEVEL_H, LIFT, RAIL_ZONES, levelTop } from "./layout.js";
import { floorTexture, levelBounds } from "./textures.js";
import { TOP, cornerPost, wallWithGaps } from "./walls.js";

const SLAB = 0.24;

// A slab for one rectangle of a level; the floor texture covers the level's bounding box, so the
// UVs of the top face are computed from world positions.
const slabMesh = (rect, bounds, top, topMaterial, sideMaterial) => {
  const [x0, x1, z0, z1] = rect;
  const geo = new THREE.BoxGeometry(x1 - x0, SLAB, z1 - z0);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  for (let i = 8; i < 12; i += 1) { // the +y face
    uv.setXY(i, (pos.getX(i) + cx - bounds.x0) / (bounds.x1 - bounds.x0), 1 - (pos.getZ(i) + cz - bounds.z0) / (bounds.z1 - bounds.z0));
  }
  const mesh = new THREE.Mesh(geo, [sideMaterial, sideMaterial, topMaterial, sideMaterial, sideMaterial, sideMaterial]);
  mesh.position.set(cx, top - SLAB / 2, cz);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
};

// Merged straight runs of the outer boundary of a level: [{ axis, at, a, b }].
const boundaryRuns = (rects) => {
  const cells = new Set();
  for (const [x0, x1, z0, z1] of rects) for (let i = x0; i < x1; i += 1) for (let j = z0; j < z1; j += 1) cells.add(`${i},${j}`);
  const has = (i, j) => cells.has(`${i},${j}`);
  const lines = new Map(); // "axis|at" -> [[a, b], ...]
  const add = (axis, at, a) => {
    const key = `${axis}|${at}`;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key).push([a, a + 1]);
  };
  for (const key of cells) {
    const [i, j] = key.split(",").map(Number);
    if (!has(i, j - 1)) add("x", j, i);
    if (!has(i, j + 1)) add("x", j + 1, i);
    if (!has(i - 1, j)) add("z", i, j);
    if (!has(i + 1, j)) add("z", i + 1, j);
  }
  const runs = [];
  for (const [key, segs] of lines) {
    const [axis, at] = key.split("|");
    segs.sort((p, q) => p[0] - q[0]);
    let cur = null;
    for (const [a, b] of segs) {
      if (cur && cur.b === a) cur.b = b;
      else { if (cur) runs.push(cur); cur = { axis, at: Number(at), a, b }; }
    }
    if (cur) runs.push(cur);
  }
  return runs;
};

export const buildBuilding = (scene) => {
  const groups = LEVELS.map(() => { const g = new THREE.Group(); scene.add(g); return g; });
  const slabs = []; // { mesh, level }: what hides the levels below (used to hide name tags behind a floor)
  const sideMat = mat("#aab4bf");
  const underMat = mat("#c3ccd5");

  LEVELS.forEach((level, l) => {
    const group = groups[l];
    const y = levelTop(l);
    const bounds = levelBounds(l);
    const tex = floorTexture(l);
    const topMat = new THREE.MeshLambertMaterial({ map: tex });
    for (const rect of level.rects) {
      const slab = slabMesh(rect, bounds, y, topMat, l === 0 ? sideMat : underMat);
      group.add(slab);
      slabs.push({ mesh: slab, level: l });
    }

    // outer walls
    const corners = new Set();
    for (const run of boundaryRuns(level.rects)) {
      const gaps = [];
      if (run.axis === "z" && run.at === 6) gaps.push(LIFT.gap); // the lift doorway
      if (l === GATE.level && run.axis === "x" && run.at === 28) gaps.push([GATE.x0, GATE.x1]); // the front gate
      // split the run where it turns into a railing (the terrace)
      const zone = RAIL_ZONES[l];
      const cuts = [run.a];
      if (zone) {
        const lo = run.axis === "x" ? zone.x0 : zone.z0;
        const hi = run.axis === "x" ? zone.x1 : zone.z1;
        for (const c of [lo, hi]) if (c > run.a && c < run.b) cuts.push(c);
      }
      cuts.push(run.b);
      cuts.sort((p, q) => p - q);
      for (let k = 0; k + 1 < cuts.length; k += 1) {
        const [a, b] = [cuts[k], cuts[k + 1]];
        const mid = (a + b) / 2;
        const [mx, mz] = run.axis === "x" ? [mid, run.at] : [run.at, mid];
        const rail = zone && mx >= zone.x0 - 0.01 && mx <= zone.x1 + 0.01 && mz >= zone.z0 - 0.01 && mz <= zone.z1 + 0.01;
        const own = gaps.filter(([g0, g1]) => g0 >= a - 0.001 && g1 <= b + 0.001);
        wallWithGaps(group, y, run.axis, run.at, a, b, own, rail ? "rail" : "wall");
      }
      for (const [cx, cz] of run.axis === "x" ? [[run.a, run.at], [run.b, run.at]] : [[run.at, run.a], [run.at, run.b]]) {
        const key = `${cx},${cz}`;
        if (!corners.has(key)) { corners.add(key); cornerPost(group, y, cx, cz); }
      }
    }
  });

  // ---- the lift: glass tower on the west side, a landing on every level, a moving cabin ----
  const tower = new THREE.Group();
  scene.add(tower);
  const { cabin } = LIFT;
  const half = 1.5;
  const towerH = levelTop(LEVELS.length - 1) + TOP + 0.6;
  const glass = new THREE.MeshLambertMaterial({ color: "#8cc4ff", transparent: true, opacity: 0.28, depthWrite: false });
  const frame = mat("#46557f");
  for (const [dx, dz, w, d] of [[-half, 0, 0.05, half * 2], [0, -half, half * 2, 0.05], [0, half, half * 2, 0.05]]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, towerH, d), glass);
    pane.position.set(cabin.x + dx, towerH / 2, cabin.z + dz);
    tower.add(pane);
  }
  for (const [dx, dz] of [[-half, -half], [-half, half], [half, -half], [half, half]]) tower.add(box(0.14, towerH, 0.14, frame, cabin.x + dx, towerH / 2, cabin.z + dz));
  tower.add(box(half * 2 + 0.2, 0.12, half * 2 + 0.2, mat("#2a3148"), cabin.x, towerH + 0.06, cabin.z)); // roof
  LEVELS.forEach((_, l) => {
    const landing = box(half * 2, SLAB, half * 2, mat(l === 0 ? "#9aa4b4" : "#c3ccd5"), cabin.x, levelTop(l) - SLAB / 2, cabin.z);
    groups[l].add(landing);
  });

  // the cabin: a plate with low glass sides that follows the riders (set by the world)
  const car = new THREE.Group();
  car.add(box(half * 2 - 0.2, 0.1, half * 2 - 0.2, mat("#4a5a86"), 0, -0.05, 0));
  car.add(box(0.06, 0.12, half * 2 - 0.2, new THREE.MeshBasicMaterial({ color: "#4dabf7" }), -half + 0.15, 0.04, 0, false));
  car.position.set(cabin.x, levelTop(0) + 0.06, cabin.z);
  scene.add(car);
  const lift = {
    car,
    y: levelTop(0),
    // Puts the cabin at a height (it follows its rider).
    set(y) {
      this.y = y;
      car.position.y = y + 0.06;
    },
  };
  return { groups, lift, slabs, levelHeight: LEVEL_H };
};
