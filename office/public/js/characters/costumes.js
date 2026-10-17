// Costumes: creature onesies (Pokémon/Digimon themes) that replace hair and
// clothes with a hood, ears and tail, and anime outfits that keep the hair and
// add a uniform plus props. Add a costume by adding an entry to COSTUMES.
import * as THREE from "three";
import { HEAD, cone, cylinder, darker, glow, lambert, part } from "./parts.js";

// ---------------------------------------------------------------------------
// Costumes: hooded onesies inspired by Pokémon- and Digimon-style creatures.
// Original voxel designs (no official names or logos), built from boxes.
// ---------------------------------------------------------------------------

export const COSTUMES = {
  "tikus-listrik": { label: "Tikus Listrik", theme: "pokemon", body: "#ffd43b", feet: "#e0a800", ears: "pointy", earTip: "#212529", cheeks: "#fa5252", tail: "bolt", tailBase: "#8d5a2b" },
  "kadal-api": { label: "Kadal Api", theme: "pokemon", body: "#f76707", belly: "#ffe8a3", ears: "nub", tail: "flame" },
  "kura-air": { label: "Kura Air", theme: "pokemon", body: "#4dabf7", belly: "#ffe8a3", tail: "shell", shell: "#a0522d", rim: "#ffe8a3" },
  "kodok-daun": { label: "Kodok Daun", theme: "pokemon", body: "#63e6be", spots: "#12b886", ears: "nub", tail: "bulb", bulb: "#2f9e44" },
  "rubah-cokelat": { label: "Rubah Cokelat", theme: "pokemon", body: "#a9714b", collar: "#fff0d9", ears: "fox", tail: "fluffy", tailTip: "#fff0d9" },
  "dino-oranye": { label: "Dino Oranye", theme: "digimon", body: "#ff922b", hoodEyes: "#51cf66", tail: "dino" },
  "serigala-bertanduk": { label: "Serigala Bertanduk", theme: "digimon", body: "#f1e3c8", stripes: "#4dabf7", horn: "#ffd43b", collar: "#f8f9fa", ears: "fox" },
  "naga-biru": { label: "Naga Biru", theme: "digimon", body: "#3b5bdb", belly: "#ffffff", noseHorn: "#ffd43b", ears: "pointy-small", earTip: "#3b5bdb", tail: "dino" },
  "bayi-bersayap": { label: "Bayi Bersayap", theme: "digimon", body: "#ffc078", belly: "#fff4e6", ears: "wing", feet: "#e8590c" },
  // Anime archetypes: hair stays visible, the costume is a uniform plus props.
  "ninja-oranye": { label: "Ninja Oranye", theme: "anime", hair: "spiky", hairColor: "#ffd43b", top: "#f76707", pants: "#f76707", shoes: "#1c3d5a", extras: ["headband", "shoulders"] },
  "seragam-pelaut": { label: "Seragam Pelaut", theme: "anime", hair: "long", hairColor: "#3b2416", top: "#f8f9fa", outfit: "dress", shoes: "#2b2b2b", extras: ["sailor"] },
  "gakuran": { label: "Gakuran Sekolah", theme: "anime", hair: "spiky", hairColor: "#1e1e24", top: "#1b1f2a", pants: "#1b1f2a", shoes: "#3b2f2f", extras: ["gakuran"] },
  "petarung-gi": { label: "Petarung Gi", theme: "anime", hair: "spiky", hairColor: "#1e1e24", top: "#f76707", pants: "#f76707", shoes: "#1c3d5a", extras: ["gi"] },
  "bajak-laut-jerami": { label: "Bajak Laut Topi Jerami", theme: "anime", hair: "short", hairColor: "#1e1e24", top: "#e03131", pants: "#1971c2", shoes: "#c97b45", extras: ["strawhat", "openvest"] },
  "penyihir": { label: "Penyihir", theme: "anime", hair: "long", hairColor: "#e9ecef", top: "#5f3dc4", pants: "#3b1f8f", shoes: "#212529", extras: ["witchhat", "cape"] },
};


// Props for anime costumes (hair is drawn by addHair as usual).
export const addAnimeExtras = (head, torso, c) => {
  const top = HEAD.h / 2;
  const front = HEAD.d / 2;
  const has = (name) => c.extras?.includes(name);
  if (has("headband")) {
    head.add(part(HEAD.w + 0.05, 0.06, HEAD.d + 0.05, lambert("#1c3d5a"), 0, top - 0.1, 0));
    head.add(part(0.2, 0.08, 0.02, lambert("#ced4da"), 0, top - 0.1, front + 0.035));
  }
  if (has("shoulders")) torso.add(part(0.38, 0.08, 0.23, lambert("#1b1f2a"), 0, 0.3, 0));
  if (has("sailor")) {
    const navy = lambert("#1c3d5a");
    torso.add(part(0.38, 0.07, 0.24, navy, 0, 0.31, 0)); // collar
    torso.add(part(0.3, 0.12, 0.02, navy, 0, 0.27, -0.12)); // square back flap
    torso.add(part(0.12, 0.06, 0.03, lambert("#e03131"), 0, 0.24, 0.125)); // ribbon
    torso.add(part(0.46, 0.17, 0.3, navy, 0, -0.04, 0)); // pleated skirt
  }
  if (has("gakuran")) {
    torso.add(part(0.3, 0.06, 0.2, lambert("#1b1f2a"), 0, 0.33, 0)); // stand collar
    for (const y of [0.26, 0.18, 0.1]) torso.add(part(0.035, 0.035, 0.02, lambert("#fab005"), 0, y, 0.12));
  }
  if (has("gi")) {
    torso.add(part(0.14, 0.12, 0.02, lambert("#1c3d5a"), 0, 0.28, 0.115)); // undershirt V
    torso.add(part(0.38, 0.05, 0.24, lambert("#1c3d5a"), 0, 0.03, 0)); // belt
  }
  if (has("openvest")) torso.add(part(0.1, 0.3, 0.02, lambert(c.skin ?? "#f1c7a3"), 0, 0.17, 0.115));
  if (has("strawhat")) {
    head.add(cylinder(0.42, 0.42, 0.03, lambert("#f2c94c"), 0, top + 0.05, 0));
    head.add(cylinder(0.21, 0.23, 0.16, lambert("#f2c94c"), 0, top + 0.14, 0));
    head.add(cylinder(0.235, 0.235, 0.045, lambert("#e03131"), 0, top + 0.09, 0));
  }
  if (has("witchhat")) {
    head.add(cylinder(0.4, 0.4, 0.03, lambert("#3b1f8f"), 0, top + 0.06, 0));
    const tip = cone(0.22, 0.46, lambert("#3b1f8f"), 0.02, top + 0.3, -0.02, 10);
    tip.rotation.z = -0.15;
    head.add(tip);
  }
  if (has("cape")) torso.add(part(0.44, 0.5, 0.03, lambert("#1b1f2a"), 0, 0.1, -0.13));
};


export const addCostume = (head, torso, c) => {
  const bodyMat = lambert(c.body);
  const top = HEAD.h / 2;
  const front = HEAD.d / 2;
  const hood = (...args) => head.add(part(...args));

  // hood framing the face
  hood(HEAD.w + 0.08, 0.1, HEAD.d + 0.08, bodyMat, 0, top + 0.04, 0);
  hood(HEAD.w + 0.08, HEAD.h + 0.06, 0.07, bodyMat, 0, -0.01, -front - 0.035);
  for (const s of [-1, 1]) hood(0.06, HEAD.h + 0.02, HEAD.d + 0.04, bodyMat, s * (HEAD.w / 2 + 0.03), -0.01, 0);
  hood(HEAD.w + 0.08, 0.08, 0.06, bodyMat, 0, top - 0.03, front + 0.02);

  // ears
  for (const s of [-1, 1]) {
    if (c.ears === "pointy" || c.ears === "pointy-small") {
      const small = c.ears === "pointy-small";
      const ear = new THREE.Group();
      ear.position.set(s * 0.17, top + 0.08, 0);
      ear.rotation.z = -s * (small ? 0.5 : 0.28);
      ear.add(part(0.1, small ? 0.18 : 0.34, 0.07, bodyMat, 0, small ? 0.09 : 0.17, 0));
      if (!small) ear.add(part(0.105, 0.11, 0.075, lambert(c.earTip), 0, 0.29, 0));
      head.add(ear);
    } else if (c.ears === "fox") {
      const ear = cone(0.11, 0.28, bodyMat, s * 0.16, top + 0.2, 0);
      ear.rotation.z = -s * 0.25;
      head.add(ear);
    } else if (c.ears === "nub") {
      hood(0.08, 0.08, 0.07, bodyMat, s * 0.16, top + 0.12, 0.02);
    } else if (c.ears === "wing") {
      const wing = new THREE.Group();
      wing.position.set(s * 0.3, 0.04, -0.02);
      wing.rotation.z = s * 0.35;
      wing.add(part(0.34, 0.14, 0.04, bodyMat, s * 0.12, 0, 0));
      wing.add(part(0.2, 0.08, 0.045, lambert(darker(c.body, 0.8)), s * 0.2, -0.08, 0));
      head.add(wing);
    }
  }

  // face and head details
  if (c.cheeks) for (const s of [-1, 1]) hood(0.07, 0.06, 0.01, lambert(c.cheeks), s * 0.17, -0.07, front + 0.006);
  if (c.hoodEyes) {
    for (const s of [-1, 1]) {
      hood(0.08, 0.06, 0.02, lambert(c.hoodEyes), s * 0.11, top + 0.06, front + 0.045);
      hood(0.035, 0.035, 0.02, lambert("#1b1630"), s * 0.11, top + 0.06, front + 0.055);
    }
  }
  if (c.horn) head.add(cone(0.06, 0.2, lambert(c.horn), 0, top + 0.18, 0.12));
  if (c.noseHorn) {
    const nose = cone(0.05, 0.14, lambert(c.noseHorn), 0, top + 0.02, front + 0.1);
    nose.rotation.x = Math.PI / 2;
    head.add(nose);
  }
  if (c.stripes) for (const x of [-0.12, 0, 0.12]) hood(0.06, 0.02, HEAD.d + 0.1, lambert(c.stripes), x, top + 0.1, 0);
  if (c.spots) for (const [x, z] of [[-0.14, 0.08], [0.1, -0.1], [0.16, 0.12]]) hood(0.08, 0.02, 0.08, lambert(c.spots), x, top + 0.1, z);

  // body details
  if (c.belly) torso.add(part(0.24, 0.24, 0.02, lambert(c.belly), 0, 0.15, 0.115));
  if (c.collar) {
    const fur = lambert(c.collar);
    torso.add(part(0.44, 0.1, 0.3, fur, 0, 0.34, 0));
    for (const x of [-0.14, 0, 0.14]) torso.add(part(0.1, 0.1, 0.06, fur, x, 0.27, 0.15));
  }

  // tails (attached to the back of the torso)
  const tail = new THREE.Group();
  tail.position.set(0, 0.06, -0.11);
  torso.add(tail);
  const seg = (w, h, d, mat, x, y, z, rx = 0, rz = 0) => {
    const p = part(w, h, d, mat, x, y, z);
    p.rotation.set(rx, 0, rz);
    tail.add(p);
  };
  if (c.tail === "bolt") {
    seg(0.06, 0.14, 0.05, lambert(c.tailBase), 0, 0.02, -0.05, 0, 0.6);
    seg(0.08, 0.16, 0.05, bodyMat, 0.06, 0.14, -0.08, 0, -0.6);
    seg(0.16, 0.2, 0.05, bodyMat, 0, 0.3, -0.1, 0, 0.5);
  } else if (c.tail === "flame") {
    seg(0.08, 0.08, 0.26, bodyMat, 0, 0, -0.12, -0.3);
    tail.add(cone(0.07, 0.18, glow("#ff6b00"), 0, 0.1, -0.27, 6));
    tail.add(cone(0.04, 0.12, glow("#ffd43b"), 0, 0.08, -0.27, 6));
  } else if (c.tail === "shell") {
    seg(0.38, 0.34, 0.08, lambert(c.shell), 0, 0.11, -0.03);
    seg(0.4, 0.04, 0.09, lambert(c.rim), 0, -0.05, -0.03);
    seg(0.4, 0.04, 0.09, lambert(c.rim), 0, 0.27, -0.03);
    seg(0.12, 0.12, 0.01, lambert(darker(c.shell, 0.75)), 0, 0.11, -0.075);
  } else if (c.tail === "bulb") {
    const bud = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), lambert(c.bulb));
    bud.position.set(0, 0.22, -0.12);
    bud.castShadow = true;
    tail.add(bud);
    for (const s of [-1, 1]) {
      const leaf = cone(0.06, 0.16, lambert(darker(c.bulb, 1.25)), s * 0.1, 0.36, -0.12);
      leaf.rotation.z = -s * 0.5;
      tail.add(leaf);
    }
  } else if (c.tail === "fluffy") {
    seg(0.16, 0.16, 0.32, bodyMat, 0, 0.1, -0.14, 0.6);
    seg(0.18, 0.12, 0.12, lambert(c.tailTip), 0, 0.22, -0.28, 0.6);
  } else if (c.tail === "dino") {
    seg(0.15, 0.13, 0.18, bodyMat, 0, -0.02, -0.08);
    seg(0.09, 0.09, 0.15, bodyMat, 0, -0.05, -0.22);
  }
};
