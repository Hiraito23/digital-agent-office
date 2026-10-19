// Rooms: glass partition walls with door gaps and a name sign per room.
// Room shapes come from ROOMS in layout.js; furniture is in furniture.js.
import * as THREE from "three";
import { box, mat } from "./helpers.js";
import { ROOMS } from "./layout.js";
import { signTexture } from "./textures.js";

// Returns setLabel(roomId, text): the private offices show their owner's name.
export const addRooms = (scene, top) => {
  const signs = new Map(); // private office id -> sign material
  const glass = new THREE.MeshLambertMaterial({ color: "#8cc4ff", transparent: true, opacity: 0.26, depthWrite: false });
  const wallMat = mat("#232b47");
  const cap = mat("#4a5a86");
  const post = mat("#181f38");
  const neon = new THREE.MeshBasicMaterial({ color: "#4dabf7" });
  const BASE = 0.75; // solid part of a partition: the camera looks over it into the room
  const H = 1.6; // top of the glass
  const TH = 0.16;
  // one straight wall piece from a to b along x ("x") or along z ("z")
  const piece = (along, at, a, b) => {
    const len = b - a;
    if (len <= 0.01) return;
    const mid = a + len / 2;
    const x = along === "x";
    const [px, pz] = x ? [mid, at] : [at, mid];
    const [sx, sz] = x ? [len, TH] : [TH, len];
    scene.add(box(sx, BASE, sz, wallMat, px, top + BASE / 2, pz)); // solid base
    scene.add(box(x ? len + 0.02 : TH + 0.08, 0.07, x ? TH + 0.08 : len + 0.02, cap, px, top + BASE + 0.035, pz, false)); // cap
    scene.add(box(x ? len : 0.03, 0.04, x ? 0.03 : len, neon, px, top + BASE + 0.09, pz, false)); // neon strip
    const pane = new THREE.Mesh(new THREE.BoxGeometry(x ? len : 0.04, H - BASE - 0.1, x ? 0.04 : len), glass);
    pane.position.set(px, top + BASE + 0.1 + (H - BASE - 0.1) / 2, pz);
    scene.add(pane);
    scene.add(box(x ? len : 0.08, 0.06, x ? 0.08 : len, cap, px, top + H, pz, false)); // top rail
    for (let p = a; p <= b + 0.001; p += 1.5) {
      scene.add(x ? box(0.07, H - BASE, 0.1, post, p, top + BASE + (H - BASE) / 2, at, false) : box(0.1, H - BASE, 0.07, post, at, top + BASE + (H - BASE) / 2, p, false));
    }
  };
  // a door post: stone pillar with a blue strip, taller than the wall
  const doorPost = (along, at, p) => {
    const x = along === "x";
    const [px, pz] = x ? [p, at] : [at, p];
    scene.add(box(0.22, H + 0.3, 0.22, mat("#6e788f"), px, top + (H + 0.3) / 2, pz));
    scene.add(box(0.07, H - 0.2, 0.24, neon, px, top + H / 2, pz, false));
  };
  for (const room of ROOMS) {
    for (const wall of room.walls) {
      const gaps = [...(wall.gaps ?? [])].sort((g1, g2) => g1[0] - g2[0]);
      let cursor = wall.from;
      for (const [g0, g1] of gaps) {
        piece(wall.along, wall.at, cursor, g0);
        // door posts and lintel
        for (const p of [g0, g1]) doorPost(wall.along, wall.at, p);
        if (wall.along === "x") scene.add(box(g1 - g0, 0.1, 0.14, cap, (g0 + g1) / 2, top + H + 0.25, wall.at, false));
        else scene.add(box(0.14, 0.1, g1 - g0, cap, wall.at, top + H + 0.25, (g0 + g1) / 2, false));
        cursor = g1;
      }
      piece(wall.along, wall.at, cursor, wall.to);
    }
    // name sign above the door (facing the work area), or on the floor for open rooms
    if (room.door) {
      const wall = room.walls.find((w) => w.gaps?.length);
      const [g0, g1] = wall.gaps[0];
      // two single-sided faces sharing one material: readable from both sides, never mirrored
      const signMat = new THREE.MeshBasicMaterial({ map: signTexture(room.name) });
      const sign = new THREE.Group();
      const front = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), signMat);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), signMat);
      front.position.z = 0.005;
      back.position.z = -0.005;
      back.rotation.y = Math.PI;
      sign.add(front, back);
      const towardWork = room.door.outside.z > room.door.inside.z ? 1 : -1;
      sign.position.set(room.private ? room.x0 + 2 : (g0 + g1) / 2, top + H + 0.5, wall.at + towardWork * 0.07);
      if (towardWork < 0) sign.rotation.y = Math.PI;
      scene.add(sign);
      if (room.private) signs.set(room.id, signMat);
    } else {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.3), new THREE.MeshBasicMaterial({ map: signTexture(room.name), transparent: true }));
      sign.rotation.x = -Math.PI / 2;
      sign.position.set(room.sign?.x ?? (room.x0 + room.x1) / 2, top + 0.015, room.sign?.z ?? room.z1 - 0.45);
      scene.add(sign);
    }
  }

  const labels = new Map();
  return {
    setLabel(roomId, text) {
      const material = signs.get(roomId);
      if (!material || labels.get(roomId) === text) return;
      labels.set(roomId, text);
      material.map?.dispose();
      material.map = signTexture(text);
      material.needsUpdate = true;
    },
  };
};
