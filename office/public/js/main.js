import { World } from "./world3d.js";
import { Gateway, sessionKeyFor, agentIdFromSession } from "./net.js";
import { initJukebox } from "./jukebox.js";
import { VoiceBox } from "./voice.js";
import { initAgentPanel } from "./agents-panel.js";

const jukebox = initJukebox();

const view = document.getElementById("view");
const tagsEl = document.getElementById("tags");
const rosterEl = document.getElementById("roster");
const connEl = document.getElementById("conn");
const activityEl = document.getElementById("activity");
const chatEl = document.getElementById("chat");
const chatLog = document.getElementById("chat-log");
const chatName = document.getElementById("chat-name");
const chatRole = document.getElementById("chat-role");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const pixelBtn = document.getElementById("pixel-toggle");

const world = new World(view);

// Voices: each agent reads its finished replies aloud (people.json → "voice").
const voiceBtn = document.getElementById("voice-toggle");
const voiceTestBtn = document.getElementById("voice-test");
const voice = new VoiceBox({
  onStart: (id) => { world.setSpeaking(id, true); jukebox.duck(true); },
  onEnd: (id) => { world.setSpeaking(id, false); jukebox.duck(false); },
});
let voiceHintShown = false;
const renderVoiceBtn = () => {
  voiceBtn.textContent = voice.enabled ? "🔊 Suara" : "🔇 Suara";
  voiceBtn.classList.toggle("playing", voice.enabled);
};
if (!voice.supported) voiceBtn.hidden = true;
renderVoiceBtn();
voiceBtn.addEventListener("click", () => {
  voice.setEnabled(!voice.enabled);
  renderVoiceBtn();
});

// Looks + voices from config/people.json (also reloaded after edits in the ⚙ Agen panel).
const reloadLooks = () => fetch("/people.json", { cache: "no-cache" })
  .then((res) => (res.ok ? res.json() : {}))
  .then((map) => {
    world.setAppearances(map);
    voice.setConfigs(Object.fromEntries(Object.entries(map).map(([id, look]) => [id, look.voice ?? {}])));
  })
  .catch(() => {});
reloadLooks();

initAgentPanel({
  voice,
  onChanged: async ({ removed } = {}) => {
    await reloadLooks();
    if (gw.connected) await refreshAgents().catch(() => {});
    if (removed && selected === removed) {
      chatEl.classList.add("hidden");
      selected = null;
    }
    if (removed) chats.delete(removed);
  },
});
window.addEventListener("resize", () => world.resize());

// Pixel look toggle (HD / Pixel / Retro), remembered per browser.
let pixelMode = 1;
try { pixelMode = Number(localStorage.getItem("kantor-hermes-pixel") ?? 1); } catch { /* ignore */ }
pixelBtn.textContent = `▦ ${world.setPixelMode(pixelMode)}`;
pixelBtn.addEventListener("click", () => {
  pixelMode = (pixelMode + 1) % 3;
  pixelBtn.textContent = `▦ ${world.setPixelMode(pixelMode)}`;
  try { localStorage.setItem("kantor-hermes-pixel", String(pixelMode)); } catch { /* ignore */ }
});

// Orbit controls handle drag/zoom; a click without dragging selects a person.
let down = null;
view.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
view.addEventListener("pointerup", (e) => {
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) {
    const agent = world.hitTest(e.clientX, e.clientY);
    if (agent) openChat(agent.id);
  }
  down = null;
});

// ---------------------------------------------------------------------------
// Name tags and speech bubbles (DOM, so text stays sharp)
// ---------------------------------------------------------------------------

const tagNodes = new Map();
const bubbles = new Map(); // agentId -> { text, until }

const renderTags = (tags) => {
  const seen = new Set();
  for (const { agent, x, y } of tags) {
    seen.add(agent.id);
    let node = tagNodes.get(agent.id);
    if (!node) {
      node = { tag: document.createElement("div"), bubble: document.createElement("div") };
      node.tag.className = `tag${agent.isMain ? " main" : ""}`;
      node.bubble.className = "bubble";
      tagsEl.append(node.tag, node.bubble);
      tagNodes.set(agent.id, node);
    }
    const label = `${agent.name}<span class="role">${agent.role || ""}</span>`;
    if (node.tag.innerHTML !== label) node.tag.innerHTML = label;
    node.tag.classList.toggle("speaking", Boolean(agent.speaking));
    const left = x;
    const top = y - 4;
    node.tag.style.left = `${left}px`;
    node.tag.style.top = `${top}px`;
    const b = bubbles.get(agent.id);
    if (b && b.until > performance.now()) {
      if (node.bubble.textContent !== b.text) node.bubble.textContent = b.text;
      node.bubble.style.display = "block";
      node.bubble.style.left = `${left}px`;
      node.bubble.style.top = `${top - 26}px`;
    } else {
      node.bubble.style.display = "none";
    }
  }
  for (const [id, node] of tagNodes) {
    if (seen.has(id)) continue;
    node.tag.remove();
    node.bubble.remove();
    tagNodes.delete(id);
  }
};

const say = (agentId, text, ms = 6000) => {
  const clean = text.replace(/```[\s\S]*?```/g, "[kode]").replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return;
  bubbles.set(agentId, { text: clean.length > 110 ? `${clean.slice(0, 109)}…` : clean, until: performance.now() + ms });
};

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let last = performance.now();
const frame = (now) => {
  const dt = Math.min(100, now - last);
  last = now;
  world.update(dt, now);
  world.render();
  renderTags(world.tagPositions());
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

// ---------------------------------------------------------------------------
// Gateway wiring: roster, activity feed, chat
// ---------------------------------------------------------------------------

const gw = new Gateway(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
const agentsById = new Map();
const status = new Map();
const chats = new Map(); // agentId -> [{role, content}]
const liveRuns = new Map(); // runId -> { agentId, text }
let selected = null;

const nameOf = (id) => agentsById.get(id)?.name ?? id;
const hhmm = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const activities = [];
const logActivity = (text, kind = "") => {
  activities.unshift({ time: hhmm(), text, kind });
  activities.length = Math.min(activities.length, 30);
  activityEl.innerHTML = activities.slice(0, 5)
    .map((a) => `<li><span class="time">${a.time}</span><span class="${a.kind}">${escapeHtml(a.text)}</span></li>`)
    .join("");
};

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const renderRoster = () => {
  rosterEl.innerHTML = "";
  for (const a of agentsById.values()) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.innerHTML = `<span class="dot ${status.get(a.id) || ""}"></span>${escapeHtml(a.name)}`;
    chip.onclick = () => openChat(a.id);
    rosterEl.append(chip);
  }
};

const setAgentStatus = (id, value) => {
  status.set(id, value);
  world.setStatus(id, value);
  renderRoster();
};

const refreshAgents = async () => {
  const res = await gw.request("agents.list");
  agentsById.clear();
  for (const a of res.agents || []) agentsById.set(a.id, { id: a.id, name: a.name, role: a.role || "" });
  world.syncAgents([...agentsById.values()]);
  renderRoster();
};

gw.addEventListener("status", async (e) => {
  const on = e.detail.connected;
  connEl.className = `conn ${on ? "on" : "off"}`;
  connEl.textContent = on ? "● Terhubung" : "● Terputus";
  if (on) {
    await refreshAgents();
    logActivity(`Kantor terhubung — ${agentsById.size} agen hadir`, "ok");
    if (voice.supported && !voiceHintShown) {
      voiceHintShown = true;
      voice.whenReady().then(() => {
        if (!voice.hasLanguage("id")) logActivity("Suara Indonesia tidak ditemukan: buka kantor di Microsoft Edge, atau pasang paket suara Indonesia di Windows", "err");
      });
    }
  }
});

gw.addEventListener("presence", () => {
  refreshAgents().catch(() => {});
});

gw.addEventListener("chat", (e) => {
  const p = e.detail;
  const agentId = agentIdFromSession(p.sessionKey);
  const text = typeof p.message?.content === "string" ? p.message.content : "";
  let run = liveRuns.get(p.runId);
  if (!run) {
    run = { agentId, text: "" };
    liveRuns.set(p.runId, run);
    setAgentStatus(agentId, "working");
    logActivity(`${nameOf(agentId)} sedang mengerjakan tugas`);
  }
  if (p.state === "delta") {
    run.text = text;
    if (text && text !== "…") say(agentId, text, 8000);
  } else if (p.state === "final") {
    liveRuns.delete(p.runId);
    setAgentStatus(agentId, "done");
    say(agentId, text || "Selesai!", 7000);
    voice.speak(agentId, text);
    logActivity(`${nameOf(agentId)} selesai — ${text.replace(/\s+/g, " ").slice(0, 60) || "tugas selesai"}`, "ok");
    pushChat(agentId, { role: "assistant", content: text }, p.runId);
  } else if (p.state === "error" || p.state === "aborted") {
    liveRuns.delete(p.runId);
    setAgentStatus(agentId, p.state === "error" ? "error" : "idle");
    const msg = p.errorMessage || "dibatalkan";
    say(agentId, `⚠ ${msg}`, 8000);
    logActivity(`${nameOf(agentId)} gagal: ${msg.slice(0, 70)}`, "err");
    pushChat(agentId, { role: "error", content: msg }, p.runId);
  }
  if (selected === agentId && p.state === "delta") renderLiveRun(p.runId, text);
});

// --- chat panel -------------------------------------------------------------

const pushChat = (agentId, msg, runId) => {
  if (!chats.has(agentId)) chats.set(agentId, []);
  const list = chats.get(agentId);
  if (runId) {
    const idx = list.findIndex((m) => m.runId === runId);
    if (idx >= 0) list.splice(idx, 1);
  }
  list.push({ ...msg, runId: undefined });
  if (selected === agentId) renderChat();
};

const renderLiveRun = (runId, text) => {
  const list = chats.get(selected) || [];
  const existing = list.find((m) => m.runId === runId);
  if (existing) existing.content = text;
  else list.push({ role: "assistant", content: text, runId });
  chats.set(selected, list);
  renderChat();
};

const renderChat = () => {
  const list = chats.get(selected) || [];
  chatLog.innerHTML = list.length
    ? list.map((m) => `<div class="msg ${m.role}">${escapeHtml(m.content || "…")}</div>`).join("")
    : `<p class="muted">Belum ada percakapan. Kirim tugas pertama!</p>`;
  chatLog.scrollTop = chatLog.scrollHeight;
};

const openChat = async (agentId) => {
  selected = agentId;
  const a = agentsById.get(agentId);
  chatName.textContent = a?.name ?? agentId;
  chatRole.textContent = a?.role || (agentId === "hermes" ? "Orchestrator" : "");
  voiceTestBtn.title = `Suara: ${voice.describe(agentId)}`;
  chatEl.classList.remove("hidden");
  if (!chats.has(agentId) && gw.connected) {
    try {
      const res = await gw.request("chat.history", { sessionKey: sessionKeyFor(agentId) });
      chats.set(agentId, (res.messages || []).filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: String(m.content ?? "") })));
    } catch {
      chats.set(agentId, []);
    }
  }
  renderChat();
  chatInput.focus();
};

voiceTestBtn.onclick = () => {
  if (!selected) return;
  const a = agentsById.get(selected);
  voice.speak(selected, `Halo, saya ${a?.name ?? selected}${a?.role ? `, ${a.role}` : ""}. Siap membantu!`, { force: true });
};

document.getElementById("chat-close").onclick = () => {
  chatEl.classList.add("hidden");
  selected = null;
};

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !selected || !gw.connected) return;
  chatInput.value = "";
  pushChat(selected, { role: "user", content: text });
  logActivity(`Anda memberi tugas ke ${nameOf(selected)}`);
  try {
    await gw.request("chat.send", { sessionKey: sessionKeyFor(selected), message: text, idempotencyKey: `po-${Date.now()}` });
  } catch (err) {
    pushChat(selected, { role: "error", content: String(err.message || err) });
  }
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

gw.start();
