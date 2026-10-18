"use strict";
// Office server (one Node process inside the `office` container).
//
//   browser ──HTTP──▶ /api/projects  projects.js     (📁 project picker)
//                     /api/layout   layout-api.js   (🛠 saved furniture layout)
//                     /api/usage    usage.js        (📊 token usage per agent and model)
//                     /api/*        agents-api.js   (agent panel, SOUL.md)
//                     /people.json  config/people.json (looks + voices)
//                     everything else  static-files.js (UI, three.js, MP3)
//   browser ──WS────▶ /ws  ─▶ ws-proxy.js ─▶ hermes-gateway-adapter.js ─▶ Hermes API
//
// The adapter is started by requiring it; it listens on 127.0.0.1 only.
const fs = require("fs");
const http = require("http");
const path = require("path");

const adapter = require("./hermes-gateway-adapter.js");
const { createAgentsApi, PEOPLE_FILE } = require("./agents-api.js");
const { createProjectsApi } = require("./projects.js");
const { createLayoutApi } = require("./layout-api.js");
const { serveStatic } = require("./static-files.js");
const { attachWsProxy } = require("./ws-proxy.js");

const PORT = Number(process.env.PORT || 3000);
const ADAPTER_PORT = Number(process.env.HERMES_ADAPTER_PORT || 18789);

const handleAgentsApi = createAgentsApi(adapter);
const handleProjectsApi = createProjectsApi(adapter);
// Furniture layout from the 🛠 Layout editor, saved next to people.json in config/.
const handleLayoutApi = createLayoutApi({ file: process.env.LAYOUT_FILE || path.join(path.dirname(PEOPLE_FILE), "layout.json") });

// Looks and voices live in config/ (editable from the agent panel).
const servePeople = (res) => {
  fs.readFile(PEOPLE_FILE, (err, data) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
    res.end(err ? "{}" : data);
  });
};

const serveUsage = (req, res) => {
  const range = new URL(req.url, "http://x").searchParams.get("range") || "daily";
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(adapter.usage.report(range)));
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/api/usage" && req.method === "GET") return serveUsage(req, res);
  if (urlPath.startsWith("/api/projects")) return handleProjectsApi(req, res, urlPath);
  if (urlPath === "/api/layout") return handleLayoutApi(req, res);
  if (urlPath.startsWith("/api/")) return handleAgentsApi(req, res, urlPath);
  if (urlPath === "/people.json") return servePeople(res);
  return serveStatic(req, res, urlPath);
});

attachWsProxy(server, ADAPTER_PORT);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[office] http://localhost:${PORT} (ws -> 127.0.0.1:${ADAPTER_PORT})`);
});
