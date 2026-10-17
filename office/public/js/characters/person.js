// Builds a voxel chibi person (big head, small body) from an appearance
// object (schema: config/people.json) and returns a THREE.Group whose
// userData.rig holds the moving parts used by animation.js.
import * as THREE from "three";
import { COSTUMES, addAnimeExtras, addCostume } from "./costumes.js";
import { addHair, faceTexture } from "./head.js";
import { HEAD, darker, lambert, part } from "./parts.js";

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
