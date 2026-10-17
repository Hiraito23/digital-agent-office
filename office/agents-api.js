"use strict";
// REST API behind the office's "⚙ Agen" panel.
//   GET    /api/agents          roster with persona + look
//   POST   /api/agents          create an agent
//   PUT    /api/agents/:id      update persona/look (the orchestrator: look only)
//   DELETE /api/agents/:id      remove an agent (never the orchestrator)
//   GET    /api/soul            read SOUL.md      } through the official Hermes
//   PUT    /api/soul            write SOUL.md     } dashboard API (login with DASH_USER/PASS)
// Persona lives in config/team.json, look + voice in config/people.json.
const fs = require("fs");
const path = require("path");

const PEOPLE_FILE = process.env.PEOPLE_FILE || path.join(__dirname, "public", "people.json");
const DASHBOARD_URL = (process.env.HERMES_DASHBOARD_URL || "http://hermes:9119").replace(/\/$/, "");
const ORCHESTRATOR_NAME = process.env.HERMES_AGENT_NAME || "Hermes";

// ---------------------------------------------------------------------------
// files
// ---------------------------------------------------------------------------

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

// Write a sibling temp file, then rename over the target (no half-written JSON).
const writeJson = (file, data) => {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
};

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

class BadRequest extends Error {}

const ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const HAIR = ["short", "long", "bob", "ponytail", "bun", "spiky", "cap"];
const OUTFIT = ["shirt", "blazer", "hoodie", "dress"];
const ACCESSORY = ["", "glasses", "headset"];
const COLOR_KEYS = ["hairColor", "skin", "top", "shirt", "tie", "pants", "shoes", "cap", "brim"];
const COSTUMES = ["", "tikus-listrik", "kadal-api", "kura-air", "kodok-daun", "rubah-cokelat", "dino-oranye", "serigala-bertanduk", "naga-biru", "bayi-bersayap",
  "ninja-oranye", "seragam-pelaut", "gakuran", "petarung-gi", "bajak-laut-jerami", "penyihir"];

const text = (value, max, field, required = false) => {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) throw new BadRequest(`${field} wajib diisi`);
  if (s.length > max) throw new BadRequest(`${field} maksimal ${max} karakter`);
  return s;
};

const slugify = (name) =>
  name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

const cleanLook = (look) => {
  if (look == null) return null;
  if (typeof look !== "object" || Array.isArray(look)) throw new BadRequest("look tidak valid");
  const out = {};
  if (look.hair !== undefined) {
    if (!HAIR.includes(look.hair)) throw new BadRequest("pilihan rambut tidak dikenal");
    out.hair = look.hair;
  }
  if (look.outfit !== undefined) {
    if (!OUTFIT.includes(look.outfit)) throw new BadRequest("pilihan pakaian tidak dikenal");
    out.outfit = look.outfit;
  }
  if (look.accessory !== undefined) {
    if (!ACCESSORY.includes(look.accessory)) throw new BadRequest("pilihan aksesori tidak dikenal");
    if (look.accessory) out.accessory = look.accessory;
  }
  if (look.costume !== undefined) {
    if (!COSTUMES.includes(look.costume)) throw new BadRequest("pilihan kostum tidak dikenal");
    if (look.costume) out.costume = look.costume;
  }
  for (const key of COLOR_KEYS) {
    if (look[key] === undefined || look[key] === "") continue;
    if (!HEX_RE.test(look[key])) throw new BadRequest(`warna ${key} harus format #RRGGBB`);
    out[key] = look[key].toLowerCase();
  }
  if (look.voice !== undefined) {
    const v = look.voice;
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new BadRequest("suara tidak valid");
    const voice = {};
    voice.lang = typeof v.lang === "string" && /^[a-z]{2}-[A-Z]{2}$/.test(v.lang) ? v.lang : "id-ID";
    if (v.gender) {
      if (!["male", "female"].includes(v.gender)) throw new BadRequest("jenis suara harus male atau female");
      voice.gender = v.gender;
    }
    if (v.prefer !== undefined) {
      if (!Array.isArray(v.prefer) || v.prefer.length > 5) throw new BadRequest("daftar suara maksimal 5");
      voice.prefer = v.prefer.map((p) => text(p, 120, "nama suara")).filter(Boolean);
    }
    for (const key of ["pitch", "rate"]) {
      if (v[key] === undefined) continue;
      const n = Number(v[key]);
      if (!Number.isFinite(n) || n < 0.5 || n > 2) throw new BadRequest(`${key} harus 0.5 sampai 2`);
      voice[key] = Math.round(n * 100) / 100;
    }
    out.voice = voice;
  }
  return out;
};

const cleanPersona = (body, { requireName }) => ({
  name: text(body.name, 40, "nama", requireName),
  role: text(body.role, 60, "peran"),
  instructions: text(body.instructions, 4000, "instruksi"),
  boundaries: text(body.boundaries, 1000, "batasan"),
});

// ---------------------------------------------------------------------------
// Hermes dashboard client (SOUL.md through the official API)
// ---------------------------------------------------------------------------

let dashCookies = "";

const dashLogin = async () => {
  if (!process.env.DASH_USER || !process.env.DASH_PASS) throw new Error("DASH_USER/DASH_PASS belum diatur");
  const res = await fetch(`${DASHBOARD_URL}/auth/password-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "basic", username: process.env.DASH_USER, password: process.env.DASH_PASS, next: "" }),
    redirect: "manual",
  });
  if (!res.ok) throw new Error(`login dashboard gagal (${res.status})`);
  dashCookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
};

const dashFetch = async (urlPath, init = {}, retry = true) => {
  if (!dashCookies) await dashLogin();
  const res = await fetch(`${DASHBOARD_URL}${urlPath}`, { ...init, headers: { ...(init.headers || {}), Cookie: dashCookies } });
  if (res.status === 401 && retry) {
    dashCookies = "";
    return dashFetch(urlPath, init, false);
  }
  if (!res.ok) throw new Error(`dashboard Hermes menjawab ${res.status}`);
  return res.json();
};

// ---------------------------------------------------------------------------
// handlers
// ---------------------------------------------------------------------------

const send = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 65536) {
        reject(new BadRequest("data terlalu besar"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch { reject(new BadRequest("JSON tidak valid")); }
    });
    req.on("error", reject);
  });

const createAgentsApi = ({ team, TEAM_FILE }) => {
  const roster = () => {
    const members = readJson(TEAM_FILE, []);
    const people = readJson(PEOPLE_FILE, {});
    const list = [{
      id: team.ORCHESTRATOR_ID, name: ORCHESTRATOR_NAME, role: "Orchestrator",
      instructions: "", boundaries: "", builtin: true, look: people[team.ORCHESTRATOR_ID] ?? {},
    }];
    for (const m of Array.isArray(members) ? members : []) {
      if (!m || typeof m.id !== "string" || m.id === team.ORCHESTRATOR_ID) continue;
      list.push({
        id: m.id, name: m.name ?? m.id, role: m.role ?? "", instructions: m.instructions ?? "",
        boundaries: m.boundaries ?? "", builtin: false, look: people[m.id] ?? {},
      });
    }
    return list;
  };

  const saveLook = (id, look) => {
    if (!look) return;
    const people = readJson(PEOPLE_FILE, {});
    people[id] = look;
    writeJson(PEOPLE_FILE, people);
  };

  return async (req, res, urlPath) => {
    try {
      if (urlPath === "/api/soul") {
        if (req.method === "GET") {
          const data = await dashFetch("/api/profiles/default/soul");
          return send(res, 200, { content: data.content ?? "", exists: Boolean(data.exists) });
        }
        if (req.method === "PUT") {
          const body = await readBody(req);
          const content = typeof body.content === "string" ? body.content : "";
          if (!content.trim()) throw new BadRequest("SOUL.md tidak boleh kosong");
          if (content.length > 20000) throw new BadRequest("SOUL.md maksimal 20000 karakter");
          await dashFetch("/api/profiles/default/soul", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          return send(res, 200, { ok: true });
        }
        return send(res, 405, { error: "method tidak didukung" });
      }

      if (urlPath === "/api/agents") {
        if (req.method === "GET") return send(res, 200, { orchestratorId: team.ORCHESTRATOR_ID, agents: roster() });
        if (req.method === "POST") {
          const body = await readBody(req);
          const persona = cleanPersona(body, { requireName: true });
          const id = body.id ? String(body.id).trim().toLowerCase() : slugify(persona.name);
          if (!ID_RE.test(id)) throw new BadRequest("id hanya huruf kecil, angka, dan tanda -, 2 sampai 40 karakter");
          const members = readJson(TEAM_FILE, []);
          if (id === team.ORCHESTRATOR_ID || members.some((m) => m && m.id === id)) {
            return send(res, 409, { error: `id "${id}" sudah dipakai` });
          }
          const look = cleanLook(body.look);
          const member = { id, ...persona };
          if (!member.boundaries) delete member.boundaries;
          members.push(member);
          writeJson(TEAM_FILE, members);
          saveLook(id, look);
          team.upsert(member);
          return send(res, 201, { ok: true, id });
        }
        return send(res, 405, { error: "method tidak didukung" });
      }

      const m = /^\/api\/agents\/([a-z0-9-]+)$/.exec(urlPath);
      if (m) {
        const id = m[1];
        const members = readJson(TEAM_FILE, []);
        const index = members.findIndex((x) => x && x.id === id);
        const isOrchestrator = id === team.ORCHESTRATOR_ID;
        if (!isOrchestrator && index < 0) return send(res, 404, { error: "agen tidak ditemukan" });

        if (req.method === "PUT") {
          const body = await readBody(req);
          const look = cleanLook(body.look);
          if (!isOrchestrator) {
            const persona = cleanPersona(body, { requireName: true });
            const member = { ...members[index], ...persona };
            if (!member.boundaries) delete member.boundaries;
            members[index] = member;
            writeJson(TEAM_FILE, members);
            saveLook(id, look);
            team.upsert(member);
          } else {
            saveLook(id, look);
          }
          return send(res, 200, { ok: true });
        }
        if (req.method === "DELETE") {
          if (isOrchestrator) throw new BadRequest("orkestrator Hermes tidak bisa dihapus");
          members.splice(index, 1);
          writeJson(TEAM_FILE, members);
          const people = readJson(PEOPLE_FILE, {});
          if (people[id]) {
            delete people[id];
            writeJson(PEOPLE_FILE, people);
          }
          team.remove(id);
          return send(res, 200, { ok: true });
        }
        return send(res, 405, { error: "method tidak didukung" });
      }

      return send(res, 404, { error: "tidak ditemukan" });
    } catch (err) {
      if (err instanceof BadRequest) return send(res, 400, { error: err.message });
      console.warn("[agents-api]", err.message);
      return send(res, 502, { error: err.message || "gagal" });
    }
  };
};

module.exports = { createAgentsApi, PEOPLE_FILE };
