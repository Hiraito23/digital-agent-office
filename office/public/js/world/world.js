// The 3D world: renderer, camera + orbit controls, lights, the office scene
// and the agents (their seats, idle activities and movement). main.js feeds it
// the roster and agent status from the gateway and asks it for tag positions.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildOffice } from "../office/index.js";
import { ACTIVITY_SPOTS, CENTER, LEVELS, LIFT, MEETING, PORTAL, ROOMS, WANDER, levelTop, roomAt, wanderOn } from "../office/layout.js";
import { animatePerson } from "../characters/animation.js";
import { createPerson } from "../characters/person.js";
import { PRESETS } from "../characters/presets.js";
import { doorOf, planRoute } from "./routing.js";
import { prepareFade, setFade } from "../office/helpers.js";
import { Environment } from "./environment.js";
import { makeConversation } from "./chatter.js";

// Pixel modes: render at a fraction of the CSS resolution, upscale crisply.
export const PIXEL_MODES = [
  { label: "HD", ratio: () => Math.min(window.devicePixelRatio || 1, 2) },
  { label: "Pixel", ratio: () => 0.5 },
  { label: "Retro", ratio: () => 0.33 },
];

// What an agent does at an activity spot: the sofa and bean bag can mean reading or a nap, the pantry
// a snack instead of a drink. ms is extra time spent there (a nap lasts longer).
const FOOD = ["🍙", "🍩", "🥪", "🍜", "🍪", "🍌"];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
function pickAct(spot) {
  const r = Math.random();
  if (spot.pose === "lounge" || spot.pose === "beanbag") {
    if (r < 0.25) return { pose: "sleep", icon: "💤", ms: 12000 };
    if (r < 0.6) return { pose: "readsit", icon: "📖", ms: 7000 };
    return null;
  }
  if (spot.pose === "drink") {
    if (r < 0.5) return { pose: "eat", icon: pick(FOOD), ms: 3000 };
    return null;
  }
  if (spot.pose === "read" && r < 0.5) return { pose: "read", icon: pick(["📖", "📚", "🔖"]), ms: 4000 };
  return null;
}

const GREET = [
  (n) => [`Hai, ${n}! 👋`, "Hai juga! 👋"],
  (n) => [`Halo ${n}~`, "Halo! Semangat ya 💪"],
  (n) => [`Eh, ${n}! Apa kabar?`, "Baik! Kamu gimana?"],
  (n) => [`Hei ${n}, lagi santai?`, "Iya nih, lagi jalan-jalan sebentar 😄"],
  (n) => [`${n}! 👋`, "Yo! 👋"],
];
const GREET_PERIOD = {
  pagi: (n) => [`Selamat pagi, ${n}! ☀`, "Pagi! Sudah sarapan?"],
  sore: (n) => [`Sore, ${n}!`, "Sore! Hampir waktunya pulang ya"],
  malam: (n) => [`Masih lembur, ${n}? 🌙`, "Iya, sebentar lagi selesai"],
};
function pickGreeting(a, b, period) {
  const key = String(period || "").toLowerCase();
  const fromPeriod = Object.keys(GREET_PERIOD).find((k) => key.includes(k));
  const make = fromPeriod && Math.random() < 0.4 ? GREET_PERIOD[fromPeriod] : pick(GREET);
  return make(b.name);
}

// Critically damped spring (like Unity's SmoothDamp): starts slowly, speeds up, settles softly.
const damp = (current, target, vel, key, smoothTime, dt) => {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (vel[key] + omega * change) * dt;
  vel[key] = (vel[key] - omega * temp) * exp;
  const out = target + (change + temp) * exp;
  return Number.isFinite(out) ? out : target;
};

export class World {
  constructor(canvas, { layout, name } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#a8dcff");
    this.scene.fog = new THREE.Fog("#a8dcff", 70, 140);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 260);
    this.camera.position.set(CENTER.x + 22, 22, CENTER.z + 25);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(CENTER.x, 0.6, CENTER.z + 1);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 90;
    this.controls.maxPolarAngle = Math.PI / 2.25;
    this.controls.minPolarAngle = Math.PI / 8;
    this.controls.screenSpacePanning = false;
    this.controls.update();

    // lighting: sky/ground fill + sun with shadows
    this.hemi = new THREE.HemisphereLight("#e3f2ff", "#4e7a34", 1.1);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight("#fff4dc", 1.6);
    sun.position.set(CENTER.x + 14, 32, CENTER.z + 10);
    sun.target.position.set(CENTER.x, 0, CENTER.z);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);

    this.office = buildOffice(this.scene, layout, { name });
    this.office.furniture.onChange = () => this.refreshDesks(); // a moved desk moves its seat
    // sky: time of day and weather drive the lights, background, fog, lamps and windows
    this.environment = new Environment({ scene: this.scene, camera: this.camera, sun, hemi: this.hemi, office: this.office, center: CENTER });
    this.agents = new Map();
    this.appearances = {};
    this.raycaster = new THREE.Raycaster();
    this.pixelMode = 1;
    this.viewLevel = 0; // the level shown by the floor tabs (null = all three levels stacked)
    this.fadeAlpha = 0.2; // opacity of the levels that are not on show (set in ⚙ Pengaturan)
    this.viewBeforeFocus = null;
    this.editLevel = 0; // the level the layout editor works on
    this.followEnabled = true; // 🎥 Sorot: the camera looks at agents who interact
    this.focus = null; // { key, target, dist } the camera is following
    this.savedView = null; // the user's own view, restored when the interaction is over
    this.ignoreFocusKey = null; // an interaction the user moved away from (not followed again)
    this.camVel = { x: 0, y: 0, z: 0, d: 0 };
    this.camSmooth = 0.9;
    this.camGoal = null; // { target: Vector3, dist }
    this.controls.addEventListener("start", () => this.userMoved());
    // small talk between idle agents (world/chatter.js); main.js fills in the callbacks
    this.chatter = { active: null, nextAt: performance.now() + 9000, recent: [] };
    this.onSay = null; // (agentId, text, ms) -> speech bubble
    this.onChatter = null; // ({ from, to, text }) -> the chat box's Kantor tab
    this.resize();
  }

  setPixelMode(index) {
    this.pixelMode = index % PIXEL_MODES.length;
    this.canvas.style.imageRendering = this.pixelMode === 0 ? "auto" : "pixelated";
    this.resize();
    return PIXEL_MODES[this.pixelMode].label;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(PIXEL_MODES[this.pixelMode].ratio());
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setAppearances(map) {
    this.appearances = map || {};
    for (const a of this.agents.values()) {
      const look = { ...a.preset, ...(this.appearances[a.id] ?? {}) };
      this.scene.remove(a.model);
      a.model = this.makeModel(a.id, look, a);
    }
  }

  makeModel(id, look, a) {
    const model = createPerson(look);
    model.userData.agentId = id;
    prepareFade(model);
    model.position.set(a.x, a.y, a.z);
    model.rotation.y = a.heading ?? Math.PI / 4;
    this.scene.add(model);
    return model;
  }

  syncAgents(list) {
    const ids = new Set(list.map((a) => a.id));
    for (const [id, a] of [...this.agents]) {
      if (ids.has(id)) continue;
      this.scene.remove(a.model);
      this.agents.delete(id);
    }
    const others = list.filter((a) => a.id !== "hermes").map((a) => a.id).sort();
    list.forEach((info) => {
      const existing = this.agents.get(info.id);
      if (existing) {
        existing.name = info.name;
        existing.role = info.role;
        return;
      }
      const isMain = info.id === "hermes";
      const order = others.indexOf(info.id);
      const preset = isMain ? PRESETS[0] : PRESETS[1 + (order % (PRESETS.length - 1))];
      const lobby = wanderOn(0);
      const spawn = isMain ? { x: PORTAL.x - 0.6, z: PORTAL.z + 0.4 } : lobby[(order * 3) % lobby.length];
      const a = {
        id: info.id, name: info.name, role: info.role, isMain, preset, seat: null,
        x: spawn.x, z: spawn.z, level: 0, y: levelTop(0), heading: Math.PI / 4, route: [], mode: "idle", status: "idle", spot: null,
        nextWander: performance.now() + 1500 + Math.random() * 3000, lastActive: 0, phase: Math.random() * 10,
        gesture: "", gestureUntil: 0, pauseUntil: 0, greetWith: null, act: null,
      };
      a.model = this.makeModel(info.id, { ...preset, ...(this.appearances[info.id] ?? {}) }, a);
      this.agents.set(info.id, a);
    });
    this.assignDesks(["hermes", ...others].filter((id) => this.agents.has(id)));
  }

  // One desk + chair per agent: Hermes first, then the team in a stable order.
  assignDesks(order) {
    this.deskOrder = order;
    const seats = this.office.setDesks(order.map((id) => ({ id, name: this.agents.get(id).name })));
    order.forEach((id, i) => {
      const a = this.agents.get(id);
      const seat = seats[i] ?? null;
      const moved = a.seat && seat && (a.seat.x !== seat.x || a.seat.z !== seat.z || a.seat.level !== seat.level);
      a.seat = seat;
      if (moved && (a.mode === "sitting" || a.mode === "toSeat")) {
        a.mode = "toSeat";
        a.route = this.seatRoute(a, null);
      }
    });
  }

  // Seats changed (a desk was moved in the layout editor): agents walk to their new seat.
  refreshDesks() {
    if (this.deskOrder) this.assignDesks(this.deskOrder);
  }

  // Route to the agent's own desk (private offices are entered through their door).
  seatRoute(a, fromRoom) {
    return planRoute(a, a.seat, fromRoom, a.seat.room);
  }

  // Free activity spots (sofa, arcade, coffee, ...) that no agent is using or walking to.
  // The meeting room is off limits while a meeting is on.
  freeSpots() {
    const taken = new Set([...this.agents.values()].map((a) => a.spot?.id).filter(Boolean));
    return ACTIVITY_SPOTS.filter((s) => !taken.has(s.id) && !(this.meetingOn && s.room === MEETING.room));
  }

  // 💬 Rapat: send the moderator to the whiteboard and participants to the chairs.
  startMeeting(moderatorId, participantIds) {
    this.endMeeting();
    this.meetingOn = true;
    // agents idling in the meeting room (books, whiteboard, chairs) make room
    for (const a of this.agents.values()) {
      if (a.spot?.room === MEETING.room && a.mode === "activity") a.activityEnd = 0;
      if (a.spot?.room === MEETING.room && a.mode === "toSpot") { a.spot = null; a.mode = "idle"; a.route = []; }
    }
    const places = [[moderatorId, MEETING.moderator], ...participantIds.map((id, i) => [id, MEETING.seats[i]])];
    for (const [id, place] of places) {
      const a = this.agents.get(id);
      if (!a || !place) continue;
      // inside a room (an activity, or the desk in a private office): leave through its door
      const fromDesk = a.mode === "sitting" && a.seat?.room;
      const from = a.mode === "activity" ? a.room : fromDesk ? a.seat.room : this.insideRoom(a);
      a.spot = null;
      a.meeting = place;
      a.room = null;
      a.route = planRoute(a, place, from, MEETING.room);
      a.mode = "toMeeting";
    }
  }

  // Everyone leaves the meeting room and goes back to normal.
  endMeeting() {
    this.meetingOn = false;
    for (const a of this.agents.values()) {
      if (!a.meeting) continue;
      a.meeting = null;
      const exit = doorOf(MEETING.room); // out of the meeting room onto the corridor of level 3
      a.route = a.mode === "meeting" || a.mode === "toMeeting"
        ? planRoute(a, { x: exit.outside.x, z: exit.outside.z, level: MEETING.level }, a.mode === "meeting" ? MEETING.room : null)
        : a.route;
      a.room = null;
      a.mode = "wander";
      a.nextWander = performance.now() + 3000 + Math.random() * 4000;
    }
  }

  // The room (with a door) an agent is standing in right now, or null.
  insideRoom(a) {
    const r = roomAt(a.x, a.z, a.level);
    return r && r.door ? r.id : null;
  }

  leaveSpot(a) {
    a.spot = null;
    a.leavingRoom = a.room ?? this.insideRoom(a); // an agent still walking to a spot inside a room leaves by its door too
    a.room = null;
    if (a.mode === "activity" || a.mode === "toSpot") a.mode = "idle";
  }

  setSpeaking(id, on) {
    const a = this.agents.get(id);
    if (a) a.speaking = on;
  }

  setStatus(id, status) {
    const a = this.agents.get(id);
    if (!a) return;
    a.status = status;
    a.lastActive = performance.now();
    if (a.meeting) return; // stays in the meeting room until the meeting ends
    if (status === "working" && a.seat && a.mode !== "sitting") {
      this.leaveSpot(a); // drop the sofa/arcade/coffee and go to work
      a.route = this.seatRoute(a, a.leavingRoom);
      a.mode = "toSeat";
    }
    // standing up again is handled in update(): the agent stays seated a few seconds, even after a short task
  }

  // Leaves the desk after work: out of the room through its door, or one step back in the hall.
  standUp(a, now) {
    a.nextWander = now + 2500;
    const exit = a.seat.room ? doorOf(a.seat.room) : null;
    if (!exit && !a.isMain && Math.random() < 0.7 && this.callHighFive(a, now)) return;
    if (exit) {
      a.route = planRoute(a, { x: exit.outside.x, z: exit.outside.z, level: a.seat.level }, a.seat.room);
      a.mode = "wander";
    } else {
      a.mode = "idle";
      a.route = [{ x: a.seat.x, z: a.seat.z + (a.seat.heading === 0 ? -0.6 : 0.6), level: a.seat.level }];
    }
  }

  update(dt, now) {
    this.office.update(now);
    this.environment.update(dt, now);
    for (const a of this.agents.values()) {
      let moving = false;
      let riding = false;
      if (a.route.length && now >= a.pauseUntil && (a.route[0].level ?? a.level) !== a.level) {
        // the next waypoint is on another level at the same spot: ride the lift
        const goalY = levelTop(a.route[0].level);
        const stepY = (dt / 1000) * LIFT.speed;
        riding = true;
        if (Math.abs(goalY - a.y) <= stepY) {
          a.y = goalY;
          a.level = a.route[0].level;
          a.route.shift();
        } else {
          a.y += Math.sign(goalY - a.y) * stepY;
        }
      } else if (a.route.length && now >= a.pauseUntil) {
        a.y = levelTop(a.level);
        const target = a.route[0];
        const dx = target.x - a.x;
        const dz = target.z - a.z;
        const dist = Math.hypot(dx, dz);
        const step = (dt / 1000) * (a.mode === "toSeat" ? 3.4 : a.mode === "toHi5" ? 2.8 : 1.9); // an agent with work to do hurries to the computer
        if (dist <= step) {
          a.x = target.x;
          a.z = target.z;
          a.route.shift();
          if (!a.route.length && a.mode === "toSeat") { a.mode = "sitting"; a.seatedAt = now; }
          if (!a.route.length && a.mode === "toMeeting") { a.mode = "meeting"; a.room = MEETING.room; }
          if (!a.route.length && a.mode === "wander") a.mode = "idle";
          if (!a.route.length && a.mode === "toChat") a.mode = "chat";
          if (!a.route.length && a.mode === "toHi5") this.highFive(a, now);
          if (!a.route.length && a.mode === "toSpot") {
            a.room = a.spot.room ?? null;
            a.mode = "activity";
            a.act = pickAct(a.spot);
            a.activityEnd = now + (a.act?.ms ?? 9000) + Math.random() * 9000;
          }
        } else {
          a.x += (dx / dist) * step;
          a.z += (dz / dist) * step;
          a.heading = Math.atan2(dx, dz);
          moving = true;
        }
      } else if (a.mode === "activity" && now > a.activityEnd) {
        // done with the sofa/arcade/...: step away and idle again
        const exit = doorOf(a.room);
        const out = exit ? exit.outside : { x: a.x, z: a.z };
        a.route = planRoute(a, { x: out.x, z: out.z, level: a.level }, a.room);
        if (a.act?.pose === "sleep") { a.gesture = "stretch"; a.gestureUntil = now + 1800; a.pauseUntil = now + 1800; }
        a.act = null;
        a.spot = null;
        a.room = null;
        a.mode = "wander";
        a.nextWander = now + 3000 + Math.random() * 4000;
      } else if (a.mode === "sitting" && a.status !== "working" && now - (a.seatedAt ?? 0) > 3000) {
        this.standUp(a, now); // the task is over (it stayed at least 3 s so the typing is seen)
      } else if (a.mode === "idle" && now > a.nextWander) {
        const spots = this.freeSpots();
        const wantsActivity = spots.length && Math.random() < (a.isMain ? 0.3 : 0.6);
        const spot = wantsActivity ? this.pickSpot(a, spots, now) : null;
        if (spot) {
          a.spot = spot;
          a.route = planRoute(a, a.spot, null, a.spot.room);
          a.mode = "toSpot";
        } else if (a.isMain) {
          const ang = Math.random() * Math.PI * 2;
          a.route = planRoute(a, { x: PORTAL.x + Math.cos(ang) * 1.2, z: PORTAL.z + Math.sin(ang) * 0.9, level: 0 });
          a.mode = "wander";
        } else {
          // mostly the lobby, now and then a walk along the corridors upstairs
          const points = Math.random() < 0.65 ? wanderOn(0) : WANDER;
          const w = Math.random() < 0.15
            ? { x: PORTAL.x + (Math.random() - 0.5), z: PORTAL.z + (Math.random() - 0.5) * 0.6, level: 0 }
            : points[Math.floor(Math.random() * points.length)];
          a.route = planRoute(a, w);
          a.mode = "wander";
        }
        a.nextWander = now + 4000 + Math.random() * 7000;
      }

      a.riding = riding;
      const sitting = a.mode === "sitting" && !moving && !riding;
      const atSpot = a.mode === "activity" && !moving && a.spot;
      const inMeeting = a.mode === "meeting" && !moving && a.meeting;
      // face the desk when seated, the prop at an activity, the camera side when idle
      let targetHeading = a.heading;
      if (sitting) targetHeading = a.seat?.heading ?? Math.PI; // facing the desk
      else if (inMeeting) targetHeading = a.meeting.heading;
      else if (a.mode === "chat" && !moving && a.chatPartner) targetHeading = Math.atan2(a.chatPartner.x - a.x, a.chatPartner.z - a.z); // face the other agent
      else if (atSpot) targetHeading = a.spot.heading;
      else if (a.greetWith && now < a.pauseUntil) targetHeading = Math.atan2(a.greetWith.x - a.x, a.greetWith.z - a.z); // turn to the one being greeted
      else if (!moving) targetHeading = Math.atan2(this.camera.position.x - a.x, this.camera.position.z - a.z);
      let diff = targetHeading - a.model.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.model.rotation.y += diff * Math.min(1, dt / 120);
      a.model.position.set(a.x, a.y, a.z);
      const pose = moving || riding ?  "walk" : sitting ? "sit" : inMeeting ? a.meeting.pose : atSpot ? (a.act?.pose ?? a.spot.pose) : "idle";
      a.activityIcon = inMeeting || a.mode === "toMeeting" ? a.meeting.icon : atSpot ? (a.act?.icon ?? a.spot.icon) : "";
      if (a.gesture && now > a.gestureUntil) a.gesture = "";
      animatePerson(a.model, pose, now, a.phase, Boolean(a.speaking || a.chatSpeaking), a.gesture);
    }
    this.updateGreetings(now);
    this.updateChatter(now);
    const rider = [...this.agents.values()].find((a) => a.riding);
    if (rider) this.office.lift.set(rider.y);
    this.applyVisibility();
    // 🎥 Sorot: an interaction on another level switches the floor tab for its duration
    const f = this.followEnabled ? this.interactionFocus() : null;
    if (f && this.viewLevel !== null && f.level !== this.viewLevel && f.key !== this.ignoreFocusKey) {
      this.viewBeforeFocus = this.viewLevel;
      this.setViewLevel(f.level, { camera: false });
    }
    this.setFocus(f);
    if (!f && this.viewBeforeFocus !== null) {
      this.setViewLevel(this.viewBeforeFocus, { camera: false });
      this.viewBeforeFocus = null;
    }
  }

  // Picks a free activity spot. Ping-pong needs two players: another idle agent is invited to the
  // other side of the table, and without a partner a different spot is chosen.
  pickSpot(a, spots, now) {
    const spot = spots[Math.floor(Math.random() * spots.length)];
    if (spot.pose !== "pingpong") return spot;
    const prefix = spot.id.split("/")[0];
    const other = spots.find((s) => s !== spot && s.id.split("/")[0] === prefix);
    const mate = [...this.agents.values()]
      .filter((x) => x !== a && !x.isMain && (x.mode === "idle" || x.mode === "wander") && !x.room && !x.speaking && x.status !== "working" && !x.meeting && !x.gesture)
      .sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0];
    if (!other || !mate) {
      const rest = spots.filter((s) => s.pose !== "pingpong");
      return rest.length ? rest[Math.floor(Math.random() * rest.length)] : null;
    }
    mate.spot = other;
    mate.route = planRoute(mate, other, null, other.room);
    mate.mode = "toSpot";
    this.onSay?.(a.id, "Main pingpong yuk! 🏓", 2600);
    setTimeout(() => this.onSay?.(mate.id, "Ayo, siapa takut! 😄", 2600), 1100);
    return spot;
  }

  // A task is done: a free colleague walks over for a high five.
  callHighFive(a, now) {
    const mate = [...this.agents.values()]
      .filter((x) => x !== a && !x.isMain && (x.mode === "idle" || x.mode === "wander") && !x.room && !x.speaking && x.status !== "working" && !x.meeting && !x.gesture && x.level === a.level && Math.hypot(x.x - a.x, x.z - a.z) < 14)
      .sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0];
    if (!mate) return false;
    const side = a.seat.heading === 0 ? -1 : 1; // the free side of the desk
    const stand = { x: a.seat.x, z: a.seat.z + side * 0.6, level: a.seat.level };
    mate.route = planRoute(mate, { x: stand.x + 0.9, z: stand.z, level: stand.level });
    mate.mode = "toHi5";
    mate.hi5With = a;
    a.route = [stand];
    a.mode = "idle";
    a.nextWander = now + 14000; // waits here for the colleague
    return true;
  }

  highFive(m, now) {
    const a = m.hi5With;
    m.hi5With = null;
    m.mode = "idle";
    m.nextWander = now + 3000;
    if (!a || a.mode === "toSeat" || a.mode === "sitting" || a.level !== m.level || Math.hypot(a.x - m.x, a.z - m.z) > 3) return;
    for (const [x, y] of [[m, a], [a, m]]) {
      x.gesture = "hi5";
      x.gestureUntil = now + 1800;
      x.pauseUntil = now + 1800;
      x.greetWith = y;
    }
    this.onSay?.(m.id, `Kerja bagus, ${a.name}! 🙌`, 2800);
    setTimeout(() => this.onSay?.(a.id, "Tos! 🙌 Makasih ya!", 2600), 900);
    a.nextWander = now + 4000;
  }

  // Two agents who pass close to each other wave and say hi (bubbles only, no voice).
  updateGreetings(now) {
    if (now < (this.nextGreetCheck ?? 0) || document.hidden) return;
    this.nextGreetCheck = now + 500;
    if (now < (this.nextGreetAt ?? 0)) return;
    const ok = (a) => (a.mode === "idle" || a.mode === "wander" || a.mode === "toSpot") && a.status !== "working" && !a.meeting && !a.speaking && !a.gesture;
    const list = [...this.agents.values()].filter(ok);
    this.greetCool ??= new Map();
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (a.level !== b.level || Math.hypot(a.x - b.x, a.z - b.z) > 2.4) continue;
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (now < (this.greetCool.get(key) ?? 0)) continue;
        this.greetCool.set(key, now + 45000 + Math.random() * 45000);
        this.nextGreetAt = now + 5000 + Math.random() * 5000;
        for (const [x, y] of [[a, b], [b, a]]) {
          x.gesture = "wave";
          x.gestureUntil = now + 2200;
          x.pauseUntil = now + 1700;
          x.greetWith = y;
        }
        const [hi, back] = pickGreeting(a, b, this.environment?.periodName?.());
        this.onSay?.(a.id, hi, 2600);
        setTimeout(() => this.onSay?.(b.id, back, 2600), 900);
        return;
      }
    }
  }

  // Small talk: two idle agents meet in the hall and swap a few lines (bubbles above their heads).
  updateChatter(now) {
    const c = this.chatter;
    if (c.active) { this.stepChat(c.active, now); return; }
    if (now < c.nextAt || this.meetingOn || document.hidden) return;
    const free = [...this.agents.values()].filter((a) => (a.mode === "idle" || a.mode === "wander") && !a.room && !a.riding && !a.speaking && a.status !== "working" && !a.meeting);
    if (free.length < 2) { c.nextAt = now + 5000; return; }
    const a = free[Math.floor(Math.random() * free.length)];
    const near = free.filter((x) => x !== a && x.level === a.level).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z)).slice(0, 3);
    if (!near.length) { c.nextAt = now + 5000; return; }
    const b = near[Math.floor(Math.random() * near.length)];
    // meet at the walking point (on their level) nearest to the middle between them
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const meet = wanderOn(a.level).slice().sort((p, q) => Math.hypot(p.x - mx, p.z - mz) - Math.hypot(q.x - mx, q.z - mz))[0];
    const [rx, rz] = [meet.x, meet.z];
    const lines = makeConversation(a, b, { weather: this.environment?.weatherId, period: this.environment?.periodName() }, c.recent);
    const place = (agent, x, partner) => { agent.route = planRoute(agent, { x, z: rz, level: a.level }); agent.mode = "toChat"; agent.chatPartner = partner; agent.chatSpeaking = false; };
    place(a, rx - 0.5, b);
    place(b, rx + 0.5, a);
    c.active = { a, b, lines, i: 0, state: "approach", startedAt: now, nextLineAt: 0 };
  }

  stepChat(ch, now) {
    // someone left (went to work, joined a meeting) or it took too long: stop
    const here = (x) => this.agents.get(x.id) === x && (x.mode === "toChat" || x.mode === "chat");
    if (!here(ch.a) || !here(ch.b) || now - ch.startedAt > 90000) { this.endChat(now); return; }
    if (ch.state === "approach") {
      if (ch.a.mode === "chat" && ch.b.mode === "chat") {
        ch.state = "talk";
        ch.nextLineAt = now + 1500;
        for (const x of [ch.a, ch.b]) { x.gesture = "wave"; x.gestureUntil = now + 1300; } // wave hello before talking
      }
      return;
    }
    if (now < ch.nextLineAt) return;
    // with voices on, wait until the last line has been spoken (but never longer than 12 s)
    if ((ch.a.speaking || ch.b.speaking) && now < ch.nextLineAt + 12000) return;
    ch.a.chatSpeaking = false;
    ch.b.chatSpeaking = false;
    if (ch.i >= ch.lines.length) { this.endChat(now); return; }
    const line = ch.lines[ch.i];
    ch.i += 1;
    line.who.chatSpeaking = true;
    const other = line.who === ch.a ? ch.b : ch.a;
    const ms = 1800 + line.text.length * 55;
    this.onSay?.(line.who.id, line.text, ms + 500);
    this.onChatter?.({ from: line.who.id, to: other.id, text: line.text, news: line.news });
    ch.nextLineAt = now + ms;
  }

  endChat(now) {
    const c = this.chatter;
    const ch = c.active;
    c.active = null;
    for (const x of [ch.a, ch.b]) {
      x.chatSpeaking = false;
      x.chatPartner = null;
      if (x.mode === "toChat" || x.mode === "chat") { x.mode = "idle"; x.nextWander = now + 2000 + Math.random() * 3000; }
    }
    c.nextAt = now + 14000 + Math.random() * 16000;
  }

  render() {
    this.updateCamera();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ---- levels (the "Lantai" buttons) ------------------------------------------

  // The floor tabs: shows one level (0 to 2), or all of them stacked (null). The camera glides to the
  // middle of that level unless `camera` is false (a focus switches level while it moves the camera).
  setViewLevel(level, { camera = true } = {}) {
    this.viewLevel = level === null ? null : Math.max(0, Math.min(LEVELS.length - 1, level));
    if (camera) {
      this.viewBeforeFocus = null;
      this.userMoved();
      const y = this.viewLevel === null ? levelTop(1) : levelTop(this.viewLevel) + 0.6;
      this.camGoal = { target: new THREE.Vector3(CENTER.x, y, CENTER.z + 1), dist: this.viewLevel === null ? 46 : 38 };
      this.camSmooth = 0.8;
    }
    this.applyVisibility();
    window.dispatchEvent(new CustomEvent("levelchange"));
  }

  setFadeAlpha(alpha) {
    this.fadeAlpha = Math.min(1, Math.max(0, alpha));
    this.applyVisibility();
  }

  applyVisibility() {
    const v = this.viewLevel;
    // the level on show is opaque; the others stay visible, faded
    const alphaOf = (l) => (v === null || l === v ? 1 : this.fadeAlpha);
    this.office.levelGroups.forEach((g, l) => {
      const alpha = alphaOf(l);
      if ((g.userData.fadeAlpha ?? 1) !== alpha) setFade(g, alpha);
    });
    const onView = (y) => v === null || Math.abs(y - levelTop(v)) < 1.7;
    for (const a of this.agents.values()) {
      const alpha = onView(a.y) ? 1 : this.fadeAlpha;
      if ((a.model.userData.fadeAlpha ?? 1) !== alpha) setFade(a.model, alpha);
    }
  }

  // ---- camera focus (🎥 Sorot) ------------------------------------------------------

  // The user took the camera: stop following the interaction until a different one starts.
  userMoved() {
    this.camGoal = null;
    if (!this.focus) return;
    this.ignoreFocusKey = this.focus.key;
    this.focus = null;
    this.savedView = null;
  }

  // Look at a point from `dist` away, easing there slowly (ease in, ease out); null = back to the
  // view the user had. Called every frame with the same key while the interaction lasts.
  setFocus(f) {
    if (!f) {
      this.ignoreFocusKey = null;
      if (!this.focus) return;
      this.focus = null;
      if (this.savedView) { this.camGoal = this.savedView; this.savedView = null; }
      this.camSmooth = 0.9;
      return;
    }
    if (f.key === this.ignoreFocusKey) return;
    if (!this.focus) {
      this.savedView = { target: this.controls.target.clone(), dist: this.camera.position.distanceTo(this.controls.target) };
      this.camSmooth = 0.9;
    } else if (f.key !== this.focus.key) {
      this.camSmooth = 0.9;
    }
    this.focus = f;
    this.camGoal = { target: new THREE.Vector3(f.x, f.y, f.z), dist: f.dist };
  }

  // Where the camera should look while agents interact: the meeting room during a meeting, the
  // pair that is chatting, or the two giving each other a high five. null = nothing going on.
  interactionFocus() {
    const agents = [...this.agents.values()];
    const shown = () => true; // an interaction on another level switches the tab (see update)
    if (this.meetingOn && shown(MEETING.level) && agents.some((a) => a.mode === "meeting")) {
      const room = ROOMS.find((r) => r.id === MEETING.room);
      if (room) return { key: "meeting", level: MEETING.level, x: (room.x0 + room.x1) / 2, y: levelTop(MEETING.level) + 0.9, z: (room.z0 + room.z1) / 2 + 1.5, dist: 17 };
    }
    const ch = this.chatter.active;
    if (ch && ch.state === "talk" && shown(ch.a.level)) return { key: `chat:${ch.a.id}:${ch.b.id}`, level: ch.a.level, x: (ch.a.x + ch.b.x) / 2, y: ch.a.y + 0.9, z: (ch.a.z + ch.b.z) / 2, dist: 11 };
    const hi5 = agents.find((a) => a.gesture === "hi5" && a.greetWith && shown(a.level));
    if (hi5) return { key: `hi5:${hi5.id}`, level: hi5.level, x: (hi5.x + hi5.greetWith.x) / 2, y: hi5.y + 0.9, z: (hi5.z + hi5.greetWith.z) / 2, dist: 10 };
    return null;
  }

  updateCamera() {
    const now = performance.now();
    const dt = Math.min(100, now - (this.lastCamAt ?? now));
    this.lastCamAt = now;
    if (!this.camGoal) return;
    const c = this.controls.target;
    const g = this.camGoal;
    const sec = dt / 1000;
    const dir = this.camera.position.clone().sub(c).normalize();
    const dist = damp(this.camera.position.distanceTo(c), g.dist, this.camVel, "d", this.camSmooth, sec);
    c.x = damp(c.x, g.target.x, this.camVel, "x", this.camSmooth, sec);
    c.y = damp(c.y, g.target.y, this.camVel, "y", this.camSmooth, sec);
    c.z = damp(c.z, g.target.z, this.camVel, "z", this.camSmooth, sec);
    this.camera.position.copy(c).addScaledVector(dir, dist);
    // back at the user's view: stop driving the camera
    if (!this.focus && c.distanceTo(g.target) < 0.03 && Math.abs(dist - g.dist) < 0.03) this.camGoal = null;
  }

  // Screen positions (CSS px) above each head, for DOM name tags/bubbles.
  // always(agent): agents that keep their tag on any level, e.g. while they work on a task (progress bar)
  // or speak, so a task on another floor stays visible; those tags say which floor the agent is on.
  tagPositions(always = () => false) {
    const out = [];
    const v = new THREE.Vector3();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const hidden = this.hiddenByFloors();
    let stacked = 0;
    for (const a of this.agents.values()) {
      const sitting = a.mode === "sitting" && !a.route.length;
      const floor = LEVELS.reduce((best, _, l) => (levelTop(l) <= a.y + 0.2 ? l : best), 0);
      const offLevel = this.viewLevel !== null && Math.abs(a.y - levelTop(this.viewLevel)) >= 1.7;
      const keep = always(a);
      if (hidden.has(a.id) && !keep) continue;
      if (offLevel && !keep) continue; // agents on the faded levels have no tag unless they are busy
      v.set(a.x, a.y + (sitting ? 1.45 : 1.38), a.z);
      v.project(this.camera);
      if (v.z > 1) continue;
      let px = (v.x * 0.5 + 0.5) * w;
      let py = (-v.y * 0.5 + 0.5) * h;
      if (offLevel) {
        // keep the tag (and its progress bar) on screen between the side panels and below the floor tabs, even
        // when the agent itself is off the edge; tags that end up in the same spot are stacked
        const topH = document.querySelector(".top")?.offsetHeight ?? 56;
        const maxX = Math.max(180, w - 380);
        const minY = topH + 112;
        const clamped = px < 180 || px > maxX || py < minY || py > h - 20;
        px = Math.min(maxX, Math.max(180, px));
        py = Math.min(h - 20, Math.max(minY, py));
        if (clamped) { py += stacked * 78; stacked += 1; }
      }
      out.push({ agent: a, x: px, y: py, floor: floor + 1, offLevel });
    }
    return out;
  }

  // Agents whose head is behind a floor slab of a higher level (seen from the camera): their name
  // tag is hidden. Checked a few times a second.
  hiddenByFloors() {
    const now = performance.now();
    if (this.hiddenIds && now - this.hiddenAt < 150) return this.hiddenIds;
    this.hiddenAt = now;
    const hidden = new Set();
    const ray = new THREE.Raycaster();
    const head = new THREE.Vector3();
    if (this.viewLevel !== null) { this.hiddenIds = hidden; return hidden; } // one level on show: the others are see-through
    for (const a of this.agents.values()) {
      const floor = LEVELS.reduce((best, _, l) => (levelTop(l) <= a.y + 0.2 ? l : best), 0);
      const meshes = this.office.slabs.filter((s) => s.level > floor && s.mesh.parent.visible).map((s) => s.mesh);
      if (!meshes.length) continue;
      head.set(a.x, a.y + 1.4, a.z);
      const dir = head.clone().sub(this.camera.position);
      const dist = dir.length();
      ray.set(this.camera.position, dir.normalize());
      ray.far = dist;
      if (ray.intersectObjects(meshes, false).length) hidden.add(a.id);
    }
    this.hiddenIds = hidden;
    return hidden;
  }

  // Layout editor: pointer ray, the floor point under the pointer and the furniture under it.
  setRay(clientX, clientY) {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
  }

  groundPoint(clientX, clientY) {
    this.setRay(clientX, clientY);
    const hit = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -levelTop(this.editLevel));
    return this.raycaster.ray.intersectPlane(plane, hit) ? hit : null;
  }

  pickFurniture(clientX, clientY) {
    this.setRay(clientX, clientY);
    return this.office.furniture.pick(this.raycaster, this.viewLevel === null ? null : this.editLevel);
  }

  hitTest(clientX, clientY) {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const models = [...this.agents.values()].map((a) => a.model);
    const hit = this.raycaster.intersectObjects(models, true)[0];
    if (!hit) return null;
    let obj = hit.object;
    while (obj && !obj.userData.agentId) obj = obj.parent;
    return obj ? this.agents.get(obj.userData.agentId) : null;
  }
}
