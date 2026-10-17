// Scene, camera, agents and their movement for the 3D office.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildOffice, SEATS, WANDER, PORTAL, CENTER } from "./office3d.js";
import { createPerson, animatePerson, PRESETS } from "./people3d.js";

const corridorFor = (z) => (z < 12.5 ? 11.3 : 15.6);
const AISLE_LEFT = 7;
const AISLE_RIGHT = 21.6;

// Detour around the desk rows using two corridors and the side aisles.
const planRoute = (from, to) => {
  const route = [];
  const c1 = corridorFor(from.z);
  const c2 = corridorFor(to.z);
  route.push({ x: from.x, z: c1 });
  if (c1 !== c2) {
    const side = Math.abs(from.x - AISLE_LEFT) + Math.abs(to.x - AISLE_LEFT) < Math.abs(from.x - AISLE_RIGHT) + Math.abs(to.x - AISLE_RIGHT) ? AISLE_LEFT : AISLE_RIGHT;
    route.push({ x: side, z: c1 }, { x: side, z: c2 });
  }
  route.push({ x: to.x, z: c2 }, { x: to.x, z: to.z });
  return route;
};

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
      const seat = isMain ? null : SEATS[order % SEATS.length];
      const [sx, sz] = isMain ? [PORTAL.x - 0.6, PORTAL.z + 0.4] : WANDER[(order * 3) % WANDER.length];
      const a = {
        id: info.id, name: info.name, role: info.role, isMain, preset, seat,
        x: sx, z: sz, heading: Math.PI / 4, route: [], mode: "idle", status: "idle",
        nextWander: performance.now() + 1500 + Math.random() * 3000, lastActive: 0, phase: Math.random() * 10,
      };
      a.model = this.makeModel(info.id, { ...preset, ...(this.appearances[info.id] ?? {}) }, a);
      this.agents.set(info.id, a);
    });
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
    if (status === "working" && a.seat && a.mode !== "sitting") {
      a.route = planRoute(a, a.seat);
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
          if (!a.route.length && a.mode === "wander") a.mode = "idle";
        } else {
          a.x += (dx / dist) * step;
          a.z += (dz / dist) * step;
          a.heading = Math.atan2(dx, dz);
          moving = true;
        }
      } else if (a.mode === "idle" && now > a.nextWander) {
        if (a.isMain) {
          const ang = Math.random() * Math.PI * 2;
          a.route = [{ x: PORTAL.x + Math.cos(ang) * 1.2, z: PORTAL.z + Math.sin(ang) * 0.9 }];
        } else {
          const [tx, tz] = Math.random() < 0.18
            ? [PORTAL.x + (Math.random() - 0.5), PORTAL.z + (Math.random() - 0.5) * 0.6]
            : WANDER[Math.floor(Math.random() * WANDER.length)];
          a.route = planRoute(a, { x: tx, z: tz });
        }
        a.mode = "wander";
        a.nextWander = now + 4000 + Math.random() * 7000;
      }

      const sitting = a.mode === "sitting" && !moving;
      // face the desk when seated, face the camera side when idle
      let targetHeading = a.heading;
      if (sitting) targetHeading = Math.PI;
      else if (!moving) targetHeading = Math.atan2(this.camera.position.x - a.x, this.camera.position.z - a.z);
      let diff = targetHeading - a.model.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.model.rotation.y += diff * Math.min(1, dt / 120);
      a.model.position.set(a.x, this.office.floorTop, a.z);
      animatePerson(a.model, moving ? "walk" : sitting ? "sit" : "idle", now, a.phase, Boolean(a.speaking));
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
