"use strict";
// Saved furniture layout of the office (🛠 Layout editor).
//   GET    /api/layout   { items: [...] | null }   null = nobody changed the default layout yet
//   PUT    /api/layout   { items: [...] }          save the whole layout
//   DELETE /api/layout                             back to the default layout
// Stored in config/layout.json (next to team.json / people.json). The item types are
// checked by the browser against its catalog (public/js/office/furniture.js); here only
// the shape and ranges are validated.
const fs = require("fs");
const path = require("path");

const MAX_ITEMS = 300;
const TYPE_RE = /^[a-z][a-z0-9-]{0,29}$/;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

const send = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 262144) { reject(new Error("data terlalu besar")); req.destroy(); }
    });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("JSON tidak valid")); } });
    req.on("error", reject);
  });

const cleanItems = (raw) => {
  if (!Array.isArray(raw) || raw.length > MAX_ITEMS) throw new Error(`items harus berupa daftar (maks. ${MAX_ITEMS})`);
  const seen = new Set();
  return raw.map((i, n) => {
    const where = `benda ke-${n + 1}`;
    if (!i || typeof i !== "object") throw new Error(`${where} tidak valid`);
    if (typeof i.type !== "string" || !TYPE_RE.test(i.type)) throw new Error(`${where}: jenis tidak valid`);
    if (typeof i.id !== "string" || !ID_RE.test(i.id) || seen.has(i.id)) throw new Error(`${where}: id tidak valid atau kembar`);
    seen.add(i.id);
    if (![i.x, i.z].every((v) => Number.isFinite(v) && v >= -5 && v <= 60)) throw new Error(`${where}: posisi di luar jangkauan`);
    if (!Number.isInteger(i.rot) || i.rot < 0 || i.rot > 3) throw new Error(`${where}: rotasi harus 0 sampai 3`);
    const out = { id: i.id, type: i.type, x: Math.round(i.x * 1000) / 1000, z: Math.round(i.z * 1000) / 1000, rot: i.rot };
    if (i.variant !== undefined) {
      if (!Number.isInteger(i.variant) || i.variant < 0 || i.variant > 50) throw new Error(`${where}: varian tidak valid`);
      out.variant = i.variant;
    }
    return out;
  });
};

const createLayoutApi = ({ file }) => async (req, res) => {
  try {
    if (req.method === "GET") {
      let items = null;
      let version = null;
      try {
        const saved = JSON.parse(fs.readFileSync(file, "utf8"));
        items = saved.items ?? null;
        version = saved.version ?? 1;
      } catch { /* no saved layout */ }
      return send(res, 200, { items, version });
    }
    if (req.method === "PUT") {
      const body = await readBody(req);
      const items = cleanItems(body.items);
      const version = Number.isInteger(body.version) && body.version > 0 ? body.version : 1;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify({ version, items }, null, 2)}\n`);
      fs.renameSync(tmp, file);
      return send(res, 200, { ok: true, count: items.length });
    }
    if (req.method === "DELETE") {
      fs.rmSync(file, { force: true });
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: "method tidak didukung" });
  } catch (err) {
    return send(res, 400, { error: err.message || "gagal" });
  }
};

module.exports = { createLayoutApi };
