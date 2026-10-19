"use strict";
// Office server (one Node process inside the `office` container).
//
//   browser ──HTTP──▶ /api/projects  projects.js     (📁 project picker)
//                     /api/layout   layout-api.js   (🛠 saved furniture layout)
//                     /mcp          team-mcp.js     (MCP server: Hermes delegates to the office agents)
//                     /api/facts    facts.js        (Wikipedia facts for the agents' small talk)
//                     /api/office-chat office-chat.js (the Kantor tab: one agent answers the user)
//                     /api/files    files-api.js    (📂 browse and download the agents' files)
//                     /api/news     news.js         (trending headlines for the agents' small talk)
//                     /api/usage    usage.js        (📊 token usage per agent and model)
//                     /api/config   office name from .env (OFFICE_NAME)
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
const { createNewsApi } = require("./news.js");
const { createTeamMcp } = require("./team-mcp.js");
const { createFactsApi } = require("./facts.js");
const { createFilesApi } = require("./files-api.js");
const { createOfficeChatApi } = require("./office-chat.js");
const { startHermesSetup } = require("./hermes-setup.js");
const { serveStatic } = require("./static-files.js");
const { attachWsProxy } = require("./ws-proxy.js");

const PORT = Number(process.env.PORT || 3000);
// Name shown in the header, the browser tab and the neon sign (OFFICE_NAME in .env).
const OFFICE_NAME = (process.env.OFFICE_NAME || "").trim().slice(0, 40) || "Agentic Digital Office";
const ADAPTER_PORT = Number(process.env.HERMES_ADAPTER_PORT || 18789);

const handleAgentsApi = createAgentsApi(adapter);
const handleProjectsApi = createProjectsApi(adapter);
// Hermes reaches the office team through this MCP server (team_delegate, ...); see team-mcp.js
const API_KEY = process.env.HERMES_API_KEY || process.env.API_SERVER_KEY || "";
const handleMcp = createTeamMcp({ api: adapter.teamApi, authKey: API_KEY });
startHermesSetup({ key: API_KEY });
const handleNewsApi = createNewsApi();
const handleFilesApi = createFilesApi(); // 📂 Berkas: browse and download what the agents saved in /workspace
const handleFactsApi = createFactsApi(); // interesting facts from Wikipedia for the agents' small talk
const handleOfficeChatApi = createOfficeChatApi({ officeChat: adapter.officeChat }); // the Kantor tab of the chat box // trending headlines for the agents' small talk
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
  if (urlPath === "/api/files" || urlPath.startsWith("/api/files/")) return handleFilesApi(req, res, urlPath);
  if (urlPath === "/api/config" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(JSON.stringify({ name: OFFICE_NAME }));
  }
  if (urlPath === "/api/news") return handleNewsApi(req, res);
  if (urlPath === "/api/facts") return handleFactsApi(req, res);
  if (urlPath === "/api/office-chat") return handleOfficeChatApi(req, res);
  if (urlPath === "/mcp") return handleMcp(req, res);
  if (urlPath.startsWith("/api/")) return handleAgentsApi(req, res, urlPath);
  if (urlPath === "/people.json") return servePeople(res);
  return serveStatic(req, res, urlPath);
});

attachWsProxy(server, ADAPTER_PORT);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[office] http://localhost:${PORT} (ws -> 127.0.0.1:${ADAPTER_PORT})`);
});
