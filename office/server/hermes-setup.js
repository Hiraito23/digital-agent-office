"use strict";
// Keeps Hermes pointed at the office team: registers the office's MCP server (team-mcp.js)
// in Hermes through its dashboard API. It runs at startup and then every few minutes, so it
// also fixes things when Hermes was recreated or started later than the office, and a fresh
// clone needs no manual `hermes mcp add`.
const NAME = "office-team";
const DASHBOARD_URL = (process.env.HERMES_DASHBOARD_URL || "http://hermes:9119").replace(/\/$/, "");
const MCP_URL = process.env.TEAM_MCP_URL || "http://office:3000/mcp";

let cookies = "";

const login = async () => {
  if (!process.env.DASH_USER || !process.env.DASH_PASS) throw new Error("DASH_USER/DASH_PASS belum diatur");
  const res = await fetch(`${DASHBOARD_URL}/auth/password-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "basic", username: process.env.DASH_USER, password: process.env.DASH_PASS, next: "" }),
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`login dashboard gagal (${res.status})`);
  cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
};

const call = async (path, init = {}, retry = true) => {
  if (!cookies) await login();
  const res = await fetch(`${DASHBOARD_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}), Cookie: cookies },
    signal: AbortSignal.timeout(10000),
  });
  if ((res.status === 401 || res.status === 403) && retry) { cookies = ""; return call(path, init, false); }
  if (!res.ok) throw new Error(`dashboard Hermes menjawab ${res.status} untuk ${path}`);
  return res.json().catch(() => ({}));
};

// Registers the server unless Hermes already lists it with the right URL. Returns true if it changed something.
const ensureRegistered = async (key) => {
  const list = await call("/api/mcp/servers");
  const servers = Array.isArray(list) ? list : list.servers ?? [];
  const current = servers.find((s) => (s.name ?? s.id) === NAME);
  if (current && (current.url ?? "") === MCP_URL && current.enabled !== false) return false;
  if (current) await call(`/api/mcp/servers/${encodeURIComponent(NAME)}`, { method: "DELETE" }).catch(() => {});
  await call("/api/mcp/servers", { method: "POST", body: JSON.stringify({ name: NAME, url: MCP_URL, auth: "header", bearer_token: key }) });
  return true;
};

const startHermesSetup = ({ key, log = console }) => {
  if (!key) { log.warn("[hermes-setup] API key kosong: MCP tim tidak didaftarkan"); return; }
  let announced = false;
  const tick = async () => {
    try {
      const changed = await ensureRegistered(key);
      if (changed || !announced) log.log(`[hermes-setup] MCP "${NAME}" ${changed ? "didaftarkan" : "sudah terdaftar"} di Hermes (${MCP_URL})`);
      announced = true;
    } catch (err) {
      announced = false;
      log.warn(`[hermes-setup] ${err.message}`);
    }
  };
  setTimeout(tick, 4000);
  setInterval(tick, 5 * 60 * 1000).unref?.();
};

module.exports = { startHermesSetup };
