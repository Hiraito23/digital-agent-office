// Sky, light and weather of the office: time of day (pagi, siang, sore, malam) and weather
// (cerah, berawan, hujan, badai, kabut). The look is a function of the hour: the sky
// gradient, the sun or moon, stars, light colours and intensities, the lamps and the
// glowing windows are interpolated between the keyframes below. In "otomatis" the hour
// follows the computer clock; a manual time slides there like a time-lapse. Weather is
// blended on top (clouds, rain, lightning, fog, greyer light) and fades in and out.
import * as THREE from "three";

export const TIMES = [
  { id: "auto", label: "Otomatis", icon: "🕒", title: "Mengikuti jam komputer" },
  { id: "pagi", label: "Pagi", icon: "🌅", hour: 7.3, title: "Pagi hari" },
  { id: "siang", label: "Siang", icon: "☀", hour: 12.5, title: "Siang hari (mode terang)" },
  { id: "sore", label: "Sore", icon: "🌇", hour: 17.6, title: "Sore hari (senja)" },
  { id: "malam", label: "Malam", icon: "🌙", hour: 22, title: "Malam hari (mode malam)" },
];

export const WEATHERS = [
  { id: "cerah", label: "Cerah", icon: "☀" },
  { id: "berawan", label: "Berawan", icon: "⛅" },
  { id: "hujan", label: "Hujan", icon: "🌧" },
  { id: "badai", label: "Badai", icon: "⛈" },
  { id: "kabut", label: "Kabut", icon: "🌫" },
];

// Per weather: multipliers on the light, how grey the sky gets, clouds (0-1), how dark they
// are, rain amount, and how far the fog is pulled in.
const WEATHER = {
  cerah: { sun: 1, hemi: 1, gray: 0, cloud: 0.25, dark: 0, rain: 0, fogNear: 1, fogFar: 1 },
  berawan: { sun: 0.55, hemi: 0.92, gray: 0.45, cloud: 1, dark: 0.25, rain: 0, fogNear: 0.9, fogFar: 0.85 },
  hujan: { sun: 0.25, hemi: 0.75, gray: 0.7, cloud: 1, dark: 0.7, rain: 1, fogNear: 0.5, fogFar: 0.6 },
  badai: { sun: 0.15, hemi: 0.62, gray: 0.85, cloud: 1, dark: 1, rain: 1.6, fogNear: 0.4, fogFar: 0.5 },
  kabut: { sun: 0.5, hemi: 0.95, gray: 0.8, cloud: 0.3, dark: 0, rain: 0, fogNear: 0.08, fogFar: 0.35 },
};

// Keyframes by hour: skyTop, skyBottom (horizon), sun colour, sun intensity, hemisphere
// sky colour, hemisphere ground colour, hemisphere intensity, night (0-1), glow (sun halo).
// The sun intensity dips at 5.8 and 18.8, when the light swaps between sun and moon.
const NIGHT = ["#070b1f", "#141c3d", "#9db4ff", 0.4, "#2f4580", "#1a2342", 0.82, 1, 0];
const DAY = ["#4a9be8", "#bfe3ff", "#fff4dc", 1.6, "#e3f2ff", "#4e7a34", 1.1, 0, 0];
const RAW_KEYS = [
  [0, ...NIGHT],
  [5.4, ...NIGHT],
  [5.8, "#2c3a78", "#e98a63", "#ffb27a", 0.12, "#6a6f9a", "#2c3050", 0.7, 0.8, 0.6],
  [6.4, "#4d79c4", "#ffb98a", "#ffbf8a", 0.9, "#b9c8e8", "#4a4f60", 0.75, 0.4, 0.9],
  [7.3, "#6fa8e8", "#ffe0b8", "#ffe2b8", 1.25, "#dbe9ff", "#6a7a4a", 0.95, 0.08, 0.5],
  [10.5, ...DAY],
  [14.5, ...DAY],
  [17, "#5a86d0", "#ffd1a0", "#ffc58a", 1.4, "#ffe9d2", "#5a6a38", 1.0, 0.08, 0.5],
  [18.3, "#4a3f7a", "#ff8a5c", "#ff9a6a", 0.9, "#c9b4d8", "#4a4a58", 0.75, 0.4, 0.9],
  [18.8, "#2c2f66", "#d9667a", "#ff8a7a", 0.12, "#7a78a8", "#2c3050", 0.7, 0.8, 0.6],
  [19.6, "#10163a", "#2f3466", "#9db4ff", 0.4, "#2f4580", "#1a2342", 0.8, 1, 0.1],
  [21, ...NIGHT],
  [24, ...NIGHT],
];
const KEYS = RAW_KEYS.map(([h, top, bottom, sun, sunI, hSky, hGround, hI, night, glow]) => ({
  h, top: new THREE.Color(top), bottom: new THREE.Color(bottom), sun: new THREE.Color(sun), sunI,
  hSky: new THREE.Color(hSky), hGround: new THREE.Color(hGround), hI, night, glow,
}));

const smooth = (t) => t * t * (3 - 2 * t);
const luma = (c) => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;

// Interpolated look at an hour (0-24) into `out`.
const sample = (hour, out) => {
  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1].h) i += 1;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth(Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h))));
  out.top.copy(a.top).lerp(b.top, t);
  out.bottom.copy(a.bottom).lerp(b.bottom, t);
  out.sun.copy(a.sun).lerp(b.sun, t);
  out.hSky.copy(a.hSky).lerp(b.hSky, t);
  out.hGround.copy(a.hGround).lerp(b.hGround, t);
  out.sunI = a.sunI + (b.sunI - a.sunI) * t;
  out.hI = a.hI + (b.hI - a.hI) * t;
  out.night = a.night + (b.night - a.night) * t;
  out.glow = a.glow + (b.glow - a.glow) * t;
  return out;
};

// Where the sun (5.8 to 18.8) or the moon (the rest of the night) stands: one arc each.
const bodyAt = (hour) => {
  const sunUp = hour >= 5.8 && hour < 18.8;
  const p = sunUp ? (hour - 5.8) / 13 : (hour >= 18.8 ? hour - 18.8 : hour + 5.2) / 11;
  const a = p * Math.PI;
  return { sunUp, dir: new THREE.Vector3(-Math.cos(a), 0.12 + 0.88 * Math.sin(a), 0.38).normalize() };
};

// The sky is a full-screen gradient quad (the camera is orthographic and never turns).
const SKY_VERT = `
varying float vH;
void main() {
  vH = position.y * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}`;
const SKY_FRAG = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform vec3 glowColor;
uniform float glow;
varying float vH;
void main() {
  float h = clamp(vH, 0.0, 1.0);
  vec3 col = mix(bottomColor, topColor, pow(h, 0.8));
  float g = pow(1.0 - h, 3.0) * glow * 0.6;
  gl_FragColor = vec4(col + glowColor * g, 1.0);
}`;

const CLOUDS = 9;
const STARS = 900;
const STAR_SPAN = { x: 70, y: 45 }; // half-size of the star sheet, enough for the widest zoom
const RAIN_MAX = 1400;
const RAIN_BOX = { x0: -2, x1: 38, z0: -2, z1: 38, top: 22 };

export class Environment {
  constructor({ scene, camera, sun, hemi, office, center }) {
    this.scene = scene;
    this.camera = camera;
    this.sun = sun;
    this.hemi = hemi;
    this.office = office;
    this.center = center;
    this.timeId = "auto";
    this.weatherId = "cerah";
    this.hour = this.clockHour();
    this.w = { ...WEATHER.cerah };
    this.look = { top: new THREE.Color(), bottom: new THREE.Color(), sun: new THREE.Color(), hSky: new THREE.Color(), hGround: new THREE.Color(), sunI: 1, hI: 1, night: 0, glow: 0 };
    this.top = new THREE.Color();
    this.bottom = new THREE.Color();
    this.tmp = new THREE.Color();
    this.tmpV = new THREE.Vector3();
    this.tmpR = new THREE.Vector3();
    this.tmpU = new THREE.Vector3();
    this.flash = 0;
    this.nextFlash = 0;
    this.baseFog = { near: scene.fog?.near ?? 50, far: scene.fog?.far ?? 100 };

    // sky dome (follows the camera), sun/moon discs and stars
    this.dome = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        depthWrite: false, depthTest: false, fog: false,
        uniforms: { topColor: { value: new THREE.Color() }, bottomColor: { value: new THREE.Color() }, glowColor: { value: new THREE.Color() }, glow: { value: 0 } },
        vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    const disc = (color, r) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color, fog: false, transparent: true, depthWrite: false }));
      m.renderOrder = -9;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    this.sunDisc = disc("#fff1c2", 6);
    this.moonDisc = disc("#e3ecff", 4.5);

    // stars: scattered on a flat sheet facing the camera (local x/y, 120 units behind the scene)
    const starPos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i += 1) starPos.set([(Math.random() - 0.5) * 2 * STAR_SPAN.x, (Math.random() - 0.5) * 2 * STAR_SPAN.y, -120], i * 3);
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: "#ffffff", size: 1.7, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false }));
    this.stars.renderOrder = -9;
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // clouds: a few low-poly puffs that drift and fade with the weather
    this.cloudMat = new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false });
    this.clouds = [];
    for (let i = 0; i < CLOUDS; i += 1) {
      const g = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let k = 0; k < puffs; k += 1) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + ((i + k) % 3) * 0.5, 0), this.cloudMat);
        puff.position.set((k - puffs / 2) * 2.0, ((k + i) % 2) * 0.5, ((k * 7 + i) % 3 - 1) * 0.8);
        puff.scale.set(1.4, 0.7, 1);
        g.add(puff);
      }
      g.position.set(-6 + ((i * 37) % 52), 16 + (i % 4) * 2.2, -6 + ((i * 53) % 52));
      g.scale.setScalar(0);
      g.userData.speed = 0.5 + (i % 5) * 0.12;
      scene.add(g);
      this.clouds.push(g);
    }

    // rain: falling streaks inside a box over the office
    this.drops = new Float32Array(RAIN_MAX * 3);
    for (let i = 0; i < RAIN_MAX; i += 1) this.resetDrop(i, true);
    this.rainPos = new Float32Array(RAIN_MAX * 6);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(this.rainPos, 3));
    this.rainMat = new THREE.LineBasicMaterial({ color: "#cfe3ff", transparent: true, opacity: 0.5, depthWrite: false });
    this.rain = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
  }

  clockHour() {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  resetDrop(i, anywhere = false) {
    const d = this.drops;
    d[i * 3] = RAIN_BOX.x0 + Math.random() * (RAIN_BOX.x1 - RAIN_BOX.x0);
    d[i * 3 + 1] = anywhere ? Math.random() * RAIN_BOX.top : RAIN_BOX.top;
    d[i * 3 + 2] = RAIN_BOX.z0 + Math.random() * (RAIN_BOX.z1 - RAIN_BOX.z0);
  }

  setTime(id, { instant = false } = {}) {
    if (!TIMES.some((t) => t.id === id)) return;
    this.timeId = id;
    if (instant) this.hour = this.targetHour();
  }

  setWeather(id) {
    if (WEATHER[id]) this.weatherId = id;
  }

  targetHour() {
    const t = TIMES.find((x) => x.id === this.timeId);
    return t?.hour ?? this.clockHour();
  }

  // Name of the part of the day shown right now (also in "otomatis").
  periodName() {
    const h = this.hour;
    if (h < 5.8 || h >= 18.8) return "Malam";
    if (h < 10) return "Pagi";
    if (h < 15.5) return "Siang";
    return "Sore";
  }

  update(dt, now) {
    // time: slide forward to the target hour (a quick time-lapse when the mode changes)
    const target = this.targetHour();
    const ahead = (target - this.hour + 24) % 24;
    if (ahead > 0.005 && ahead < 23.995) {
      const step = this.timeId === "auto" && ahead < 0.2 ? ahead : Math.min(ahead, (dt / 1000) * 7);
      this.hour = (this.hour + step) % 24;
    } else this.hour = target;

    // weather: ease every factor toward the target
    const goal = WEATHER[this.weatherId];
    const k = 1 - Math.exp(-dt / 1000 * 1.6);
    for (const key of Object.keys(goal)) this.w[key] += (goal[key] - this.w[key]) * k;
    const w = this.w;

    const look = sample(this.hour, this.look);
    const storm = this.weatherId === "badai";
    if (storm && now > this.nextFlash) {
      this.flash = 1;
      this.nextFlash = now + 3500 + Math.random() * 7000;
    }
    this.flash *= Math.exp(-dt / 110);
    if (this.flash < 0.02) this.flash = 0;

    // sky and fog colours: grey them out in bad weather, flash in lightning
    const gray = (c, amount) => c.lerp(this.tmp.setScalar(luma(c) * 0.85 + 0.07), amount);
    this.top.copy(look.top);
    this.bottom.copy(look.bottom);
    gray(this.top, w.gray);
    gray(this.bottom, w.gray);
    if (this.flash) { this.top.lerp(this.tmp.set("#ffffff"), this.flash * 0.45); this.bottom.lerp(this.tmp.set("#ffffff"), this.flash * 0.45); }

    const body = bodyAt(this.hour);
    const u = this.dome.material.uniforms;
    u.topColor.value.copy(this.top);
    u.bottomColor.value.copy(this.bottom);
    u.glowColor.value.copy(look.sun);
    u.glow.value = look.glow * (1 - w.gray * 0.85);
    this.scene.background = this.bottom;
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.bottom);
      this.scene.fog.near = this.baseFog.near * w.fogNear;
      this.scene.fog.far = this.baseFog.far * w.fogFar;
    }

    // the light: sun by day, moon by night, from the same direction as the visible disc
    const lightDir = body.dir.clone();
    lightDir.y = Math.max(lightDir.y, 0.35);
    lightDir.normalize();
    this.sun.position.set(this.center.x + lightDir.x * 26, lightDir.y * 26, this.center.z + lightDir.z * 26);
    this.sun.color.copy(look.sun);
    gray(this.sun.color, w.gray * 0.7);
    this.sun.intensity = look.sunI * w.sun;
    this.hemi.color.copy(look.hSky);
    gray(this.hemi.color, w.gray * 0.5);
    this.hemi.groundColor.copy(look.hGround);
    this.hemi.intensity = look.hI * w.hemi + this.flash * 2.2;

    // sun, moon and stars
    // the discs sit on the sky behind the scene: the arc of the body maps onto the screen's upper half
    const cam = this.camera;
    const halfH = (cam.top - cam.bottom) / 2;
    const halfW = (cam.right - cam.left) / 2;
    const fwd = this.tmpV.set(0, 0, -1).transformDirection(cam.matrixWorld);
    const right = this.tmpR.set(1, 0, 0).transformDirection(cam.matrixWorld);
    const up = this.tmpU.set(0, 1, 0).transformDirection(cam.matrixWorld);
    const place = (disc, show, dir, opacity, radius) => {
      disc.visible = show && opacity > 0.02;
      disc.position.copy(cam.position).addScaledVector(fwd, 100)
        .addScaledVector(right, dir.x * halfW * 0.8)
        .addScaledVector(up, halfH * (0.2 + 0.7 * dir.y));
      disc.scale.setScalar((halfH * radius) / 6);
      disc.quaternion.copy(cam.quaternion);
      disc.material.opacity = opacity;
    };
    const clear = 1 - Math.min(1, w.gray * 1.1);
    place(this.sunDisc, body.sunUp && body.dir.y > 0.14, body.dir, clear, 0.07);
    place(this.moonDisc, !body.sunUp && body.dir.y > 0.14, body.dir, clear, 0.055);
    this.sunDisc.material.color.copy(look.sun).lerp(this.tmp.set("#fff6d8"), 0.4);
    this.stars.material.opacity = look.night * (1 - Math.min(1, w.gray * 1.2));
    this.stars.visible = this.stars.material.opacity > 0.02;
    this.stars.position.copy(this.camera.position);
    this.stars.quaternion.copy(this.camera.quaternion);

    // clouds: colour follows the light, count and darkness follow the weather
    const cloudColor = this.cloudMat.color;
    cloudColor.set("#ffffff").lerp(this.tmp.set("#69717f"), w.dark);
    cloudColor.lerp(this.tmp.set("#26305a"), look.night * 0.85);
    cloudColor.lerp(look.sun, 0.3 * look.glow);
    const wanted = Math.round(w.cloud * CLOUDS);
    this.clouds.forEach((c, i) => {
      const s = c.scale.x + ((i < wanted ? 1 : 0) - c.scale.x) * k;
      c.scale.setScalar(s < 0.01 ? 0 : s);
      c.visible = s >= 0.01;
      c.position.x += (dt / 1000) * c.userData.speed * (storm ? 2.2 : 1);
      if (c.position.x > 50) c.position.x = -12;
    });

    // lamps and windows
    const night = smooth(look.night);
    for (const l of this.office.lampLights ?? []) l.intensity = 0.15 + 1.6 * night;
    this.office.windowMat?.color.set("#ffffff").lerp(this.tmp.set("#ffd28a"), night);

    // rain
    const density = Math.min(1, w.rain / 1.6);
    const count = Math.round(RAIN_MAX * Math.min(1, w.rain / 1.6) * (storm ? 1 : 0.65));
    this.rain.visible = w.rain > 0.03 && count > 0;
    if (this.rain.visible) {
      const speed = 22 + w.rain * 8;
      const slant = storm ? 0.25 : 0.08;
      const d = this.drops;
      const p = this.rainPos;
      const sec = dt / 1000;
      for (let i = 0; i < count; i += 1) {
        d[i * 3 + 1] -= speed * sec * (0.85 + (i % 7) * 0.04);
        d[i * 3] -= speed * sec * slant;
        if (d[i * 3 + 1] < 0.05 || d[i * 3] < RAIN_BOX.x0) this.resetDrop(i);
        const x = d[i * 3];
        const y = d[i * 3 + 1];
        const z = d[i * 3 + 2];
        p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z;
        p[i * 6 + 3] = x + 0.08 * slant * 4; p[i * 6 + 4] = y + 0.55; p[i * 6 + 5] = z;
      }
      this.rain.geometry.setDrawRange(0, count * 2);
      this.rain.geometry.attributes.position.needsUpdate = true;
      this.rainMat.opacity = 0.2 + 0.4 * density;
      this.rainMat.color.set("#cfe3ff").lerp(this.tmp.set("#6f7fa8"), look.night * 0.7);
    }
  }
}
