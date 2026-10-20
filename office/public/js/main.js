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
import { initEdgeColor } from "./ui/edge-color.js";
import { initMeeting } from "./ui/meeting.js";
import { initUsage } from "./ui/usage.js";
import { initFiles } from "./ui/files.js";
import { initSettings } from "./ui/settings.js";
import { initAttach, splitAttachments, withAttachments } from "./ui/attach.js";
import { initLayoutEditor, loadLayout } from "./ui/layout-editor.js";
import { initEnvironmentControls } from "./ui/environment-controls.js";
import { setNews, setFacts } from "./world/chatter.js";

const jukebox = initJukebox();

const view = document.getElementById("view");
const tagsEl = document.getElementById("tags");
const rosterEl = document.getElementById("roster");
const connEl = document.getElementById("conn");
const activityEl = document.getElementById("activity");
const chatEl = document.getElementById("chat");
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const pixelBtn = document.getElementById("pixel-toggle");
const attach = initAttach({}); // 📎 files from the workspace as context for the next message

// Panels below the header follow its real height (it wraps into more rows on narrow screens).
const topBar = document.querySelector(".top");
const syncTopHeight = () => document.documentElement.style.setProperty("--top-h", `${topBar.offsetHeight}px`);
new ResizeObserver(syncTopHeight).observe(topBar);
syncTopHeight();

// Office name from OFFICE_NAME in .env (header, browser tab and the neon sign on the wall).
const officeName = await fetch("/api/config", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})).then((c) => c.name).catch(() => null) || "Agentic Digital Office";
document.title = officeName;
document.querySelector(".top .title").textContent = officeName.toUpperCase();

const world = new World(view, { layout: await loadLayout(), name: officeName });
// 🛠 Layout: move, rotate, add and delete furniture (build mode).
const layoutEditor = initLayoutEditor({ world, canvas: view });
// 🌦 Sky: time of day and weather buttons.
initEnvironmentControls({ world });

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
    if (removed && selected === removed) selected = null;
    ensureSelected();
    if (removed) chats.delete(removed);
  },
});
window.addEventListener("resize", () => world.resize());

// 🎥 Sorot: the camera looks at agents who are talking to each other (smooth ease in and out).
const followBtn = document.getElementById("follow-toggle");
let follow = true;
try { follow = localStorage.getItem("kantor-hermes-follow") !== "0"; } catch { /* ignore */ }
const renderFollow = () => {
  world.followEnabled = follow;
  followBtn.textContent = follow ? "🎥 Sorot" : "🎥 Manual";
  followBtn.classList.toggle("playing", follow);
};
renderFollow();
followBtn.addEventListener("click", () => {
  follow = !follow;
  renderFollow();
  try { localStorage.setItem("kantor-hermes-follow", follow ? "1" : "0"); } catch { /* ignore */ }
});

// ⚙ Pengaturan: one button with a pop-up for every menu and the view options
initSettings({ world });

// 🏢 Floor tabs: one storey at a time (Lantai 1 first), or all three stacked.
const levelTabs = document.getElementById("level-tabs");
const renderLevelTabs = () => {
  for (const b of levelTabs.querySelectorAll("button")) {
    const l = b.dataset.level === "all" ? null : Number(b.dataset.level);
    b.classList.toggle("active", l === world.viewLevel);
  }
};
renderLevelTabs();
levelTabs.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-level]");
  if (b) world.setViewLevel(b.dataset.level === "all" ? null : Number(b.dataset.level));
});
window.addEventListener("levelchange", renderLevelTabs);

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
  if (down && !layoutEditor.isActive() && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) {
    const agent = world.hitTest(e.clientX, e.clientY);
    if (agent) openChat(agent.id);
  }
  down = null;
});

window.__world = world; // handy for inspecting the office from the browser console
const nameTags = new NameTags(tagsEl);
window.__nameTags = nameTags; // handy for inspecting the name tags from the browser console
const say = (agentId, text, ms) => nameTags.say(agentId, text, ms);
// idle small talk between agents: bubbles above their heads and lines in the Kantor tab
world.onSay = say;
world.onChatter = ({ from, to, text, news }) => {
  addOfficeLine({ kind: "talk", from, to, text, news });
  voice.speak(from, text); // agent to agent: spoken (if 🔊 Suara is on)
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
  nameTags.render(world.tagPositions((a) => nameTags.isWorking(a.id) || a.speaking));
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

// ---------------------------------------------------------------------------
// Gateway wiring: roster, activity feed, chat
// ---------------------------------------------------------------------------

const gw = new Gateway(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
window.__gw = gw; // handy for inspecting the connection from the browser console
const agentsById = new Map();
const status = new Map();
const chats = new Map(); // agentId -> [{role, content}]
const liveRuns = new Map(); // runId -> { agentId, text }
const historyLoaded = new Set(); // agents whose saved chat history is in `chats`
let selected = null;

const nameOf = (id) => agentsById.get(id)?.name ?? id;
const hhmm = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

// 📜 Log tab of the chat box: system lines, oldest first, the newest at the bottom.
const logActivity = (text, kind = "") => {
  const stick = activityEl.scrollHeight - activityEl.scrollTop - activityEl.clientHeight < 40;
  const li = document.createElement("li");
  li.className = `sys ${kind}`;
  li.innerHTML = `<span class="t">${hhmm()}</span>${escapeHtml(text)}`;
  activityEl.append(li);
  while (activityEl.children.length > 80) activityEl.firstChild.remove();
  if (stick) activityEl.scrollTop = activityEl.scrollHeight;
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
  renderTargets();
  ensureSelected();
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
        nameTags.startTask(r.agentId, r.startedAt ? Date.now() - r.startedAt : 0);
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
    nameTags.startTask(agentId);
    logActivity(`${nameOf(agentId)} sedang mengerjakan tugas`);
  }
  if (p.state === "delta") {
    run.text = text;
    if (text && text !== "…") say(agentId, text, 8000);
  } else if (p.state === "final") {
    liveRuns.delete(p.runId);
    nameTags.setTool(agentId, null);
    nameTags.endTask(agentId, true);
    setAgentStatus(agentId, "done");
    say(agentId, text || "Selesai!", 7000); // replies to you are shown, never read aloud (voices are for agents talking to each other)
    // a reply from someone you are not talking to now shows up in the Kantor tab like a whisper
    if (selected !== agentId) addOfficeLine({ kind: "whisper", from: agentId, text: plainText(text).slice(0, 160) || "Selesai!", onClick: () => openChat(agentId) });
    logActivity(`${nameOf(agentId)} selesai — ${text.replace(/\s+/g, " ").slice(0, 60) || "tugas selesai"}`, "ok");
    pushChat(agentId, { role: "assistant", content: text }, p.runId);
  } else if (p.state === "error" || p.state === "aborted") {
    liveRuns.delete(p.runId);
    nameTags.setTool(agentId, null);
    if (p.state === "error") nameTags.endTask(agentId, false);
    else nameTags.cancelTask(agentId);
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
    nameTags.taskStep(agentId, tool);
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
  // "Lanjutkan ke Hermes": the saved minutes become an attachment and the chat gets a suggested task
  onContinue: async (m) => {
    await openChat("hermes");
    setTab("pesan");
    const err = m.savedTo ? await attach.add(m.savedTo) : "Notulen belum tersimpan sebagai berkas";
    if (err) logActivity(`Lampiran gagal: ${err}`, "err");
    chatInput.value = `Lanjutkan hasil rapat "${String(m.topic).slice(0, 80)}" ke tahap berikutnya. Ubah keputusan dan action item di notulen menjadi lembar kerja: tabel tugas per agen (siapa, tugas, output yang diharapkan, tenggat, ketergantungan). Simpan lembar kerja sebagai berkas .md di folder rapat/, lalu delegasikan tugasnya ke agen yang sesuai.`;
    autosize();
    chatInput.focus();
  },
  roleOf: (id) => agentsById.get(id)?.role ?? "",
  agents: () => [...agentsById.values()],
  getProject: () => document.getElementById("project-select").value || null,
});

// 📊 Pemakaian: token usage per agent and model (daily / weekly / monthly).
initUsage({ agents: () => [...agentsById.values()], nameOf });

// 📂 Berkas: browse, open and download what the agents saved in the workspace folder.
initFiles({ getProject: () => document.getElementById("project-select").value || null });

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

// --- chat box (MMORPG style, bottom-left) -------------------------------------
// Tabs: Pesan (the conversation with the agent chosen in the select), Kantor (small talk
// between agents and replies from agents you are not talking to) and Log (system lines).

const PALETTE = ["#ff9ec7", "#74c0fc", "#8ce99a", "#ffd43b", "#ffa94d", "#b197fc", "#63e6be", "#ff8787"];
const colorOf = (id) => {
  if (id === "hermes") return "#ffd86b";
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
const clockOf = (ms) => (ms ? new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "");

const chatTarget = document.getElementById("chat-target");
const kantorLog = document.getElementById("kantor-log");
const tabButtons = [...document.querySelectorAll(".mmo-tab")];
const logPanes = { pesan: chatLog, kantor: kantorLog, log: activityEl };
const COLLAPSED_KEY = "kantor-hermes-chat-collapsed";
let tab = "pesan";

const scrollEnd = (el) => { el.scrollTop = el.scrollHeight; };
const nearEnd = (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 40;

const setTab = (name) => {
  tab = name;
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  for (const [key, el] of Object.entries(logPanes)) el.classList.toggle("hidden", key !== name);
  chatEl.classList.toggle("kantor-mode", name === "kantor"); // attachments are for messages to one agent
  chatInput.placeholder = name === "kantor" ? "Ngobrol di kantor, salah satu agen akan menjawab…  (sebut nama untuk memilih)" : "Tulis pesan atau tugas…  (Enter = kirim)";
  scrollEnd(logPanes[name]);
};
tabButtons.forEach((b) => b.addEventListener("click", () => { setTab(b.dataset.tab); if (b.dataset.tab !== "log") chatInput.focus(); }));

// A line in the Kantor tab: kind "talk" (agent to agent) or "whisper" (a reply for you).
const initialOf = (id) => escapeHtml(String(nameOf(id)).charAt(0).toUpperCase());
const avatar = (id) => `<div class="avatar" style="background:${colorOf(id)}">${initialOf(id)}</div>`;
let lastTalker = null;
let talkSide = "left";
const officeContext = []; // the last lines of the Kantor channel, sent along when you write there
const rememberLine = (from, text) => {
  officeContext.push({ from, text });
  while (officeContext.length > 14) officeContext.shift();
};

// A bubble in the Kantor tab. kind: "talk" (agent to agent), "whisper" (a reply for you from an
// agent you are not chatting with), "me" (you, in the Kantor channel), "reply" (the agent that
// answered you there) or "error". news: { icon, name } shows where a topic came from.
const addOfficeLine = ({ kind, from, to, text, news, onClick }) => {
  const stick = nearEnd(kantorLog);
  const el = document.createElement("div");
  // a chat between two agents alternates sides, like a messenger
  if (kind === "talk" && from !== lastTalker) talkSide = talkSide === "left" ? "right" : "left";
  if (kind === "talk") lastTalker = from;
  const side = kind === "me" ? "right" : kind === "talk" ? talkSide : "left";
  el.className = `msg office ${kind} ${side}`;
  const source = news ? `<div class="src">${escapeHtml(news.icon)} ${escapeHtml(news.name)}</div>` : "";
  const stamp = `<span class="t">${clockOf(Date.now())}</span>`;
  if (kind === "me") {
    el.innerHTML = `<div class="bub"><div class="meta"><b>Anda</b> <span class="to">➜ kantor</span></div><div class="txt">${escapeHtml(text)}</div>${stamp}</div>`;
  } else {
    const target = kind === "whisper" || kind === "reply" ? "Anda" : escapeHtml(nameOf(to));
    el.innerHTML = `${avatar(from)}<div class="bub"><div class="meta"><b style="color:${colorOf(from)}">${escapeHtml(nameOf(from))}</b> <span class="to">${kind === "error" ? "" : `➜ ${target}`}</span></div>`
      + `<div class="txt">${escapeHtml(text)}</div>${source}${stamp}</div>`;
  }
  if (onClick) { el.classList.add("clickable"); el.title = "Buka percakapan"; el.onclick = () => { onClick(); }; }
  if (kind === "talk" || kind === "reply") rememberLine(nameOf(from), text);
  else if (kind === "me") rememberLine("Pengguna", text);
  kantorLog.append(el);
  while (kantorLog.children.length > 120) kantorLog.firstChild.remove();
  if (stick || kind === "me") scrollEnd(kantorLog);
};

// The Kantor tab is an office channel: what you write there is answered by ONE agent. It is the
// one you name (Kenji, @Kenji), else the last one who spoke there, else any agent who is not busy.
const regexEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pickResponder = (text) => {
  const agents = [...agentsById.values()];
  if (!agents.length) return null;
  const named = agents.find((a) => new RegExp(`(^|[^\\p{L}])@?${regexEscape(a.name)}(?=$|[^\\p{L}])`, "iu").test(text));
  if (named) return named.id;
  const free = agents.filter((a) => !nameTags.isWorking(a.id));
  const pool = free.length ? free : agents;
  if (lastTalker && pool.some((a) => a.id === lastTalker) && Math.random() < 0.6) return lastTalker;
  return pool[Math.floor(Math.random() * pool.length)].id;
};

const showTyping = (id) => {
  const el = document.createElement("div");
  el.className = "msg office reply left typing";
  el.innerHTML = `${avatar(id)}<div class="bub"><div class="meta"><b style="color:${colorOf(id)}">${escapeHtml(nameOf(id))}</b></div><div class="txt dots"><i></i><i></i><i></i></div></div>`;
  kantorLog.append(el);
  scrollEnd(kantorLog);
  return el;
};

const sendOfficeMessage = async (text) => {
  const context = officeContext.slice();
  addOfficeLine({ kind: "me", text });
  const id = pickResponder(text);
  if (!id) { addOfficeLine({ kind: "error", from: "hermes", text: "Belum ada agen yang bisa menjawab." }); return; }
  const typing = showTyping(id);
  try {
    const res = await fetch("/api/office-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent_id: id, message: text, context }) });
    const data = await res.json().catch(() => ({}));
    typing.remove();
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    addOfficeLine({ kind: "reply", from: id, text: data.text });
    say(id, data.text, 8000);
  } catch (err) {
    typing.remove();
    addOfficeLine({ kind: "error", from: id, text: `Tidak bisa menjawab: ${err.message}` });
  }
};

const renderTargets = () => {
  chatTarget.innerHTML = [...agentsById.values()]
    .map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}${a.role ? ` · ${escapeHtml(a.role)}` : ""}</option>`).join("");
  if (selected && agentsById.has(selected)) chatTarget.value = selected;
};

// The chat box always has someone to talk to: Hermes unless he is gone.
const ensureSelected = () => {
  if (selected && agentsById.has(selected)) return;
  selected = null;
  const first = agentsById.has("hermes") ? "hermes" : agentsById.keys().next().value;
  if (first) openChat(first, null, { quiet: true });
};

const pushChat = (agentId, msg, runId) => {
  if (!chats.has(agentId)) chats.set(agentId, []);
  const list = chats.get(agentId);
  if (runId) {
    const idx = list.findIndex((m) => m.runId === runId);
    if (idx >= 0) list.splice(idx, 1);
  }
  list.push({ ...msg, at: msg.at ?? Date.now(), runId: undefined });
  if (selected === agentId) renderChat();
};

const renderLiveRun = (runId, text) => {
  const list = chats.get(selected) || [];
  const existing = list.find((m) => m.runId === runId);
  if (existing) existing.content = text;
  else list.push({ role: "assistant", content: text, runId, at: Date.now() });
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

// Chat bubbles: yours on the right, the agent's on the left with a coloured avatar.
const chatLine = (m) => {
  const t = `<span class="t">${clockOf(m.at)}</span>`;
  const name = escapeHtml(nameOf(selected));
  if (m.role === "user") {
    const { text, files } = splitAttachments(m.content); // attached files show as names, not their whole text
    const chips = files.length ? `<div class="att-line">${files.map((f) => `<span class="att-chip">📎 ${escapeHtml(f.split("/").pop())}</span>`).join("")}</div>` : "";
    return `<div class="msg user"><div class="bub"><div class="meta"><b>Anda</b> <span class="to">➜ ${name}</span></div><div class="txt">${escapeHtml(text)}</div>${chips}${t}</div></div>`;
  }
  if (m.role === "error") return `<div class="msg error">${avatar(selected)}<div class="bub"><div class="meta"><b>⚠ ${name}</b></div><div class="txt">${escapeHtml(m.content)}</div>${t}</div></div>`;
  return `<div class="msg assistant">${avatar(selected)}<div class="bub"><div class="meta"><b style="color:${colorOf(selected)}">${name}</b></div><div class="txt">${escapeHtml(m.content || "…")}</div>${t}</div></div>`;
};

// focus (optional): a summary entry; the chat scrolls to that reply and highlights it.
const renderChat = (focus = null) => {
  const list = chats.get(selected) || [];
  chatLog.innerHTML = list.length
    ? list.map(chatLine).join("")
    : `<p class="muted">Belum ada percakapan dengan ${escapeHtml(nameOf(selected))}. Tulis pesan pertama di bawah!</p>`;
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

// quiet: select the agent without opening the tab or taking the keyboard focus
const openChat = async (agentId, focus = null, { quiet = false } = {}) => {
  selected = agentId;
  chatTarget.value = agentId;
  const a = agentsById.get(agentId);
  voiceTestBtn.title = `Suara ${a?.name ?? agentId}: ${voice.describe(agentId)}`;
  if (!quiet) {
    chatEl.classList.remove("collapsed");
    try { localStorage.setItem(COLLAPSED_KEY, "0"); } catch { /* ignore */ }
    setTab("pesan");
  }
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
  if (selected !== agentId) return; // the target changed while the history was loading
  renderChat(focus);
  if (!focus && !quiet) chatInput.focus();
};

chatTarget.addEventListener("change", () => { if (agentsById.has(chatTarget.value)) openChat(chatTarget.value); });

voiceTestBtn.onclick = () => {
  if (!selected) return;
  const a = agentsById.get(selected);
  voice.speak(selected, `Halo, saya ${a?.name ?? selected}${a?.role ? `, ${a.role}` : ""}. Siap membantu!`, { force: true });
};

// Make the chat box taller or shorter by dragging its top edge (double-click: default height).
// The height is remembered per browser.
const SIZE_KEY = "kantor-hermes-chat-height";
const rootEl = document.documentElement;
try {
  const saved = Number(localStorage.getItem(SIZE_KEY));
  if (saved) rootEl.style.setProperty("--chat-h", `${saved}px`);
} catch { /* ignore */ }
const resizeHandle = chatEl.querySelector(".mmo-resize");
resizeHandle.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  try { resizeHandle.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
  const move = (ev) => {
    const h = Math.round(Math.min(window.innerHeight * 0.8, Math.max(150, window.innerHeight - ev.clientY - 12)));
    rootEl.style.setProperty("--chat-h", `${h}px`);
  };
  const up = () => {
    resizeHandle.removeEventListener("pointermove", move);
    resizeHandle.removeEventListener("pointerup", up);
    try { localStorage.setItem(SIZE_KEY, String(Math.round(chatEl.getBoundingClientRect().height))); } catch { /* ignore */ }
  };
  resizeHandle.addEventListener("pointermove", move);
  resizeHandle.addEventListener("pointerup", up);
});
resizeHandle.addEventListener("dblclick", () => {
  rootEl.style.removeProperty("--chat-h");
  try { localStorage.removeItem(SIZE_KEY); } catch { /* ignore */ }
});

// The message box grows with the text (up to a few lines)
const autosize = () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 110)}px`;
};
chatInput.addEventListener("input", autosize);

initEdgeColor({ button: document.getElementById("edge-color") });

// Minimise / restore (remembered per browser)
const applyCollapsed = (on) => {
  chatEl.classList.toggle("collapsed", on);
  document.getElementById("chat-min").textContent = on ? "+" : "–";
  document.body.classList.toggle("chat-collapsed", on);
};
try { applyCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1"); } catch { applyCollapsed(false); }
document.getElementById("chat-min").onclick = () => {
  const on = !chatEl.classList.contains("collapsed");
  applyCollapsed(on);
  try { localStorage.setItem(COLLAPSED_KEY, on ? "1" : "0"); } catch { /* ignore */ }
};

// Delete every saved message: all agents' chats, the summaries list, the Kantor and Log tabs.
document.getElementById("chat-clear").onclick = async () => {
  if (!confirm("Hapus SEMUA pesan semua agen, ringkasan, dan log? Tindakan ini tidak bisa dibatalkan.")) return;
  try {
    const res = await gw.request("chat.clearAll", {});
    chats.clear();
    historyLoaded.clear();
    kantorLog.innerHTML = "";
    activityEl.innerHTML = "";
    summaryPanel.load();
    if (selected) await openChat(selected, null, { quiet: true });
    logActivity(`Semua pesan dihapus (${res?.cleared ?? 0} pesan)`);
  } catch (err) {
    logActivity(`Gagal menghapus pesan: ${err?.message ?? err}`, "err");
  }
};

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  const attached = tab === "kantor" ? [] : attach.files(); // attachments go with messages to one agent
  if (!text && !attached.length) return;
  if (tab === "kantor") { // the office channel: one agent answers
    chatInput.value = "";
    autosize();
    sendOfficeMessage(text);
    return;
  }
  if (!selected || !gw.connected) return;
  chatInput.value = "";
  autosize();
  if (tab !== "pesan") setTab("pesan");
  const message = withAttachments(text || "Pelajari berkas terlampir, lalu beri tanggapan dan langkah berikutnya.", attached);
  attach.clear();
  pushChat(selected, { role: "user", content: message });
  logActivity(`Anda memberi tugas ke ${nameOf(selected)}${attached.length ? ` (dengan ${attached.length} berkas)` : ""}`);
  try {
    await gw.request("chat.send", { sessionKey: sessionKeyFor(selected), message, idempotencyKey: `po-${Date.now()}` });
  } catch (err) {
    pushChat(selected, { role: "error", content: String(err.message || err) });
  }
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  } else if (e.key === "Tab" && tab === "pesan") { // like whispering in an MMO: Tab cycles through the agents
    e.preventDefault();
    const ids = [...agentsById.keys()];
    if (!ids.length) return;
    const step = e.shiftKey ? -1 : 1;
    openChat(ids[(Math.max(0, ids.indexOf(selected)) + step + ids.length) % ids.length]);
  }
});

// Enter anywhere starts typing in the chat box
window.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey || layoutEditor.isActive()) return;
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
  e.preventDefault();
  chatEl.classList.remove("collapsed");
  applyCollapsed(false);
  if (tab === "log") setTab("pesan");
  chatInput.focus();
});

// 📁 project picker: tell the team which folder to work in
initProjectPicker({
  onChange: ({ name, path, error }) => {
    if (error) logActivity(`Proyek: ${error}`, "err");
    else if (name) logActivity(`Proyek aktif: ${name} (${path}); tim bekerja di branch agent/...`, "ok");
    else logActivity("Tidak ada proyek aktif");
  },
});

// Trending headlines for the agents' small talk (server/news.js caches them for 30 minutes).
const loadNews = () => fetch("/api/news", { cache: "no-store" })
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => { if (data?.items?.length) setNews(data.items); })
  .catch(() => {});
loadNews();
setInterval(loadNews, 30 * 60 * 1000);

// Interesting facts from Wikipedia (server/facts.js keeps a growing pool; a sample comes here).
const loadFacts = () => fetch("/api/facts?limit=250", { cache: "no-store" })
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => { if (data?.items?.length) setFacts(data.items); })
  .catch(() => {});
loadFacts();
setInterval(loadFacts, 20 * 60 * 1000);

gw.start();
