"use strict";
// 📂 Berkas: browse, open and download what the agents saved in the workspace folder
// (the host's PROJECTS_DIR, mounted as /workspace).
//   GET /api/files?path=<rel>             folder listing
//   GET /api/files/raw?path=<rel>         open a file in the browser (?download=1 to save it)
//   GET /api/files/zip?path=<rel>         a folder as a .zip
// Paths are relative to the workspace and can never leave it (symlinks included).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = process.env.WORKSPACE_DIR || "/workspace";
const HIDDEN = new Set([".git", "node_modules", ".DS_Store", "Thumbs.db"]);
const MAX_ZIP = 150 * 1024 * 1024;

const TYPES = {
  html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript", json: "application/json",
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", ico: "image/x-icon",
  pdf: "application/pdf", csv: "text/csv", mp3: "audio/mpeg", mp4: "video/mp4", woff2: "font/woff2",
};
const TEXTY = new Set(["md", "txt", "ts", "tsx", "jsx", "py", "yml", "yaml", "sql", "sh", "log", "env", "xml", "toml", "ini", "cfg", "conf", "gitignore", "dockerfile"]);

// the real path of a request path, or null when it escapes the workspace
const resolveInside = (rel) => {
  try {
    const base = fs.realpathSync(ROOT);
    const full = fs.realpathSync(path.resolve(base, `.${path.sep}${String(rel || "").replace(/\\/g, "/")}`));
    return full === base || full.startsWith(base + path.sep) ? { full, base } : null;
  } catch {
    return null;
  }
};

const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

// ---- minimal zip writer (deflate), enough for a folder of project files
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i += 1) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zipFolder(dir, rootName) {
  const files = [];
  let total = 0;
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (HIDDEN.has(e.name) || e.isSymbolicLink()) continue;
      const full = path.join(d, e.name);
      const name = `${rel}${e.name}`;
      if (e.isDirectory()) walk(full, `${name}/`);
      else if (e.isFile()) {
        total += fs.statSync(full).size;
        if (total > MAX_ZIP) throw new Error("Folder terlalu besar untuk di-zip (maks. 150 MB)");
        files.push({ name, full });
      }
    }
  };
  walk(dir, `${rootName}/`);
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const data = fs.readFileSync(f.full);
    const comp = zlib.deflateRawSync(data);
    const name = Buffer.from(f.name, "utf8");
    const crc = crc32(data);
    const st = fs.statSync(f.full).mtime;
    const time = (st.getHours() << 11) | (st.getMinutes() << 5) | (st.getSeconds() >> 1);
    const date = ((st.getFullYear() - 1980) << 9) | ((st.getMonth() + 1) << 5) | st.getDate();
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    parts.push(local, name, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(time, 12); c.writeUInt16LE(date, 14); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += local.length + name.length + comp.length;
  }
  const cdSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...central, end]);
}

const createFilesApi = () => (req, res, urlPath) => {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  const url = new URL(req.url, "http://x");
  const rel = url.searchParams.get("path") || "";
  const hit = resolveInside(rel);
  if (!hit) return json(res, 404, { error: "Folder atau file tidak ditemukan di workspace" });
  let stat;
  try { stat = fs.statSync(hit.full); } catch { return json(res, 404, { error: "Tidak ditemukan" }); }
  const relOut = path.relative(hit.base, hit.full).split(path.sep).join("/");

  if (urlPath === "/api/files") {
    if (!stat.isDirectory()) return json(res, 400, { error: "Bukan folder" });
    const entries = [];
    for (const e of fs.readdirSync(hit.full, { withFileTypes: true })) {
      if (HIDDEN.has(e.name) || (!e.isDirectory() && !e.isFile() && !e.isSymbolicLink())) continue;
      try {
        const s = fs.statSync(path.join(hit.full, e.name));
        entries.push({ name: e.name, dir: s.isDirectory(), size: s.isDirectory() ? 0 : s.size, mtime: s.mtimeMs });
      } catch { /* broken link */ }
    }
    entries.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, "id"));
    return json(res, 200, { path: relOut, entries });
  }

  if (urlPath === "/api/files/zip") {
    if (!stat.isDirectory()) return json(res, 400, { error: "Bukan folder" });
    try {
      const name = path.basename(hit.full === hit.base ? "workspace" : hit.full);
      const buf = zipFolder(hit.full, name);
      res.writeHead(200, { "Content-Type": "application/zip", "Content-Length": buf.length, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.zip`, "Cache-Control": "no-store" });
      return res.end(buf);
    } catch (err) {
      return json(res, 413, { error: err.message });
    }
  }

  if (urlPath === "/api/files/raw") {
    if (!stat.isFile()) return json(res, 400, { error: "Bukan file" });
    const ext = path.extname(hit.full).slice(1).toLowerCase();
    const type = TYPES[ext] || (TEXTY.has(ext) || !ext ? "text/plain" : "application/octet-stream");
    const download = url.searchParams.get("download") === "1";
    const headers = {
      "Content-Type": /^(text|application\/json)/.test(type) ? `${type}; charset=utf-8` : type,
      "Content-Length": stat.size,
      "Cache-Control": "no-store",
      // files written by agents are untrusted: scripts in them run in an isolated origin
      "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups allow-modals",
      "X-Content-Type-Options": "nosniff",
    };
    if (download) headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(hit.full))}`;
    res.writeHead(200, headers);
    return fs.createReadStream(hit.full).pipe(res);
  }
  return json(res, 404, { error: "Not found" });
};

module.exports = { createFilesApi };
