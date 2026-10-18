// Entry point of the office UI. It wires the pieces together:
//   world/      3D scene, camera and agent movement (World)
//   net/        WebSocket client for the Hermes gateway (Gateway)
//   ui/         name tags, agent panel, project picker, approvals, jukebox and voices
// and owns the app state shared between them: roster, agent status,
// chat history per agent and the activity feed.
import { World } from "./world/world.js";
import { Gateway, sessionKeyFor, agentIdFromSession } from "./net/gateway.js";
import { initJukebox } from "./ui/jukebox.js";
import { VoiceBox } from "./ui/voice.js";
import { NameTags } from "./ui/name-tags.js";
import { initAgentPanel } from "./ui/agents-panel.js";
import { initProjectPicker } from "./ui/projects.js";
import { initApprovals } from "./ui/approvals.js";
import { initSummaries } from "./ui/summaries.js";
import { initMeeting } from "./ui/meeting.js";
import { initUsage } from "./ui/usage.js";

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
  loadToolsets: () => gw.request("tools.catalog"),
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

const nameTags = new NameTags(tagsEl);
const say = (agentId, text, ms) => nameTags.say(agentId, text, ms);

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let last = performance.now();
const frame = (now) => {
  const dt = Math.min(100, now - last);
  last = now;
  world.update(dt, now);
  world.render();
  nameTags.render(world.tagPositions());
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
const historyLoaded = new Set(); // agents whose saved chat history is in `chats`
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
    historyLoaded.clear();
    await refreshAgents();
    logActivity(`Kantor terhubung — ${agentsById.size} agen hadir`, "ok");
    summaryPanel.load();
    // Replies still running on the server (for example after a page refresh).
    gw.request("chat.active").then((res) => {
      for (const r of res.runs || []) {
        if (liveRuns.has(r.runId)) continue;
        liveRuns.set(r.runId, { agentId: r.agentId, text: "" });
        setAgentStatus(r.agentId, "working");
      }
    }).catch(() => {});
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
    nameTags.setTool(agentId, null);
    setAgentStatus(agentId, "done");
    say(agentId, text || "Selesai!", 7000);
    voice.speak(agentId, text);
    logActivity(`${nameOf(agentId)} selesai — ${text.replace(/\s+/g, " ").slice(0, 60) || "tugas selesai"}`, "ok");
    pushChat(agentId, { role: "assistant", content: text }, p.runId);
  } else if (p.state === "error" || p.state === "aborted") {
    liveRuns.delete(p.runId);
    nameTags.setTool(agentId, null);
    setAgentStatus(agentId, p.state === "error" ? "error" : "idle");
    const msg = p.errorMessage || "dibatalkan";
    say(agentId, `⚠ ${msg}`, 8000);
    logActivity(`${nameOf(agentId)} gagal: ${msg.slice(0, 70)}`, "err");
    pushChat(agentId, { role: "error", content: msg }, p.runId);
  }
  if (selected === agentId && p.state === "delta") renderLiveRun(p.runId, text);
});

// Hermes tools (terminal, file, web, browser, ...) run inside the hermes
// container; the adapter reports each one so the office can show it.
gw.addEventListener("tool", (e) => {
  const { agentId, tool, emoji, label, status: state } = e.detail;
  if (state === "running") {
    nameTags.setTool(agentId, emoji);
    const detail = label && label !== tool ? `: ${label.replace(/\s+/g, " ").slice(0, 70)}` : "";
    say(agentId, `${emoji} ${label || tool}`, 6000);
    logActivity(`${nameOf(agentId)} ${emoji} ${tool}${detail}`);
  } else {
    nameTags.setTool(agentId, null);
  }
});

// 📋 RINGKASAN (left): a short summary each time an agent finishes a reply.
const summaryPanel = initSummaries({ gw, nameOf, onOpen: (entry) => openChat(entry.agentId, entry) });

// 💬 Rapat: team meetings in the meeting room, closed with minutes by Hermes.
initMeeting({
  gw, world, nameOf, say, voice, logActivity,
  roleOf: (id) => agentsById.get(id)?.role ?? "",
  agents: () => [...agentsById.values()],
  getProject: () => document.getElementById("project-select").value || null,
});

// 📊 Pemakaian: token usage per agent and model (daily / weekly / monthly).
initUsage({ agents: () => [...agentsById.values()], nameOf });

// PERSETUJUAN: risky commands wait here for your answer.
initApprovals({
  gw,
  nameOf,
  onRequest: (a) => {
    say(a.agentId, "⚠ Menunggu persetujuan Anda", 10000);
    logActivity(`${nameOf(a.agentId)} menunggu persetujuan: ${(a.command || a.description).slice(0, 60)}`, "err");
  },
  onResolved: (a, choice, err) => {
    if (err) logActivity(`Persetujuan gagal: ${err.message}`, "err");
    else logActivity(`Anda ${choice === "deny" ? "menolak" : "mengizinkan"} perintah ${nameOf(a?.agentId)}`, choice === "deny" ? "" : "ok");
  },
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

// Plain text for matching a summary to its reply (same cleanup as server/summaries.js).
const plainText = (s) => String(s || "").replace(/```[\s\S]*?```/g, " [kode] ").replace(/`([^`]*)`/g, "$1")
  .replace(/^#+\s*/gm, "").replace(/[*_>|]/g, "").replace(/\s+/g, " ").trim();

// The message a 📋 RINGKASAN entry is about: by its time, its place in the
// history, or (older entries) the start of the summary text.
const findMessage = (list, focus) => {
  let i = focus.msgAt ? list.findIndex((m) => m.at === focus.msgAt) : -1;
  if (i < 0 && Number.isInteger(focus.msgIndex)) i = list.findIndex((m) => m.i === focus.msgIndex);
  if (i < 0 && focus.summary) {
    const head = plainText(focus.summary).replace(/…$/, "").slice(0, 60);
    i = list.findLastIndex((m) => m.role !== "user" && plainText(m.content).includes(head));
  }
  return i;
};

// focus (optional): a summary entry; the chat scrolls to that reply and highlights it.
const renderChat = (focus = null) => {
  const list = chats.get(selected) || [];
  chatLog.innerHTML = list.length
    ? list.map((m) => `<div class="msg ${m.role}">${escapeHtml(m.content || "…")}</div>`).join("")
    : `<p class="muted">Belum ada percakapan. Kirim tugas pertama!</p>`;
  const target = focus ? chatLog.children[findMessage(list, focus)] : null;
  if (!target) {
    chatLog.scrollTop = chatLog.scrollHeight;
    return;
  }
  target.classList.add("focused");
  const question = target.previousElementSibling?.classList.contains("user") ? target.previousElementSibling : null;
  question?.classList.add("focused-question");
  (question ?? target).scrollIntoView({ block: "start" });
  setTimeout(() => { target.classList.remove("focused"); question?.classList.remove("focused-question"); }, 4000);
};

const openChat = async (agentId, focus = null) => {
  selected = agentId;
  const a = agentsById.get(agentId);
  chatName.textContent = a?.name ?? agentId;
  chatRole.textContent = a?.role || (agentId === "hermes" ? "Orchestrator" : "");
  voiceTestBtn.title = `Suara: ${voice.describe(agentId)}`;
  chatEl.classList.remove("hidden");
  // The server keeps the history (it survives refreshes); load it once per
  // connection and keep any reply that is still streaming on top of it.
  if (!historyLoaded.has(agentId) && gw.connected) {
    try {
      const res = await gw.request("chat.history", { sessionKey: sessionKeyFor(agentId) });
      // i = position in the server history, at = when it was saved (summaries point at these)
      const saved = (res.messages || [])
        .map((m, i) => ({ ...m, i }))
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.error ? "error" : m.role, content: String(m.content ?? ""), at: m.at ?? null, i: m.i }));
      const live = (chats.get(agentId) || []).filter((m) => m.runId && liveRuns.has(m.runId));
      chats.set(agentId, [...saved, ...live]);
      historyLoaded.add(agentId);
    } catch {
      if (!chats.has(agentId)) chats.set(agentId, []);
    }
  }
  renderChat(focus);
  if (!focus) chatInput.focus();
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

// 📁 project picker: tell the team which folder to work in
initProjectPicker({
  onChange: ({ name, path, error }) => {
    if (error) logActivity(`Proyek: ${error}`, "err");
    else if (name) logActivity(`Proyek aktif: ${name} (${path}); tim bekerja di branch agent/...`, "ok");
    else logActivity("Tidak ada proyek aktif");
  },
});

gw.start();
