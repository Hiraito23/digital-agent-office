// The 3D world: renderer, fixed isometric camera, lights, the office scene
// and the agents (their seats, idle activities and movement). main.js feeds it
// the roster and agent status from the gateway and asks it for tag positions.
import * as THREE from "three";
import { buildOffice } from "../office/index.js";
import { ACTIVITY_SPOTS, CENTER, MEETING, N, PORTAL, WANDER } from "../office/layout.js";
import { CameraRig } from "./camera-rig.js";
import { Outline } from "./outline.js";
import { animatePerson } from "../characters/animation.js";
import { createPerson } from "../characters/person.js";
import { PRESETS } from "../characters/presets.js";
import { corridorFor, doorOf, planRoute } from "./routing.js";
import { Environment } from "./environment.js";
import { makeConversation } from "./chatter.js";

// Pixel modes: render at a fraction of the CSS resolution, upscale crisply.
export const PIXEL_MODES = [
  { label: "HD", ratio: () => Math.min(window.devicePixelRatio || 1, 2) },
  { label: "Pixel", ratio: () => 0.5 },
  { label: "Retro", ratio: () => 0.33 },
];

const FACING_STEP = Math.PI / 4;

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

export class World {
  constructor(canvas, { layout } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.outline = new Outline(this.renderer); // dark silhouette lines (world/outline.js)

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#a8dcff");
    this.scene.fog = new THREE.Fog("#a8dcff", 75, 150);

    // fixed isometric camera: pan and zoom only, no rotation (world/camera-rig.js)
    this.rig = new CameraRig(canvas, CENTER, N);
    this.camera = this.rig.camera;

    // lighting: sky/ground fill + sun with shadows
    this.hemi = new THREE.HemisphereLight("#e3f2ff", "#4e7a34", 1.1);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight("#fff4dc", 1.6);
    sun.position.set(CENTER.x + 10, 22, CENTER.z + 6);
    sun.target.position.set(CENTER.x, 0, CENTER.z);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);

    this.office = buildOffice(this.scene, layout);
    this.office.furniture.onChange = () => this.refreshDesks(); // a moved desk moves its seat
    // sky: time of day and weather drive the lights, background, fog, lamps and windows
    this.environment = new Environment({ scene: this.scene, camera: this.camera, sun, hemi: this.hemi, office: this.office, center: CENTER });
    this.agents = new Map();
    this.appearances = {};
    this.raycaster = new THREE.Raycaster();
    this.pixelMode = 1;
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
    const ratio = PIXEL_MODES[this.pixelMode].ratio();
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.rig.resize(w, h, Math.round(h * ratio));
    this.outline.resize();
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
    model.position.set(a.x, this.office.floorTop, a.z);
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
      const [sx, sz] = isMain ? [PORTAL.x - 0.6, PORTAL.z + 0.4] : WANDER[(order * 3) % WANDER.length];
      const a = {
        id: info.id, name: info.name, role: info.role, isMain, preset, seat: null,
        x: sx, z: sz, heading: Math.PI / 4, route: [], mode: "idle", status: "idle", spot: null,
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
      const moved = a.seat && seat && (a.seat.x !== seat.x || a.seat.z !== seat.z);
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
      const from = a.mode === "activity" ? a.room : fromDesk ? a.seat.room : null;
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
      const exit = doorOf(MEETING.room) ?? { outside: { x: 12.5, z: 12.8 } }; // an open zone: leave towards the hall
      a.route = a.mode === "meeting" || a.mode === "toMeeting"
        ? planRoute(a, { x: exit.outside.x, z: corridorFor(exit.outside.z) }, a.mode === "meeting" ? MEETING.room : null)
        : a.route;
      a.room = null;
      a.mode = "wander";
      a.nextWander = performance.now() + 3000 + Math.random() * 4000;
    }
  }

  leaveSpot(a) {
    a.spot = null;
    a.leavingRoom = a.room;
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
      a.route = planRoute(a, { x: exit.outside.x, z: corridorFor(exit.outside.z) }, a.seat.room);
      a.mode = "wander";
    } else {
      a.mode = "idle";
      a.route = [{ x: a.seat.x, z: a.seat.z + (a.seat.heading === 0 ? -0.6 : 0.6) }];
    }
  }

  update(dt, now) {
    this.office.update(now);
    this.environment.update(dt, now);
    for (const a of this.agents.values()) {
      let moving = false;
      if (a.route.length && now >= a.pauseUntil) {
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
        const out = exit ? exit.outside : { x: a.x, z: corridorFor(a.z) };
        a.route = planRoute(a, { x: out.x, z: corridorFor(out.z) }, a.room);
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
          a.route = [{ x: PORTAL.x + Math.cos(ang) * 1.2, z: PORTAL.z + Math.sin(ang) * 0.9 }];
          a.mode = "wander";
        } else {
          const [tx, tz] = Math.random() < 0.18
            ? [PORTAL.x + (Math.random() - 0.5), PORTAL.z + (Math.random() - 0.5) * 0.6]
            : WANDER[Math.floor(Math.random() * WANDER.length)];
          a.route = planRoute(a, { x: tx, z: tz });
          a.mode = "wander";
        }
        a.nextWander = now + 4000 + Math.random() * 7000;
      }

      const sitting = a.mode === "sitting" && !moving;
      const atSpot = a.mode === "activity" && !moving && a.spot;
      const inMeeting = a.mode === "meeting" && !moving && a.meeting;
      // face the desk when seated, the prop at an activity, the camera side when idle
      let targetHeading = a.heading;
      if (sitting) targetHeading = a.seat?.heading ?? Math.PI; // facing the desk
      else if (inMeeting) targetHeading = a.meeting.heading;
      else if (a.mode === "chat" && !moving && a.chatPartner) targetHeading = Math.atan2(a.chatPartner.x - a.x, a.chatPartner.z - a.z); // face the other agent
      else if (atSpot) targetHeading = a.spot.heading;
      else if (a.greetWith && now < a.pauseUntil) targetHeading = Math.atan2(a.greetWith.x - a.x, a.greetWith.z - a.z); // turn to the one being greeted
      else if (!moving) targetHeading = Math.atan2(this.rig.offset.x, this.rig.offset.z); // the camera never turns: face it
      // like a sprite: only 8 facing directions, switched instantly
      a.model.rotation.y = Math.round(targetHeading / FACING_STEP) * FACING_STEP;
      a.model.position.set(a.x, this.office.floorTop, a.z);
      const pose = moving ? "walk" : sitting ? "sit" : inMeeting ? a.meeting.pose : atSpot ? (a.act?.pose ?? a.spot.pose) : "idle";
      a.activityIcon = inMeeting || a.mode === "toMeeting" ? a.meeting.icon : atSpot ? (a.act?.icon ?? a.spot.icon) : "";
      if (a.gesture && now > a.gestureUntil) a.gesture = "";
      animatePerson(a.model, pose, now, a.phase, Boolean(a.speaking || a.chatSpeaking), a.gesture);
    }
    this.updateGreetings(now);
    this.updateChatter(now);
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
      .filter((x) => x !== a && !x.isMain && (x.mode === "idle" || x.mode === "wander") && !x.room && !x.speaking && x.status !== "working" && !x.meeting && !x.gesture && Math.hypot(x.x - a.x, x.z - a.z) < 14)
      .sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0];
    if (!mate) return false;
    const side = a.seat.heading === 0 ? -1 : 1; // the free side of the desk
    const stand = { x: a.seat.x, z: a.seat.z + side * 0.6 };
    mate.route = planRoute(mate, { x: stand.x + 0.9, z: stand.z });
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
    if (!a || a.mode === "toSeat" || a.mode === "sitting" || Math.hypot(a.x - m.x, a.z - m.z) > 3) return;
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
        if (Math.hypot(a.x - b.x, a.z - b.z) > 2.4) continue;
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
    const free = [...this.agents.values()].filter((a) => (a.mode === "idle" || a.mode === "wander") && !a.room && !a.speaking && a.status !== "working" && !a.meeting);
    if (free.length < 2) { c.nextAt = now + 5000; return; }
    const a = free[Math.floor(Math.random() * free.length)];
    const near = free.filter((x) => x !== a).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z)).slice(0, 3);
    const b = near[Math.floor(Math.random() * near.length)];
    // meet at the walking point nearest to the middle between them
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const [rx, rz] = WANDER.slice().sort((p, q) => Math.hypot(p[0] - mx, p[1] - mz) - Math.hypot(q[0] - mx, q[1] - mz))[0];
    const lines = makeConversation(a, b, { weather: this.environment?.weatherId, period: this.environment?.periodName() }, c.recent);
    const place = (agent, x, partner) => { agent.route = planRoute(agent, { x, z: rz }); agent.mode = "toChat"; agent.chatPartner = partner; agent.chatSpeaking = false; };
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
    this.rig.update();
    this.outline.render(this.scene, this.camera);
  }

  // Screen positions (CSS px) above each head, for DOM name tags/bubbles.
  tagPositions() {
    const out = [];
    const v = new THREE.Vector3();
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const a of this.agents.values()) {
      const sitting = a.mode === "sitting" && !a.route.length;
      v.set(a.x, this.office.floorTop + (sitting ? 1.45 : 1.38), a.z);
      v.project(this.camera);
      if (v.z > 1) continue;
      out.push({ agent: a, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h });
    }
    return out;
  }

  // Layout editor: pointer ray, the floor point under the pointer and the furniture under it.
  setRay(clientX, clientY) {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
  }

  groundPoint(clientX, clientY) {
    this.setRay(clientX, clientY);
    const hit = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.office.floorTop);
    return this.raycaster.ray.intersectPlane(plane, hit) ? hit : null;
  }

  pickFurniture(clientX, clientY) {
    this.setRay(clientX, clientY);
    return this.office.furniture.pick(this.raycaster);
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
