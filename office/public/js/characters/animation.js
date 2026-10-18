// Poses a person every frame: walk, sit (typing), meeting, lounge, bean bag,
// drink, look, read, write, play (arcade), ping-pong, idle, plus talking.

// Pose the rig. mode: "walk" | "sit" | "idle"; t in ms.
// gesture: "" | "wave" (greeting, one arm up) | "stretch" (both arms up), layered on top of any pose.
export const animatePerson = (person, mode, t, phase = 0, talking = false, gesture = "") => {
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
    arms[1].rotation.z = -0.3 + Math.max(0, Math.sin(k * 0.45)) * 0.18; // now and then turns a page
  } else if (mode === "readsit") {
    // reading a book on the sofa / bean bag
    body.position.y = 0.02;
    legs.forEach((l) => { l.rotation.x = -1.35; });
    arms[0].rotation.set(-1.25, 0, 0.35);
    arms[1].rotation.set(-1.25 + Math.max(0, Math.sin(k * 0.4)) * 0.08, 0, -0.35);
    head.rotation.x = 0.4;
    head.rotation.y = Math.sin(k * 0.3) * 0.08;
    blob.visible = false;
  } else if (mode === "sleep") {
    // dozing off: head down, arms folded, slow breathing
    body.position.y = 0.0 + Math.sin(k * 1.1) * 0.012;
    legs.forEach((l) => { l.rotation.x = -1.35; });
    arms[0].rotation.set(-0.95, 0, 0.55);
    arms[1].rotation.set(-0.95, 0, -0.55);
    head.rotation.x = 0.6 + Math.sin(k * 1.1) * 0.03;
    head.rotation.z = 0.18;
    blob.visible = false;
  } else if (mode === "eat") {
    // plate in one hand, bites with the other, chewing
    const bite = Math.max(0, Math.sin(k * 2.0));
    arms[0].rotation.set(-0.75, 0, 0.2);
    arms[1].rotation.x = -0.8 - bite * 1.15;
    arms[1].rotation.z = -0.1;
    head.rotation.x = bite * 0.12 + Math.sin(k * 9) * 0.025 * (bite > 0.4 ? 1 : 0);
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
  if (gesture === "wave") {
    arms[1].rotation.set(0, 0, 2.55 + Math.sin(k * 11) * 0.3);
    head.rotation.z = 0.08;
  } else if (gesture === "stretch") {
    arms[0].rotation.set(-2.8, 0, 0.15);
    arms[1].rotation.set(-2.8, 0, -0.15);
    head.rotation.x = -0.3;
  }
  if (talking && !gesture) {
    // nodding head and a gesturing hand while speaking
    head.rotation.x += Math.sin(k * 14) * 0.08;
    head.position.y = 0.9 + Math.abs(Math.sin(k * 9)) * 0.015;
    if (mode !== "sit") arms[1].rotation.x = -0.9 + Math.sin(k * 6) * 0.35;
  } else {
    head.position.y = 0.9;
  }
};
