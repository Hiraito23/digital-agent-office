// Rooms: glass partition walls with door gaps, a name sign per room, and the
// meeting-room furniture. Room shapes come from ROOMS in layout.js.
import * as THREE from "three";
import { box, mat } from "./helpers.js";
import { ACTIVITY_SPOTS, ROOMS } from "./layout.js";
import { makeChair } from "./props.js";
import { signTexture } from "./textures.js";

export const addRooms = (scene, top) => {
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
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), new THREE.MeshBasicMaterial({ map: signTexture(room.name), side: THREE.DoubleSide }));
      const towardWork = room.door.outside.z > room.door.inside.z ? 1 : -1;
      sign.position.set((g0 + g1) / 2, top + H + 0.42, wall.at + towardWork * 0.07);
      if (towardWork < 0) sign.rotation.y = Math.PI;
      scene.add(sign);
    } else {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.3), new THREE.MeshBasicMaterial({ map: signTexture(room.name), transparent: true }));
      sign.rotation.x = -Math.PI / 2;
      sign.position.set((room.x0 + room.x1) / 2, top + 0.015, room.z1 - 0.45);
      scene.add(sign);
    }
  }

  // meeting room: table + four chairs (seats are ACTIVITY_SPOTS meeting-1..4)
  const table = new THREE.Group();
  table.add(box(2.2, 0.06, 1.0, mat("#8d5a2b"), 0, 0.55, 0));
  for (const [x, z] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) table.add(box(0.06, 0.52, 0.06, mat("#5a3418"), x, 0.26, z));
  table.add(box(0.5, 0.02, 0.3, mat("#f8f9fa"), -0.3, 0.59, 0.1)); // papers
  table.add(box(0.36, 0.04, 0.26, mat("#343a40"), 0.5, 0.6, -0.05)); // laptop
  table.position.set(8.6, top, 6.6);
  scene.add(table);
  for (const spot of ACTIVITY_SPOTS.filter((s) => s.pose === "meeting")) {
    const chair = makeChair();
    chair.position.set(spot.x, top, spot.z);
    chair.rotation.y = spot.heading === 0 ? Math.PI : 0; // backrest behind the sitter
    scene.add(chair);
  }
};
