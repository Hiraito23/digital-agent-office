"use strict";
// Serves the pixel office and proxies /ws to the Hermes adapter, which runs
// in this same process and only listens on 127.0.0.1.
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const adapter = require("./hermes-gateway-adapter.js");
const { createAgentsApi, PEOPLE_FILE } = require("./agents-api.js");

const handleAgentsApi = createAgentsApi(adapter);

const PORT = Number(process.env.PORT || 3000);
const ADAPTER_PORT = Number(process.env.HERMES_ADAPTER_PORT || 18789);
const ROOT = path.join(__dirname, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".json": "application/json; charset=utf-8" };

// three.js is served from node_modules so the office works without a CDN.
const THREE_ROOT = path.join(__dirname, "node_modules", "three");

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath.startsWith("/api/")) {
    handleAgentsApi(req, res, urlPath);
    return;
  }
  // Looks and voices live in config/ (editable from the agent panel).
  if (urlPath === "/people.json") {
    fs.readFile(PEOPLE_FILE, (err, data) => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
      res.end(err ? "{}" : data);
    });
    return;
  }
  // Page routes such as /office serve the app; only paths with an extension are files.
  const isPage = urlPath === "/" || !path.extname(urlPath);
  const isVendor = urlPath.startsWith("/vendor/three/");
  const base = isVendor ? THREE_ROOT : ROOT;
  const rel = isVendor ? urlPath.slice("/vendor/three/".length) : isPage ? "index.html" : urlPath;
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base)) {
    res.writeHead(403).end();
    return;
  }
  // Audio is streamed with Range support so long tracks start quickly and can seek.
  if (path.extname(file) === ".mp3") {
    fs.stat(file, (err, stat) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
        return;
      }
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      let start = 0;
      let end = stat.size - 1;
      if (m) {
        if (m[1] === "" && m[2] !== "") start = Math.max(0, stat.size - Number(m[2]));
        else {
          start = Number(m[1] || 0);
          if (m[2] !== "") end = Math.min(end, Number(m[2]));
        }
        if (start > end || start >= stat.size) {
          res.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
          return;
        }
      }
      res.writeHead(m ? 206 : 200, {
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        ...(m ? { "Content-Range": `bytes ${start}-${end}/${stat.size}` } : {}),
      });
      fs.createReadStream(file, { start, end }).pipe(res);
    });
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
});

server.on("upgrade", (req, socket, head) => {
  if (!(req.url || "").startsWith("/ws")) {
    socket.destroy();
    return;
  }
  const upstream = net.connect(ADAPTER_PORT, "127.0.0.1", () => {
    let raw = "GET / HTTP/1.1\r\n";
    for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    upstream.write(`${raw}\r\n`);
    if (head && head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[pixel-office] http://localhost:${PORT} (ws -> 127.0.0.1:${ADAPTER_PORT})`);
});
