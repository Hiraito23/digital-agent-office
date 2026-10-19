// Rooms: partition walls with door gaps and a name sign above each door (or on the floor for
// open zones). Room shapes come from ROOMS in layout.js; furniture is in furniture.js.
import * as THREE from "three";
import { ROOMS, levelTop } from "./layout.js";
import { signTexture } from "./textures.js";
import { wallWithGaps, TOP } from "./walls.js";

// `groups`: one THREE.Group per level. Returns setLabel(roomId, text): the private rooms show the
// name of the agent who works in them.
export const addRooms = (groups) => {
  const signs = new Map(); // room id -> sign material (private rooms only)
  for (const room of ROOMS) {
    const group = groups[room.level];
    const y = levelTop(room.level);
    for (const wall of room.walls) wallWithGaps(group, y, wall.along, wall.at, wall.from, wall.to, wall.gaps);

    if (room.door) {
      // two single-sided faces sharing one material: readable from both sides, never mirrored
      const wall = room.walls.find((w) => w.gaps?.length);
      const [g0, g1] = wall.gaps[0];
      const signMat = new THREE.MeshBasicMaterial({ map: signTexture(room.name) });
      const sign = new THREE.Group();
      const front = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), signMat);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), signMat);
      front.position.z = 0.005;
      back.position.z = -0.005;
      back.rotation.y = Math.PI;
      sign.add(front, back);
      const mid = (g0 + g1) / 2;
      // the sign faces the side the door opens to
      if (wall.along === "x") {
        const toward = room.door.outside.z > room.door.inside.z ? 1 : -1;
        sign.position.set(mid, y + TOP + 0.5, wall.at + toward * 0.09);
        if (toward < 0) sign.rotation.y = Math.PI;
      } else {
        const toward = room.door.outside.x > room.door.inside.x ? 1 : -1;
        sign.position.set(wall.at + toward * 0.09, y + TOP + 0.5, mid);
        sign.rotation.y = toward > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      group.add(sign);
      if (room.private) signs.set(room.id, signMat);
    } else {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.3), new THREE.MeshBasicMaterial({ map: signTexture(room.name), transparent: true }));
      sign.rotation.x = -Math.PI / 2;
      sign.position.set(room.sign?.x ?? (room.x0 + room.x1) / 2, y + 0.015, room.sign?.z ?? room.z1 - 0.45);
      group.add(sign);
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
