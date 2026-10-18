// The 3D world: renderer, camera + orbit controls, lights, the office scene
// and the agents (their seats, idle activities and movement). main.js feeds it
// the roster and agent status from the gateway and asks it for tag positions.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildOffice } from "../office/index.js";
import { ACTIVITY_SPOTS, CENTER, MEETING, PORTAL, WANDER } from "../office/layout.js";
import { animatePerson } from "../characters/animation.js";
import { createPerson } from "../characters/person.js";
import { PRESETS } from "../characters/presets.js";
import { corridorFor, doorOf, planRoute } from "./routing.js";

// Pixel modes: render at a fraction of the CSS resolution, upscale crisply.
export const PIXEL_MODES = [
  { label: "HD", ratio: () => Math.min(window.devicePixelRatio || 1, 2) },
  { label: "Pixel", ratio: () => 0.5 },
  { label: "Retro", ratio: () => 0.33 },
];

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#a8dcff");
    this.scene.fog = new THREE.Fog("#a8dcff", 50, 100);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 200);
    this.camera.position.set(CENTER.x + 19, 21, CENTER.z + 19);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(CENTER.x, 0.4, CENTER.z + 0.5);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2.25;
    this.controls.minPolarAngle = Math.PI / 8;
    this.controls.screenSpacePanning = false;
    this.controls.update();

    // lighting: sky/ground fill + sun with shadows
    this.scene.add(new THREE.HemisphereLight("#e3f2ff", "#4e7a34", 1.1));
    const sun = new THREE.DirectionalLight("#fff4dc", 1.6);
    sun.position.set(CENTER.x + 10, 22, CENTER.z + 6);
    sun.target.position.set(CENTER.x, 0, CENTER.z);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);

    this.office = buildOffice(this.scene);
    this.agents = new Map();
    this.appearances = {};
    this.raycaster = new THREE.Raycaster();
    this.pixelMode = 1;
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
      };
      a.model = this.makeModel(info.id, { ...preset, ...(this.appearances[info.id] ?? {}) }, a);
      this.agents.set(info.id, a);
    });
    this.assignDesks(["hermes", ...others].filter((id) => this.agents.has(id)));
  }

  // One desk + chair per agent: Hermes first, then the team in a stable order.
  assignDesks(order) {
    const seats = this.office.setDesks(order.length);
    order.forEach((id, i) => {
      const a = this.agents.get(id);
      const seat = seats[i] ?? null;
      const moved = a.seat && seat && (a.seat.x !== seat.x || a.seat.z !== seat.z);
      a.seat = seat;
      if (moved && (a.mode === "sitting" || a.mode === "toSeat")) {
        a.mode = "toSeat";
        a.route = planRoute(a, seat);
      }
    });
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
      const from = a.mode === "activity" ? a.room : null; // inside a room: leave through its door
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
      const exit = doorOf(MEETING.room);
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
      a.route = planRoute(a, a.seat, a.leavingRoom);
      a.mode = "toSeat";
    }
    if (status !== "working" && a.mode === "sitting") {
      a.mode = "idle";
      a.nextWander = performance.now() + 2500;
      a.route = [{ x: a.seat.x, z: a.seat.z + 0.6 }];
    }
  }

  update(dt, now) {
    this.office.update(now);
    for (const a of this.agents.values()) {
      let moving = false;
      if (a.route.length) {
        const target = a.route[0];
        const dx = target.x - a.x;
        const dz = target.z - a.z;
        const dist = Math.hypot(dx, dz);
        const step = (dt / 1000) * 1.9;
        if (dist <= step) {
          a.x = target.x;
          a.z = target.z;
          a.route.shift();
          if (!a.route.length && a.mode === "toSeat") a.mode = "sitting";
          if (!a.route.length && a.mode === "toMeeting") { a.mode = "meeting"; a.room = MEETING.room; }
          if (!a.route.length && a.mode === "wander") a.mode = "idle";
          if (!a.route.length && a.mode === "toSpot") {
            a.room = a.spot.room ?? null;
            a.mode = "activity";
            a.activityEnd = now + 9000 + Math.random() * 9000;
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
        a.spot = null;
        a.room = null;
        a.mode = "wander";
        a.nextWander = now + 3000 + Math.random() * 4000;
      } else if (a.mode === "idle" && now > a.nextWander) {
        const spots = this.freeSpots();
        const wantsActivity = spots.length && Math.random() < (a.isMain ? 0.3 : 0.6);
        if (wantsActivity) {
          a.spot = spots[Math.floor(Math.random() * spots.length)];
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
      if (sitting) targetHeading = Math.PI;
      else if (inMeeting) targetHeading = a.meeting.heading;
      else if (atSpot) targetHeading = a.spot.heading;
      else if (!moving) targetHeading = Math.atan2(this.camera.position.x - a.x, this.camera.position.z - a.z);
      let diff = targetHeading - a.model.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.model.rotation.y += diff * Math.min(1, dt / 120);
      a.model.position.set(a.x, this.office.floorTop, a.z);
      const pose = moving ? "walk" : sitting ? "sit" : inMeeting ? a.meeting.pose : atSpot ? a.spot.pose : "idle";
      a.activityIcon = inMeeting || a.mode === "toMeeting" ? a.meeting.icon : atSpot ? a.spot.icon : "";
      animatePerson(a.model, pose, now, a.phase, Boolean(a.speaking));
    }
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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
