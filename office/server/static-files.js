"use strict";
// Static files for the browser: the office UI (public/), three.js from
// node_modules (so no CDN is needed) and MP3s streamed with HTTP Range support
// so long tracks start quickly and can seek.
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const THREE_DIR = path.join(__dirname, "..", "node_modules", "three");
const THREE_PREFIX = "/vendor/three/";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
};

const notFound = (res) => res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");

// URL path -> file on disk. Page routes without an extension (/, /office) get
// index.html. Returns null when the path tries to escape its folder.
const resolveFile = (urlPath) => {
  const isVendor = urlPath.startsWith(THREE_PREFIX);
  const base = isVendor ? THREE_DIR : PUBLIC_DIR;
  const isPage = urlPath === "/" || !path.extname(urlPath);
  const relative = isVendor ? urlPath.slice(THREE_PREFIX.length) : isPage ? "index.html" : urlPath;
  const file = path.normalize(path.join(base, relative));
  return file.startsWith(base) ? file : null;
};

// Stream an MP3, honouring "Range: bytes=start-end" requests from <audio>.
const streamAudio = (req, res, file) => {
  fs.stat(file, (err, stat) => {
    if (err) return notFound(res);
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    let start = 0;
    let end = stat.size - 1;
    if (range) {
      if (range[1] === "" && range[2] !== "") {
        start = Math.max(0, stat.size - Number(range[2])); // "bytes=-500": last 500 bytes
      } else {
        start = Number(range[1] || 0);
        if (range[2] !== "") end = Math.min(end, Number(range[2]));
      }
      if (start > end || start >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
        return;
      }
    }
    res.writeHead(range ? 206 : 200, {
      "Content-Type": CONTENT_TYPES[".mp3"],
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${stat.size}` } : {}),
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  });
};

const serveStatic = (req, res, urlPath) => {
  const file = resolveFile(urlPath);
  if (!file) {
    res.writeHead(403).end();
    return;
  }
  if (path.extname(file) === ".mp3") {
    streamAudio(req, res, file);
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) return notFound(res);
    res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
};

module.exports = { serveStatic };
