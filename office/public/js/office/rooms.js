// Rooms: glass partition walls with door gaps and a name sign per room.
// Room shapes come from ROOMS in layout.js; furniture is in furniture.js.
import * as THREE from "three";
import { box, mat } from "./helpers.js";
import { ROOMS } from "./layout.js";
import { signTexture } from "./textures.js";

// Returns setLabel(roomId, text): the private offices show their owner's name.
export const addRooms = (scene, top) => {
  const signs = new Map(); // private office id -> sign material
  const glass = new THREE.MeshLambertMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.28, depthWrite: false });
  const frame = mat("#46557f");
  const H = 1.25;
  // one straight wall piece from a to b along x ("x") or along z ("z")
  const piece = (along, at, a, b) => {
    const len = b - a;
    if (len <= 0.01) return;
    const mid = a + len / 2;
    const [x, z, sx, sz] = along === "x" ? [mid, at, len, 0.06] : [at, mid, 0.06, len];
    const pane = new THREE.Mesh(new THREE.BoxGeometry(sx, H, sz), glass);
    pane.position.set(x, top + H / 2, z);
    scene.add(pane);
    scene.add(box(along === "x" ? len : 0.1, 0.08, along === "x" ? 0.1 : len, frame, x, top + H, z, false)); // top rail
    scene.add(box(along === "x" ? len : 0.1, 0.12, along === "x" ? 0.1 : len, frame, x, top + 0.06, z, false)); // base
    for (let p = a; p <= b + 0.001; p += 1.5) {
      scene.add(along === "x" ? box(0.07, H, 0.1, frame, p, top + H / 2, at, false) : box(0.1, H, 0.07, frame, at, top + H / 2, p, false));
    }
  };
  for (const room of ROOMS) {
    for (const wall of room.walls) {
      const gaps = [...(wall.gaps ?? [])].sort((g1, g2) => g1[0] - g2[0]);
      let cursor = wall.from;
      for (const [g0, g1] of gaps) {
        piece(wall.along, wall.at, cursor, g0);
        // door posts and lintel
        for (const p of [g0, g1]) scene.add(wall.along === "x" ? box(0.1, H + 0.2, 0.12, frame, p, top + (H + 0.2) / 2, wall.at, false) : box(0.12, H + 0.2, 0.1, frame, wall.at, top + (H + 0.2) / 2, p, false));
        if (wall.along === "x") scene.add(box(g1 - g0, 0.1, 0.12, frame, (g0 + g1) / 2, top + H + 0.15, wall.at, false));
        else scene.add(box(0.12, 0.1, g1 - g0, frame, wall.at, top + H + 0.15, (g0 + g1) / 2, false));
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
      sign.position.set(room.private ? room.x0 + 2 : (g0 + g1) / 2, top + H + 0.42, wall.at + towardWork * 0.07);
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
