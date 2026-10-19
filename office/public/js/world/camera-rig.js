// Fixed isometric camera (the look of a pixel-art JRPG): orthographic, always the same angle,
// no rotation. The player can only pan (drag or arrow keys) and zoom (mouse wheel). The camera
// position is snapped to the render pixel grid so the pixelated image does not shimmer.
import * as THREE from "three";

const ELEVATION = Math.PI / 6; // 30 degrees: the 2:1 pixel-art angle
const AZIMUTH = Math.PI / 4;
const DISTANCE = 45;
const SIZE = { min: 10, max: 40, start: 20 }; // visible height in world units
const KEY_PAN = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright"]);

export class CameraRig {
  constructor(canvas, center, extent) {
    this.canvas = canvas;
    this.home = new THREE.Vector3(center.x, 0.4, center.z + 0.5);
    this.min = 2; // the camera target stays on the island
    this.max = extent - 2;
    this.offset = new THREE.Vector3(Math.cos(ELEVATION) * Math.sin(AZIMUTH), Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.cos(AZIMUTH)).multiplyScalar(DISTANCE);
    // screen axes lying on the ground plane
    this.right = new THREE.Vector3(Math.cos(AZIMUTH), 0, -Math.sin(AZIMUTH));
    this.forward = new THREE.Vector3(-Math.sin(AZIMUTH), 0, -Math.cos(AZIMUTH)); // screen-up, along the ground
    this.up = new THREE.Vector3(-Math.sin(ELEVATION) * Math.sin(AZIMUTH), Math.cos(ELEVATION), -Math.sin(ELEVATION) * Math.cos(AZIMUTH));

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.5, 200);
    this.target = this.home.clone();
    this.goal = this.home.clone();
    this.size = SIZE.start;
    this.goalSize = SIZE.start;
    this.aspect = 1;
    this.texel = 0; // world units per rendered pixel (0 = no snapping)
    this.keys = new Set();
    this.drag = null;
    this.last = performance.now();
    this.bind();
    this.apply();
  }

  bind() {
    const canvas = this.canvas;
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      if (!dx && !dy) return;
      canvas.style.cursor = "grabbing";
      const perPx = this.goalSize / window.innerHeight; // the map follows the pointer
      this.panBy(-dx * perPx, dy * perPx / Math.sin(ELEVATION));
    });
    const end = (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag = null;
      canvas.style.cursor = "";
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.goalSize = Math.min(SIZE.max, Math.max(SIZE.min, this.goalSize * Math.exp(e.deltaY * 0.0012)));
    }, { passive: false });

    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
    window.addEventListener("keydown", (e) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "home") { this.reset(); return; }
      if (!KEY_PAN.has(key)) return;
      e.preventDefault();
      this.keys.add(key);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());
  }

  // Moves the camera target along the screen's right axis and its ground "up" axis.
  panBy(right, forward) {
    this.goal.addScaledVector(this.right, right).addScaledVector(this.forward, forward);
    this.goal.x = Math.min(this.max, Math.max(this.min, this.goal.x));
    this.goal.z = Math.min(this.max, Math.max(this.min, this.goal.z));
  }

  reset() {
    this.goal.copy(this.home);
    this.goalSize = SIZE.start;
  }

  // Called on window resize; bufferHeight is the canvas height in rendered pixels.
  resize(width, height, bufferHeight) {
    this.aspect = width / height;
    this.bufferHeight = bufferHeight;
    this.apply();
  }

  update(now = performance.now()) {
    const dt = Math.min(100, now - this.last);
    this.last = now;
    if (this.keys.size) {
      const speed = (this.goalSize * 0.9 * dt) / 1000;
      const dir = (a, b) => (this.keys.has(a) ? 1 : 0) - (this.keys.has(b) ? 1 : 0);
      this.panBy(dir("arrowright", "arrowleft") * speed, dir("arrowup", "arrowdown") * speed / Math.sin(ELEVATION));
    }
    const k = 1 - Math.exp(-dt / 1000 * 12);
    this.target.lerp(this.goal, k);
    this.size += (this.goalSize - this.size) * k;
    this.apply();
  }

  apply() {
    const cam = this.camera;
    const half = this.size / 2;
    cam.left = -half * this.aspect;
    cam.right = half * this.aspect;
    cam.top = half;
    cam.bottom = -half;
    cam.updateProjectionMatrix();
    const t = this.target.clone();
    const texel = this.bufferHeight ? this.size / this.bufferHeight : 0;
    if (texel) {
      const sr = t.dot(this.right);
      const su = t.dot(this.up);
      t.addScaledVector(this.right, Math.round(sr / texel) * texel - sr);
      t.addScaledVector(this.up, Math.round(su / texel) * texel - su);
    }
    cam.position.copy(t).add(this.offset);
    cam.lookAt(t);
    cam.updateMatrixWorld();
  }
}
