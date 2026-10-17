// Voxel chibi people (big head, small body) built from boxes.
// Appearance schema matches people.json: hair, hairColor, skin, top, shirt,
// tie, outfit, pants, shoes, cap, brim, accessory.
import * as THREE from "three";

export const PRESETS = [
  { hair: "cap", hairColor: "#4a2c1a", cap: "#e03131", brim: "#a61e1e", skin: "#f5c9a0", top: "#1c7ed6", shirt: "#ffd43b", tie: "#ffd43b", outfit: "blazer", pants: "#343a40", shoes: "#212529" },
  { hair: "long", hairColor: "#3b2416", skin: "#e8b48a", top: "#e64980", shirt: "#ffffff", outfit: "dress", pants: "#2b2f3a", shoes: "#5c2b2b" },
  { hair: "short", hairColor: "#1e1e24", skin: "#c68b5e", top: "#2f9e44", shirt: "#ffffff", tie: "#1b4332", outfit: "blazer", pants: "#495057", shoes: "#2b2b2b", accessory: "glasses" },
  { hair: "ponytail", hairColor: "#7a3e1d", skin: "#f1c7a3", top: "#7048e8", outfit: "hoodie", pants: "#364fc7", shoes: "#f8f9fa", accessory: "headset" },
  { hair: "bob", hairColor: "#d9480f", skin: "#ffd8b8", top: "#f59f00", shirt: "#fff4e6", outfit: "shirt", pants: "#5c3d24", shoes: "#3b2f2f" },
  { hair: "spiky", hairColor: "#ffd43b", skin: "#e0a77a", top: "#e8590c", outfit: "hoodie", pants: "#1c3d5a", shoes: "#c92a2a" },
  { hair: "bun", hairColor: "#2b1a12", skin: "#a9714b", top: "#0c8599", shirt: "#e3fafc", tie: "#0b7285", outfit: "blazer", pants: "#212529", shoes: "#111111", accessory: "glasses" },
  { hair: "short", hairColor: "#868e96", skin: "#f3d0b0", top: "#5c7cfa", shirt: "#ffffff", outfit: "shirt", pants: "#2b2f3a", shoes: "#3b3b3b" },
];

const lambert = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

const darker = (hex, f) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
};

const part = (w, h, d, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

// 16x16 pixel face for the front of the head.
const faceTexture = (skin, withGlasses) => {
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

const HEAD = { w: 0.5, h: 0.46, d: 0.46, y: 0.9 };

const addHair = (head, look) => {
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

const cylinder = (rTop, rBottom, h, material, x, y, z) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 12), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

// Props for anime costumes (hair is drawn by addHair as usual).
const addAnimeExtras = (head, torso, c) => {
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

const glow = (color) => new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.8, flatShading: true });

const cone = (r, h, material, x, y, z, segments = 4) => {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

const addCostume = (head, torso, c) => {
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

// Returns a THREE.Group with userData.rig for animation.
export const createPerson = (inputLook) => {
  const costume = COSTUMES[inputLook.costume];
  const anime = costume?.theme === "anime";
  // Creature costumes are onesies (body colour everywhere, hair hidden by the hood);
  // anime costumes are uniforms with their own hair style.
  let look = inputLook;
  if (costume && anime) {
    look = {
      ...inputLook, hair: costume.hair, hairColor: costume.hairColor, top: costume.top,
      pants: costume.pants ?? inputLook.pants, shoes: costume.shoes, outfit: costume.outfit ?? "costume",
      accessory: inputLook.accessory === "glasses" ? "glasses" : "",
    };
  } else if (costume) {
    look = { ...inputLook, top: costume.body, pants: costume.body, shoes: costume.feet ?? darker(costume.body, 0.75), outfit: "costume", accessory: inputLook.accessory === "glasses" ? "glasses" : "" };
  }
  const skin = lambert(look.skin);
  const topMat = lambert(look.top);
  const pants = lambert(look.pants);
  const shoes = lambert(look.shoes);
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs/lowers as a whole
  root.add(body);

  // legs (pivot at the hip)
  const legs = [-0.08, 0.08].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.32, 0);
    const legMat = look.outfit === "dress" ? skin : pants;
    leg.add(part(0.13, 0.26, 0.14, legMat, 0, -0.13, 0));
    leg.add(part(0.14, 0.07, 0.2, shoes, 0, -0.285, 0.03));
    body.add(leg);
    return leg;
  });

  // torso
  const torso = new THREE.Group();
  torso.position.y = 0.32;
  torso.add(part(0.36, 0.34, 0.22, topMat, 0, 0.17, 0));
  if (look.outfit === "blazer") {
    torso.add(part(0.12, 0.3, 0.02, lambert(look.shirt ?? "#ffffff"), 0, 0.18, 0.115));
    torso.add(part(0.05, 0.22, 0.02, lambert(look.tie ?? "#c92a2a"), 0, 0.16, 0.125));
  } else if (look.outfit === "hoodie") {
    torso.add(part(0.3, 0.12, 0.1, lambert(darker(look.top, 0.8)), 0, 0.32, -0.12)); // hood
    torso.add(part(0.2, 0.08, 0.02, lambert(darker(look.top, 0.75)), 0, 0.08, 0.115)); // pocket
  } else if (look.outfit === "dress") {
    torso.add(part(0.44, 0.16, 0.28, topMat, 0, -0.04, 0)); // skirt
    torso.add(part(0.36, 0.04, 0.23, lambert(look.shirt ?? "#ffffff"), 0, 0.33, 0)); // collar
  } else if (look.outfit !== "costume") {
    torso.add(part(0.2, 0.04, 0.02, lambert(look.shirt ?? darker(look.top, 1.3)), 0, 0.32, 0.115));
  }
  body.add(torso);

  // arms (pivot at the shoulder)
  const arms = [-0.24, 0.24].map((x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.64, 0);
    arm.add(part(0.11, 0.24, 0.13, topMat, 0, -0.12, 0));
    arm.add(part(0.1, 0.08, 0.11, skin, 0, -0.28, 0));
    body.add(arm);
    return arm;
  });

  // head with pixel face on the front (+z)
  const head = new THREE.Group();
  head.position.y = HEAD.y;
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTexture(look.skin, look.accessory === "glasses") });
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(HEAD.w, HEAD.h, HEAD.d), [skin, skin, skin, skin, faceMat, skin]);
  headMesh.castShadow = true;
  head.add(headMesh);
  if (costume && anime) {
    addHair(head, look);
    addAnimeExtras(head, torso, { ...costume, skin: look.skin });
  } else if (costume) {
    addCostume(head, torso, costume);
  } else {
    addHair(head, look);
  }
  body.add(head);

  // soft blob shadow helps readability at small sizes
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 16),
    new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.18, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  root.add(blob);

  root.userData.rig = { body, legs, arms, head, torso, blob };
  return root;
};

// Pose the rig. mode: "walk" | "sit" | "idle"; t in ms.
export const animatePerson = (person, mode, t, phase = 0, talking = false) => {
  const { body, legs, arms, head, blob } = person.userData.rig;
  const k = t / 1000 + phase;
  legs.forEach((l) => l.rotation.set(0, 0, 0));
  arms.forEach((a) => a.rotation.set(0, 0, 0));
  head.rotation.set(0, 0, 0);
  body.position.y = 0;
  blob.visible = true;
  if (mode === "walk") {
    const s = Math.sin(k * 11);
    legs[0].rotation.x = s * 0.7;
    legs[1].rotation.x = -s * 0.7;
    arms[0].rotation.x = -s * 0.6;
    arms[1].rotation.x = s * 0.6;
    body.position.y = Math.abs(Math.cos(k * 11)) * 0.04;
  } else if (mode === "sit") {
    body.position.y = 0.1;
    legs.forEach((l) => { l.rotation.x = -1.45; });
    const type = Math.sin(k * 18) * 0.08;
    arms[0].rotation.x = -1.15 + type;
    arms[1].rotation.x = -1.15 - type;
    head.rotation.x = 0.08;
    blob.visible = false;
  } else if (mode === "meeting") {
    // seated at the meeting table, hands on the table, nodding along
    body.position.y = 0.1;
    legs.forEach((l) => { l.rotation.x = -1.45; });
    arms[0].rotation.x = -0.95;
    arms[1].rotation.x = -0.95 + Math.max(0, Math.sin(k * 1.3)) * 0.4;
    head.rotation.x = Math.sin(k * 2.5) * 0.06;
    head.rotation.y = Math.sin(k * 0.6) * 0.3;
    blob.visible = false;
  } else if (mode === "lounge" || mode === "beanbag") {
    // relaxed on the sofa / bean bag
    body.position.y = mode === "beanbag" ? -0.1 : 0.02;
    legs.forEach((l) => { l.rotation.x = -1.35; });
    arms[0].rotation.set(-0.35, 0, -0.25);
    arms[1].rotation.set(-0.35, 0, 0.25);
    head.rotation.y = Math.sin(k * 0.5) * 0.3;
    head.rotation.x = -0.05;
    blob.visible = false;
  } else if (mode === "drink") {
    // sip every few seconds
    const sip = Math.max(0, Math.sin(k * 1.6));
    arms[1].rotation.x = -0.6 - sip * 1.4;
    arms[1].rotation.z = 0.15;
    head.rotation.x = -sip * 0.2;
  } else if (mode === "look") {
    head.rotation.y = Math.sin(k * 0.8) * 0.35;
    head.rotation.x = 0.1;
    arms[0].rotation.z = -0.06;
    arms[1].rotation.z = 0.06;
  } else if (mode === "read") {
    arms[0].rotation.set(-1.1, 0, 0.3);
    arms[1].rotation.set(-1.1, 0, -0.3);
    head.rotation.x = 0.3;
  } else if (mode === "write") {
    arms[1].rotation.x = -2.2 + Math.sin(k * 5) * 0.12;
    arms[1].rotation.z = Math.sin(k * 3) * 0.25;
    head.rotation.x = -0.1;
  } else if (mode === "play") {
    // mashing arcade buttons
    arms[0].rotation.x = -1.2 + Math.sin(k * 22) * 0.1;
    arms[1].rotation.x = -1.2 - Math.sin(k * 25) * 0.1;
    body.position.y = Math.abs(Math.sin(k * 6)) * 0.01;
  } else if (mode === "pingpong") {
    const swing = Math.sin(k * 7);
    arms[1].rotation.x = -1.0 + swing * 0.5;
    arms[1].rotation.z = swing * 0.5;
    body.position.y = Math.abs(swing) * 0.02;
  } else {
    body.position.y = Math.sin(k * 2.2) * 0.008;
    arms[0].rotation.z = -0.06;
    arms[1].rotation.z = 0.06;
    head.rotation.y = Math.sin(k * 0.7) * 0.25;
  }
  if (talking) {
    // nodding head and a gesturing hand while speaking
    head.rotation.x += Math.sin(k * 14) * 0.08;
    head.position.y = 0.9 + Math.abs(Math.sin(k * 9)) * 0.015;
    if (mode !== "sit") arms[1].rotation.x = -0.9 + Math.sin(k * 6) * 0.35;
  } else {
    head.position.y = 0.9;
  }
};
