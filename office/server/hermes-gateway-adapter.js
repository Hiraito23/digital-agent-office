"use strict";
// Hermes gateway adapter from Claw3D (https://github.com/iamlukethedev/Claw3D),
// MIT License, Copyright (c) 2026 Luke The Dev. Modified: loads a persistent
// team from $HOME/.hermes/clawd3d-team.json at startup.

/**
 * Hermes Gateway Adapter — with multi-agent orchestration
 *
 * The main Hermes agent acts as an orchestrator and can:
 *   - spawn_agent(name, role, instructions, wipe, continuity, boundaries)
 *   - delegate_task(agent_id, message)
 *   - list_team()
 *   - configure_agent(agent_id, ...)
 *   - dismiss_agent(agent_id)
 *
 * Sub-agents appear as 3D characters in the office, each with their own
 * conversation history, system prompt, and settings.
 *
 * Environment variables:
 *   HERMES_API_URL        Hermes HTTP API base URL   (default: http://localhost:8642)
 *   HERMES_API_KEY        Bearer token for Hermes     (default: empty)
 *   HERMES_ADAPTER_PORT   WebSocket port              (default: 18789)
 *   HERMES_MODEL          Model identifier            (default: hermes)
 *   HERMES_AGENT_NAME     Display name in Claw3D UI   (default: Hermes)
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { createSummaries } = require("./summaries");
const { createMeetings } = require("./meetings");
const { createUsage } = require("./usage");
const { WebSocketServer } = require("ws");

function loadDotenvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadRuntimeEnv() {
  const cwd = process.cwd();
  loadDotenvFile(path.join(cwd, ".env.local"));
  loadDotenvFile(path.join(cwd, ".env"));
}

loadRuntimeEnv();

const HERMES_API_URL = (process.env.HERMES_API_URL || "http://localhost:8642").replace(/\/$/, "");
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";
const ADAPTER_PORT = parseInt(process.env.HERMES_ADAPTER_PORT || "18789", 10);
const HERMES_MODEL = process.env.HERMES_MODEL || "hermes";
const HERMES_AGENT_NAME = process.env.HERMES_AGENT_NAME || "Hermes";
const HOME = process.env.HOME || "/tmp";

const AGENT_ID = "hermes";
const MAIN_KEY = "main";
const MAIN_SESSION_KEY = `agent:${AGENT_ID}:${MAIN_KEY}`;
const CONFIG_PATH = `${HOME}/.hermes/config.json`;
const MAX_TOOL_ROUNDS = 8;

// ---------------------------------------------------------------------------
// Orchestrator system prompt
// ---------------------------------------------------------------------------

const ORCHESTRATOR_SYSTEM_PROMPT = `Kamu adalah ${HERMES_AGENT_NAME}, orkestrator tim di kantor virtual 3D. Anggota tim adalah agen kantor sungguhan (Haruto sales digital, Kenji analis saham, Sakura konten, Yui brainstorming, Takumi QA, Akane keamanan, Daichi riset pasar, dan lainnya) yang tampil sebagai karakter di kantor. Kamu menyuruh mereka dengan tool tim kantor (server MCP "office-team"):

- team_list: daftar anggota tim beserta agent_id-nya.
- team_delegate(agent_id, task, wait_seconds): beri tugas ke seorang anggota; hasilnya dikembalikan ke kamu.
- team_result(task_id): ambil hasil tugas yang belum selesai ketika team_delegate kembali.
- team_context(agent_id): baca percakapan terbaru anggota untuk tahu apa yang sedang ia kerjakan.

ATURAN PENTING:
1. Untuk menyuruh anggota tim SELALU panggil team_delegate. Jangan memakai delegate_task bawaan untuk itu (itu hanya membuat pembantu anonim yang tidak terlihat di kantor).
2. Jangan pernah bilang sudah mendelegasikan atau meminta seseorang kalau kamu belum benar-benar memanggil team_delegate di giliran ini. Pengguna melihat anggota itu bekerja di kantor, jadi klaim palsu langsung ketahuan.
3. Kalau pengguna menanyakan kenapa seseorang belum bekerja, cek dengan team_context dan, bila memang belum ada tugasnya, panggil team_delegate sekarang.
4. Panggil team_delegate LANGSUNG, satu panggilan per anggota (boleh beberapa panggilan berturut-turut). Jangan membungkus beberapa delegasi dalam tool_call/execute_code atau JSON besar, itu sering rusak. Jangan membuat folder atau file sendiri untuk tugas yang akan dikerjakan anggota tim; mereka menyimpan hasilnya sendiri di folder proyek.

Saat diberi tujuan: (1) tentukan peran yang dibutuhkan, (2) team_delegate ke tiap peran dengan tugas yang lengkap (tujuan, konteks, hasil yang diharapkan), (3) bila hasil belum selesai gunakan team_result, (4) rangkum hasilnya untuk pengguna. Jawab singkat; pekerjaan beratnya dilakukan anggota tim.`;

// ---------------------------------------------------------------------------
// Team management tools definition (OpenAI tool-calling format)
// ---------------------------------------------------------------------------

const TEAM_TOOLS = [
  {
    type: "function",
    function: {
      name: "spawn_agent",
      description: "Create a new sub-agent team member. Returns the agent's ID.",
      parameters: {
        type: "object",
        required: ["name", "role"],
        properties: {
          name: { type: "string", description: "Display name, e.g. 'Backend Dev'" },
          role: { type: "string", description: "Short role description, e.g. 'Python backend specialist'" },
          instructions: { type: "string", description: "System prompt / instructions for this agent" },
          wipe: { type: "boolean", description: "Clear history before each run (stateless). Default false." },
          continuity: { type: "boolean", description: "Maintain full conversation history. Default true." },
          boundaries: { type: "string", description: "Hard constraints on what this agent may do" },
          model: { type: "string", description: "Model to use. Defaults to hermes." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_task",
      description: "Send a task or question to a specific team member and get their response.",
      parameters: {
        type: "object",
        required: ["agent_id", "message"],
        properties: {
          agent_id: { type: "string", description: "ID returned by spawn_agent" },
          message: { type: "string", description: "The task, question, or instructions to send" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_team",
      description: "List all current team members with their IDs, names, and roles.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "configure_agent",
      description: "Update an existing agent's name, role/title, instructions, or settings.",
      parameters: {
        type: "object",
        required: ["agent_id"],
        properties: {
          agent_id: { type: "string" },
          name: { type: "string" },
          role: { type: "string", description: "Short role or title shown as subtitle below the agent name in the office (e.g. 'Marketing Chef', 'Code Reviewer')." },
          instructions: { type: "string" },
          wipe: { type: "boolean" },
          continuity: { type: "boolean" },
          boundaries: { type: "string" },
          model: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dismiss_agent",
      description: "Remove an agent from the team.",
      parameters: {
        type: "object",
        required: ["agent_id"],
        properties: {
          agent_id: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_agent_context",
      description: "Read the recent conversation history of another agent to understand what they are working on, what they have already done, or what their current status is. Useful for coordination and avoiding duplicate work.",
      parameters: {
        type: "object",
        required: ["agent_id"],
        properties: {
          agent_id: { type: "string", description: "ID of the agent whose context you want to read" },
          last_n: { type: "number", description: "How many recent messages to return (default 10, max 40)" },
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

/** @type {Map<string, Array<{role: string, content: string}>>} */
const conversationHistory = new Map();

/** @type {Map<string, {model?: string, thinkingLevel?: string}>} */
const sessionSettings = new Map();

/** @type {Map<string, string>} agentId/filename → content */
const agentFiles = new Map();

/** @type {Map<string, {runId: string, sessionKey: string, agentId: string, abort: () => void}>} runId → abort handle */
const activeRuns = new Map();

/** @type {Map<string, object>} jobId → CronJobSummary */
const cronJobs = new Map();

/**
 * @type {Map<string, {
 *   id: string, name: string, workspace: string,
 *   role?: string, systemPrompt?: string,
 *   settings: { wipe: boolean, continuity: boolean, model: string, boundaries?: string }
 * }>}
 */
const agentRegistry = new Map([
  [AGENT_ID, {
    id: AGENT_ID,
    name: HERMES_AGENT_NAME,
    workspace: `${HOME}/.hermes/workspace-hermes`,
    role: "Orchestrator",
    systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
    settings: { wipe: false, continuity: true, model: HERMES_MODEL },
  }],
]);

// Set of all active sendEvent functions (one per connected WS client)
/** @type {Set<(frame: object) => void>} */
const activeSendEventFns = new Set();

// ---------------------------------------------------------------------------
// Disk persistence for conversation history
// ---------------------------------------------------------------------------

const HISTORY_FILE = path.join(HOME, ".hermes", "clawd3d-history.json");
// 📋 RINGKASAN: one short summary per finished reply (server/summaries.js).
const summaries = createSummaries({ file: path.join(HOME, ".hermes", "office-summaries.json"), historyFile: HISTORY_FILE });

// 📊 Pemakaian: token usage per agent and model (server/usage.js).
const usage = createUsage({ file: path.join(HOME, ".hermes", "office-usage.json") });
let defaultModelCache = { name: "", at: 0 };
// Hermes' own "hermes-agent" is an alias for whatever model its config uses; record the real name.
async function actualModel(model) {
  if (model && model !== HERMES_MODEL) return model;
  if (defaultModelCache.name && Date.now() - defaultModelCache.at < 60_000) return defaultModelCache.name;
  try {
    const res = await fetch(`${process.env.HERMES_DASHBOARD_URL || "http://hermes:9119"}/api/model/info`);
    const info = res.ok ? await res.json() : null;
    if (info?.model) defaultModelCache = { name: info.model, at: Date.now() };
  } catch { /* keep the cached name */ }
  return defaultModelCache.name || HERMES_MODEL;
}
function recordUsage(agentId, result) {
  const u = result?.usage;
  if (!u) return;
  actualModel(result.model).then((model) => usage.record({ agentId, model, input: u.prompt_tokens, output: u.completion_tokens }));
}

function recordSummary(input) {
  const entry = summaries.add(input);
  if (entry) broadcastEvent({ type: "event", event: "summary", payload: entry });
}

// 💬 Rapat: team meetings in the meeting room (server/meetings.js).
const meetings = createMeetings({
  agentRegistry, orchestratorId: AGENT_ID, model: HERMES_MODEL, streamOneTurn, recordUsage,
  systemPromptFor: (agent) => withProjectContext(agent?.id === AGENT_ID ? `${agent.systemPrompt}${teamContext()}` : agent?.systemPrompt || ""),
  broadcast: broadcastEvent, forwarder: hermesEventForwarder, sanitize: sanitizeErrorMessage,
  onMinutes: (m, minutes) => {
    const at = Date.now();
    recordSummary({ agentId: AGENT_ID, kind: "meeting", task: m.topic, summary: minutes, msgAt: at });
    // Everyone who attended remembers the minutes in their own chat.
    for (const id of [AGENT_ID, ...m.participants]) {
      const history = getHistory(`agent:${id}:${MAIN_KEY}`);
      history.push({ role: "user", content: `[Rapat tim] ${m.topic}`, at: m.startedAt });
      history.push({ role: "assistant", content: `Notulen rapat:\n${minutes}`, at });
    }
    saveHistoryToDisk();
  },
});
let persistDebounceTimer = null;

function loadHistoryFromDisk() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, "utf8");
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        for (const [key, messages] of Object.entries(data)) {
          if (Array.isArray(messages)) conversationHistory.set(key, messages);
        }
        console.log(`[hermes-adapter] Loaded history for ${Object.keys(data).length} session(s).`);
      }
    }
  } catch (err) {
    console.warn("[hermes-adapter] Could not load history:", sanitizeErrorMessage(err));
  }
}

function saveHistoryToDisk() {
  if (persistDebounceTimer) clearTimeout(persistDebounceTimer);
  persistDebounceTimer = setTimeout(() => {
    try {
      const data = {};
      for (const [key, messages] of conversationHistory.entries()) {
        if (messages.length > 0) data[key] = messages;
      }
      fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.warn("[hermes-adapter] Could not save history:", sanitizeErrorMessage(err));
    }
  }, 500);
}

function getHistory(sessionKey) {
  if (!conversationHistory.has(sessionKey)) conversationHistory.set(sessionKey, []);
  return conversationHistory.get(sessionKey);
}

function clearHistory(sessionKey) {
  conversationHistory.delete(sessionKey);
  saveHistoryToDisk();
}

function randomId() {
  return require("crypto").randomBytes(8).toString("hex");
}

function redactSecrets(value) {
  if (typeof value !== "string" || !value) return value;
  let redacted = value;
  if (HERMES_API_KEY) {
    redacted = redacted.split(HERMES_API_KEY).join("[REDACTED]");
  }
  redacted = redacted.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]");
  redacted = redacted.replace(/\b\d{8,12}:[A-Za-z0-9_-]{20,}\b/g, "[REDACTED]");
  return redacted;
}

// ---------------------------------------------------------------------------
// Hermes HTTP API helpers
// ---------------------------------------------------------------------------

function hermesPost(path, body) {
  return new Promise((resolve, reject) => {
    const urlStr = HERMES_API_URL + path;
    let url;
    try { url = new URL(urlStr); } catch { reject(new Error(`Invalid URL: ${urlStr}`)); return; }
    const transport = url.protocol === "https:" ? https : http;
    const bodyStr = JSON.stringify(body);
    const headers = { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr) };
    if (HERMES_API_KEY) headers["Authorization"] = `Bearer ${HERMES_API_KEY}`;
    const req = transport.request(
      { hostname: url.hostname, port: url.port ? parseInt(url.port, 10) : (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + (url.search || ""), method: "POST", headers },
      resolve
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

function hermesGet(path) {
  return new Promise((resolve, reject) => {
    const urlStr = HERMES_API_URL + path;
    let url;
    try { url = new URL(urlStr); } catch { reject(new Error(`Invalid URL: ${urlStr}`)); return; }
    const transport = url.protocol === "https:" ? https : http;
    const headers = {};
    if (HERMES_API_KEY) headers["Authorization"] = `Bearer ${HERMES_API_KEY}`;
    const req = transport.request(
      { hostname: url.hostname, port: url.port ? parseInt(url.port, 10) : (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + (url.search || ""), method: "GET", headers },
      resolve
    );
    req.on("error", reject);
    req.end();
  });
}

async function readJsonBody(res) {
  const chunks = [];
  for await (const chunk of res) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function sanitizeErrorMessage(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return redactSecrets(error);
  return redactSecrets(error.message || String(error));
}

function extractOpenAiStyleError(payload, fallbackMessage) {
  if (payload && typeof payload === "object") {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message.trim()
        : "";
    if (message) return message;
  }
  return fallbackMessage;
}

let cachedHermesModels = null;
let cachedHermesModelsAt = 0;

async function fetchHermesModels() {
  const now = Date.now();
  if (cachedHermesModels && now - cachedHermesModelsAt < 30_000) {
    return cachedHermesModels;
  }
  const res = await hermesGet("/v1/models");
  if (res.statusCode >= 400) {
    res.resume();
    throw new Error(`Hermes models API HTTP ${res.statusCode}`);
  }
  const payload = await readJsonBody(res);
  const models = Array.isArray(payload?.data)
    ? payload.data
        .map((entry) => (typeof entry?.id === "string" ? entry.id.trim() : ""))
        .filter(Boolean)
    : [];
  cachedHermesModels = models;
  cachedHermesModelsAt = now;
  return models;
}

async function resolveHermesModel(requestedModel) {
  const trimmed = typeof requestedModel === "string" ? requestedModel.trim() : "";
  const normalized = trimmed.includes("/") ? trimmed.split("/").pop().trim() : trimmed;
  try {
    const models = await fetchHermesModels();
    if (models.length === 0) {
      return trimmed || HERMES_MODEL;
    }
    // An explicit per-agent model id (e.g. anthropic/claude-haiku-4.5) goes to Hermes as is; it
    // honors it because direct_model_requests is on. Only the "hermes-agent" alias is resolved here.
    if (trimmed && trimmed !== HERMES_MODEL && !models.includes(trimmed)) return trimmed;
    const candidates = [trimmed, normalized, HERMES_MODEL]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    for (const candidate of candidates) {
      const exact = models.find((modelId) => modelId === candidate);
      if (exact) return exact;
    }
    for (const candidate of candidates) {
      const suffix = models.find((modelId) => modelId.endsWith(`/${candidate}`));
      if (suffix) return suffix;
    }
    return models[0];
  } catch {
    return trimmed || HERMES_MODEL;
  }
}

async function completeOneTurn(messages, model, tools) {
  const resolvedModel = await resolveHermesModel(model);
  const body = { model: resolvedModel, messages, stream: false };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  const res = await hermesPost("/v1/chat/completions", body);
  const payload = await readJsonBody(res);
  if (res.statusCode >= 400) {
    throw new Error(
      extractOpenAiStyleError(payload, `Hermes API HTTP ${res.statusCode}`)
    );
  }
  const choice = Array.isArray(payload?.choices) ? payload.choices[0] : null;
  const message = choice?.message || {};
  const textContent =
    typeof message?.content === "string"
      ? message.content
      : Array.isArray(message?.content)
        ? message.content
            .map((part) => (typeof part?.text === "string" ? part.text : ""))
            .join("")
        : "";
  const finishReason =
    typeof choice?.finish_reason === "string" && choice.finish_reason
      ? choice.finish_reason
      : "stop";
  const toolCalls = Array.isArray(message?.tool_calls)
    ? message.tool_calls.map((tc) => {
        let args = {};
        const rawArgs = tc?.function?.arguments;
        if (typeof rawArgs === "string" && rawArgs.trim()) {
          try {
            args = JSON.parse(rawArgs);
          } catch {
            args = { _raw: rawArgs };
          }
        }
        return {
          id: typeof tc?.id === "string" ? tc.id : randomId(),
          name: typeof tc?.function?.name === "string" ? tc.function.name : "",
          args,
        };
      })
    : [];
  return { textContent, toolCalls, finishReason, resolvedModel, usage: payload?.usage || null, model: resolvedModel };
}

// ---------------------------------------------------------------------------
// SSE streaming — handles both text deltas and tool calls
// ---------------------------------------------------------------------------

/**
 * Stream one LLM turn.
 * @returns {{ textContent: string, toolCalls: Array<{id,name,args}>, finishReason: string }}
 */
// Hermes runs its own tools (terminal, file, web, ...) server-side and reports
// them as named SSE events next to the OpenAI chunks; onEvent receives those.
const HERMES_EVENTS = new Set(["hermes.tool.progress", "approval.request"]);
// Silence on the stream for this long = the provider stalled (tools report progress events meanwhile).
const STREAM_IDLE_MS = Number(process.env.HERMES_STREAM_IDLE_MS) || 180_000;

// Hermes may say the same interim sentence before every tool round ("Saya akan ..." three times):
// keep only one of identical paragraphs that follow each other.
function dedupeParagraphs(text) {
  const parts = String(text || "").split(/\n{2,}/);
  const out = [];
  for (const part of parts) {
    if (out.length && out[out.length - 1].trim() === part.trim()) continue;
    out.push(part);
  }
  return out.join("\n\n");
}

async function streamOneTurn(messages, model, tools, onTextDelta, abortCheck, onEvent, idleMs = STREAM_IDLE_MS) {
  const body = { model, messages, stream: true };
  if (tools && tools.length > 0) { body.tools = tools; body.tool_choice = "auto"; }

  const resolvedModel = await resolveHermesModel(model);
  body.model = resolvedModel;
  const res = await hermesPost("/v1/chat/completions", body);
  if (res.statusCode >= 400) {
    res.resume();
    throw new Error(`Hermes API HTTP ${res.statusCode}`);
  }
  // A provider that stops sending (free models sometimes stall) must not hang the run forever.
  res.setTimeout(idleMs, () => res.destroy(new Error(`model tidak merespons selama ${Math.round(idleMs / 1000)} detik (timeout)`)));

  let textContent = "";
  let finishReason = "stop";
  let usageInfo = null; // the last chunk carries prompt/completion token counts
  /** @type {Record<number, {id: string, name: string, argsStr: string}>} */
  const toolCallAccum = {};
  let buffer = "";
  let currentEvent = "";

  await new Promise((resolve, reject) => {
    res.on("data", (chunk) => {
      if (abortCheck && abortCheck()) { res.destroy(); return; }
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { currentEvent = ""; continue; }
        if (trimmed.startsWith("event:")) { currentEvent = trimmed.slice(6).trim(); continue; }
        if (trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        if (HERMES_EVENTS.has(currentEvent)) {
          try { if (onEvent) onEvent(currentEvent, JSON.parse(trimmed.slice(6))); } catch { /* ignore malformed */ }
          continue;
        }
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data?.usage) usageInfo = data.usage;
          const choice = data?.choices?.[0];
          if (!choice) continue;
          if (typeof choice.finish_reason === "string" && choice.finish_reason) {
            finishReason = choice.finish_reason;
          }
          const delta = choice.delta || {};
          // Text content
          if (typeof delta.content === "string" && delta.content) {
            textContent += delta.content;
            if (onTextDelta) onTextDelta(textContent);
          }
          // Tool call accumulation
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = typeof tc.index === "number" ? tc.index : 0;
              if (!toolCallAccum[idx]) toolCallAccum[idx] = { id: "", name: "", argsStr: "" };
              if (tc.id) toolCallAccum[idx].id = tc.id;
              if (tc.function?.name) toolCallAccum[idx].name += tc.function.name;
              if (tc.function?.arguments) toolCallAccum[idx].argsStr += tc.function.arguments;
            }
          }
        } catch { /* ignore malformed */ }
      }
    });
    res.on("end", resolve);
    res.on("close", resolve); // destroyed (aborted or timed out) without "end"
    res.on("error", reject);
  });

  textContent = dedupeParagraphs(textContent);
  const toolCalls = Object.values(toolCallAccum).map((tc) => {
    let args = {};
    try { args = JSON.parse(tc.argsStr); } catch { args = { _raw: tc.argsStr }; }
    return { id: tc.id, name: tc.name, args };
  });

  if (abortCheck && abortCheck()) return { textContent, toolCalls, finishReason, usage: usageInfo, model: resolvedModel };
  if (!textContent.trim() && toolCalls.length === 0 && finishReason === "stop") {
    const fallback = await completeOneTurn(messages, resolvedModel, tools);
    const sum = (k) => (usageInfo?.[k] || 0) + (fallback.usage?.[k] || 0);
    return {
      textContent: fallback.textContent,
      toolCalls: fallback.toolCalls,
      finishReason: fallback.finishReason,
      usage: usageInfo || fallback.usage ? { prompt_tokens: sum("prompt_tokens"), completion_tokens: sum("completion_tokens") } : null,
      model: resolvedModel,
    };
  }

  return { textContent, toolCalls, finishReason, usage: usageInfo, model: resolvedModel };
}

// ---------------------------------------------------------------------------
// Broadcast a gateway event to all connected clients
// ---------------------------------------------------------------------------

function broadcastEvent(frame) {
  for (const fn of activeSendEventFns) {
    try { fn(frame); } catch { /* ignore */ }
  }
}

// Approvals Hermes is waiting on (a risky terminal command, ...), keyed by
// "<run_id>:<request_id>". The office shows them in the PERSETUJUAN panel.
const pendingApprovals = new Map();
const approvalKey = (runId, requestId) => `${runId}:${requestId || ""}`;

// Forwards Hermes tool/approval events to the office, tagged with the agent.
function hermesEventForwarder(agentId, sessionKey) {
  return (name, data) => {
    if (name === "hermes.tool.progress") {
      broadcastEvent({ type: "event", event: "tool", payload: {
        agentId, sessionKey, tool: data.tool || "", emoji: data.emoji || "🔧",
        label: typeof data.label === "string" ? data.label.slice(0, 200) : "",
        toolCallId: data.toolCallId || "", status: data.status || "running",
      } });
    } else if (name === "approval.request" && data.run_id) {
      const approval = {
        id: approvalKey(data.run_id, data.request_id), agentId, sessionKey,
        runId: data.run_id, requestId: data.request_id || "",
        command: typeof data.command === "string" ? data.command.slice(0, 2000) : "",
        description: typeof data.description === "string" ? data.description.slice(0, 500) : "",
        choices: Array.isArray(data.choices) ? data.choices : ["once", "deny"],
        createdAt: Date.now(),
      };
      pendingApprovals.set(approval.id, approval);
      broadcastEvent({ type: "event", event: "approval", payload: { state: "requested", approval } });
    }
  };
}

// Drop approvals of a run that ended (Hermes answers 409 for them anyway).
function clearApprovalsFor(sessionKey) {
  for (const [key, a] of pendingApprovals) {
    if (a.sessionKey !== sessionKey) continue;
    pendingApprovals.delete(key);
    broadcastEvent({ type: "event", event: "approval", payload: { state: "resolved", id: key, choice: "expired" } });
  }
}

async function resolveApproval(id, choice) {
  const approval = pendingApprovals.get(id);
  if (!approval) throw new Error("persetujuan tidak ditemukan atau sudah selesai");
  if (!approval.choices.includes(choice)) throw new Error(`pilihan tidak valid: ${choice}`);
  const body = { choice };
  if (approval.requestId) body.request_id = approval.requestId;
  const res = await hermesPost(`/v1/runs/${encodeURIComponent(approval.runId)}/approval`, body);
  const payload = await readJsonBody(res).catch(() => ({}));
  pendingApprovals.delete(id);
  broadcastEvent({ type: "event", event: "approval", payload: { state: "resolved", id, choice } });
  if (res.statusCode >= 400) throw new Error(extractOpenAiStyleError(payload, `Hermes API HTTP ${res.statusCode}`));
  return payload;
}

// Toolsets Hermes has for the API server (web, terminal, file, browser, ...).
async function fetchToolsets() {
  const res = await hermesGet("/v1/toolsets");
  const payload = await readJsonBody(res);
  if (res.statusCode >= 400) throw new Error(extractOpenAiStyleError(payload, `Hermes API HTTP ${res.statusCode}`));
  const list = Array.isArray(payload) ? payload : payload.data ?? payload.toolsets ?? [];
  return list.map((t) => ({
    name: t.name, label: t.label || t.name, description: t.description || "",
    enabled: t.enabled !== false, configured: t.configured !== false,
    tools: Array.isArray(t.tools) ? t.tools.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean) : [],
  }));
}

// ---------------------------------------------------------------------------
// Tool executors
// ---------------------------------------------------------------------------

async function execSpawnAgent(args) {
  const name = (typeof args.name === "string" ? args.name : "Agent").trim() || "Agent";
  const role = (typeof args.role === "string" ? args.role : "").trim();
  const instructions = typeof args.instructions === "string" ? args.instructions.trim() : "";
  const boundaries = typeof args.boundaries === "string" ? args.boundaries.trim() : "";
  const model = typeof args.model === "string" && args.model.trim() ? args.model.trim() : HERMES_MODEL;
  const wipe = Boolean(args.wipe);
  const continuity = args.continuity !== false;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const newId = `${slug}-${randomId().slice(0, 6)}`;

  let systemPrompt = instructions || `You are ${name}, a ${role || "specialist"} agent.`;
  if (boundaries) systemPrompt += `\n\nBoundaries: ${boundaries}`;

  agentRegistry.set(newId, {
    id: newId, name, workspace: `${HOME}/.hermes/workspace-${slug}`,
    role, systemPrompt, settings: { wipe, continuity, model, boundaries },
  });

  console.log(`[hermes-adapter] Spawned agent: ${name} (${newId})`);

  // Broadcast presence so the 3D office loads the new agent immediately
  broadcastEvent({
    type: "event", event: "presence",
    payload: {
      sessions: {
        recent: [],
        byAgent: [...agentRegistry.keys()].map((aid) => ({
          agentId: aid,
          recent: [],
        })),
      },
    },
  });

  return JSON.stringify({ ok: true, agent_id: newId, name, role });
}

async function execDelegateTask(args) {
  const targetId = typeof args.agent_id === "string" ? args.agent_id.trim() : "";
  const message = typeof args.message === "string" ? args.message.trim() : "";
  if (!targetId || !message) return JSON.stringify({ ok: false, error: "agent_id and message required" });

  const agent = agentRegistry.get(targetId);
  if (!agent) return JSON.stringify({ ok: false, error: `Agent ${targetId} not found` });

  const sessionKey = `agent:${targetId}:${MAIN_KEY}`;
  const history = getHistory(sessionKey);
  const model = agent.settings.model || HERMES_MODEL;

  // Build messages for sub-agent
  const plan = plannedFiles(message);
  const systemMsg = agent.systemPrompt ? [{ role: "system", content: withProjectContext(agent.systemPrompt) + deliverableNote(plan) }] : [];
  const contextHistory = agent.settings.wipe ? [] : forModel(history);
  const messages = [...systemMsg, ...contextHistory, { role: "user", content: message }];
  const keep = agent.settings.continuity !== false;
  // Saved right away so the request shows in the chat even after a page refresh.
  if (keep) { history.push({ role: "user", content: message, at: Date.now() }); saveHistoryToDisk(); }

  // Emit chat start event for this sub-agent
  const subRunId = randomId();
  let seqCounter = 0;
  const emitSub = (state, extra) => {
    broadcastEvent({ type: "event", event: "chat", seq: seqCounter++,
      payload: { runId: subRunId, sessionKey, state, ...extra } });
  };

  emitSub("delta", { message: { role: "assistant", content: "…" } });

  // listed in chat.active, so a refreshed page still shows this agent at work
  activeRuns.set(subRunId, { runId: subRunId, sessionKey, agentId: targetId, startedAt: Date.now(), abort() {} });
  let responseText = "";
  try {
    const result = await streamOneTurn(messages, model, [], (partial) => {
      responseText = partial;
      emitSub("delta", { message: { role: "assistant", content: partial } });
    }, null, hermesEventForwarder(targetId, sessionKey));
    recordUsage(targetId, result);
    clearApprovalsFor(sessionKey);
    responseText = plan.files.length ? await ensureFilesSaved({ agentId: targetId, baseMessages: messages, plan, replyText: result.textContent, model, sessionKey }) : result.textContent;

    // Persist to sub-agent history (the summary points at this reply by its time)
    const replyAt = Date.now();
    if (keep) {
      history.push({ role: "assistant", content: responseText, at: replyAt });
      saveHistoryToDisk();
    }

    emitSub("final", { stopReason: "end_turn", message: { role: "assistant", content: responseText } });
    recordSummary({ agentId: targetId, task: message, text: responseText, msgAt: replyAt });

    // Presence update for sub-agent session
    broadcastEvent({
      type: "event", event: "presence",
      payload: { sessions: { recent: [{ key: sessionKey, updatedAt: Date.now() }],
        byAgent: [{ agentId: targetId, recent: [{ key: sessionKey, updatedAt: Date.now() }] }] } },
    });
  } catch (err) {
    const message = sanitizeErrorMessage(err);
    if (keep) { history.push({ role: "assistant", content: `⚠ ${message}`, error: true, at: Date.now() }); saveHistoryToDisk(); }
    emitSub("error", { errorMessage: message });
    return JSON.stringify({ ok: false, error: message });
  } finally {
    activeRuns.delete(subRunId);
  }

  return JSON.stringify({ ok: true, agent_id: targetId, response: responseText });
}

// A weak model often says "Menyimpan ke docs/x.md..." and pastes the content in the chat without ever
// calling the file tool. When a request names files to save, the office checks that they exist in
// the project folder (it can see /workspace read-only); if not, the agent is told once to really
// save them, and the reply carries a warning if it still did not.
const FILE_TOKEN = /(?:^|[\s"'`(])((?:[\w.-]+\/)*[\w.-]+\.(?:md|html?|json|txt|css|jsx?|tsx?|svg|py|csv|ya?ml|sql|sh))(?=$|[\s"'`),.;:!?])/gi;

function expectedFiles(userMessage) {
  if (!/(simpan|simpen|buat(?:kan)?|bikin|tulis|save|create|write|hasilkan)/i.test(userMessage)) return [];
  const base = activeProject?.path || "/workspace/hasil-agen";
  const out = new Set();
  const text = String(userMessage);
  for (const m of text.matchAll(FILE_TOKEN)) {
    const token = m[1];
    if (token.includes("..") || /^(?:node|react|next|vue|express|three|chart|d3|jquery)\.js$/i.test(token)) continue;
    // a bare name ("react.js", "app.ts") only counts when the text says to save/write it
    if (!token.includes("/") && !/(file|berkas|simpan|simpen|save|tulis|write|bernama|named)\W*(?:\w+\W+){0,3}$/i.test(text.slice(Math.max(0, m.index - 40), m.index + 1))) continue;
    if (token.startsWith("/")) { if (token.startsWith("/workspace/")) out.add(token); } else out.add(`${base}/${token.replace(/^\.\//, "")}`);
  }
  return [...out];
}

// What should end up on disk for a request: the files it names, else, for "buatkan website / desain /
// dokumen ...", a file the office names itself (docs/<words-of-the-request>.html or .md; an existing
// file is never reused, a number is added). Computed once per request and passed along.
const claimedFiles = new Set(); // files planned for some request: another agent's file never counts as this one's
const STOP_WORDS = new Set(["dari", "yang", "untuk", "dengan", "dan", "di", "ke", "buat", "buatkan", "bikin", "bikinkan", "kerjakan", "tolong", "saya", "aku", "sebuah", "suatu", "itu", "ini", "lagi", "agar", "supaya", "sebagai", "pada", "dalam", "mau", "ingin", "yg", "dgn", "tpi", "tapi"]);
function plannedFiles(userMessage) {
  const named = expectedFiles(userMessage);
  if (named.length) return { files: named, auto: false, startedAt: Date.now() };
  const none = { files: [], auto: false, startedAt: Date.now() };
  const text = String(userMessage).split("\n\n(Permintaan asli")[0].trim();
  if (!text || /\?\s*$/.test(text) || /^(apa|siapa|kenapa|mengapa|bagaimana|kapan|dimana|di mana|berapa|jelaskan|ceritakan)\b/i.test(text)) return none;
  if (!/\b(buat(?:kan)?|bikin(?:kan)?|kerjakan|rancang|susun(?:kan)?|tulis(?:kan)?|generate|hasilkan|desain(?:kan)?|design|redesign)\b/i.test(text)) return none;
  const web = /(landing ?page|halaman|website|situs|\bweb\b|html|wireframe|mockup|prototipe|prototype|antarmuka|tampilan|dashboard|aplikasi web|\bui\b|\bux\b|desain|design|logo|poster)/i.test(text);
  const doc = /(dokumen|laporan|\bprd\b|spesifikasi|rencana|catatan|ringkasan|proposal|checklist|test plan|panduan|artikel|konten|riset|analisis|user stor)/i.test(text);
  const ext = web ? "html" : doc ? "md" : null;
  if (!ext) return none;
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter((w) => w && !STOP_WORDS.has(w));
  const slug = words.slice(0, 6).join("-").replace(/-+/g, "-").slice(0, 48).replace(/^-|-$/g, "") || "hasil";
  const base = activeProject?.path || "/workspace/hasil-agen";
  let file = `${base}/docs/${slug}.${ext}`;
  for (let n = 2; fs.existsSync(file) || claimedFiles.has(file); n += 1) file = `${base}/docs/${slug}-${n}.${ext}`;
  claimedFiles.add(file);
  return { files: [file], auto: true, ext, base, startedAt: Date.now() };
}

function deliverableNote(plan) {
  if (!plan.files.length) return "";
  return `\n\nSimpan hasil kerjamu sebagai file ${plan.files.join(", ")} (buat foldernya bila perlu) dengan tool write_file atau perintah terminal, lalu sebutkan path lengkapnya di jawaban. Jangan hanya menulis isinya di chat.`;
}

// Did the agent save its result under another name? (a file with the right extension, new since the request)
function newFileSince(dir, ext, since, depth = 0, budget = { n: 400 }) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  for (const e of entries) {
    if (budget.n-- <= 0) return false;
    if (e.name === "node_modules" || e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (depth < 3 && newFileSince(full, ext, since, depth + 1, budget)) return true; continue; }
    if (e.name.toLowerCase().endsWith(`.${ext}`) && !claimedFiles.has(full.split(path.sep).join("/"))) { try { if (fs.statSync(full).mtimeMs >= since - 2000) return true; } catch { /* ignore */ } }
  }
  return false;
}

// Last resort: the agent wrote the file's content in its reply (a code block) but never saved it.
// The office saves it to the requested path, inside /workspace only, and never overwrites a file.
const LANG_FOR_EXT = {
  html: ["html", "htm"], htm: ["html", "htm"], md: ["markdown", "md"], json: ["json"], css: ["css"], js: ["js", "javascript"],
  jsx: ["jsx", "javascript", "js"], ts: ["ts", "typescript"], tsx: ["tsx", "typescript"], svg: ["svg", "xml", "html"],
  py: ["py", "python"], csv: ["csv"], yml: ["yaml", "yml"], yaml: ["yaml", "yml"], sql: ["sql"], sh: ["sh", "bash"], txt: [],
};
function saveFromReply(file, replyText) {
  if (!file.startsWith("/workspace/") || file.includes("..")) return false;
  const ext = path.extname(file).slice(1).toLowerCase();
  const blocks = [...String(replyText).matchAll(/```([\w+-]*)[^\n]*\n([\s\S]*?)```/g)]
    .map((m) => ({ lang: m[1].toLowerCase(), body: m[2] }))
    .filter((b) => b.body.trim().length > 20);
  if (!blocks.length) return false;
  const langs = LANG_FOR_EXT[ext] ?? [];
  let chosen = blocks.filter((b) => langs.includes(b.lang)).sort((a, b) => b.body.length - a.body.length)[0];
  if (!chosen && blocks.length === 1) chosen = blocks[0];
  if (!chosen || chosen.body.length > 1_500_000) return false;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, chosen.body.endsWith("\n") ? chosen.body : `${chosen.body}\n`, { flag: "wx" }); // wx: never overwrite
    return true;
  } catch {
    return false;
  }
}

// baseMessages: the messages the agent got (system, history, the user's request). Returns the reply, extended.
async function ensureFilesSaved({ agentId, baseMessages, plan, replyText, model, sessionKey }) {
  // an agent that chose another name for an automatically named file is fine too
  const savedElsewhere = () => plan.auto && newFileSince(plan.base, plan.ext, plan.startedAt);
  const missing = () => (savedElsewhere() ? [] : plan.files.filter((f) => !fs.existsSync(f)));
  let gone = missing();
  if (!gone.length) return replyText;
  const reminder = `Sistem: file berikut BELUM ada di disk, jadi kamu belum benar-benar menyimpannya (menulis isi file di jawaban tidak menyimpan apa pun):\n${gone.map((f) => `- ${f}`).join("\n")}\nSimpan sekarang dengan tool write_file (atau perintah terminal) ke path lengkap di atas, lalu konfirmasi path-nya dengan satu kalimat. Jangan menulis ulang isi file di jawaban.`;
  let extra = "";
  try {
    const retry = await streamOneTurn([...baseMessages, { role: "assistant", content: replyText }, { role: "user", content: reminder }],
      model, [], null, null, hermesEventForwarder(agentId, sessionKey));
    recordUsage(agentId, retry);
    extra = String(retry.textContent || "").trim();
  } catch { /* the warning below says it */ }
  gone = missing();
  const saved = gone.filter((f) => saveFromReply(f, `${replyText}\n${extra}`));
  gone = missing();
  const note = saved.length ? `\n\n💾 Kantor menyimpan ${saved.join(", ")} dari isi jawaban agen (agennya tidak memanggil tool tulis file). Periksa isinya, karena bisa belum lengkap.` : "";
  const warning = gone.length ? `\n\n⚠ File ini belum tersimpan di folder proyek: ${gone.join(", ")}. Minta agennya menyimpan ulang atau salin isinya dari chat.` : "";
  return `${replyText}${extra ? `\n\n${extra}` : ""}${note}${warning}`;
}

// "Suruh Sakura ...", "minta Haruto dan Kenji untuk ...": a clear order to named agents is handed
// to them by the office itself, so it does not depend on the (often weak) orchestrator model
// calling team_delegate, which it sometimes skips while claiming it did. Returns null for
// everything else, which goes to Hermes as usual.
function detectDelegation(text) {
  const members = [...agentRegistry.values()].filter((a) => a.id !== AGENT_ID);
  if (!members.length) return null;
  const order = /^\s*(?:tolong\s+)?(?:suruh(?:lah)?|minta(?:lah)?|perintahkan|tugaskan|beri(?:kan)?\s+tugas\s+(?:ke|kepada)|kasih\s+tugas\s+(?:ke|kepada)|panggil)\s+([\s\S]+)$/i.exec(text);
  if (!order) return null;
  let rest = order[1];
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const names = members.map((a) => a.name).sort((x, y) => y.length - x.length).map(escape).join("|");
  const lead = new RegExp(`^(?:si\\s+)?@?(${names})(?![\\p{L}\\d])\\s*(?:,|&|dan|serta|sama)?\\s*`, "iu");
  const found = [];
  for (;;) {
    const hit = lead.exec(rest);
    if (!hit) break;
    const agent = members.find((a) => a.name.toLowerCase() === hit[1].toLowerCase());
    if (agent && !found.includes(agent)) found.push(agent);
    rest = rest.slice(hit[0].length);
  }
  rest = rest.replace(/^(?:(?:untuk|agar|supaya|kepada|ke)\s+|[:-]\s*)/i, "").trim();
  if (!found.length || rest.length < 3) return null;
  return { agents: found, message: `${rest}\n\n(Permintaan asli pengguna lewat Hermes: "${text.slice(0, 500)}")` };
}

// A goal without names ("siapkan peluncuran produk kopi", "buatkan strategi konten bulan depan"): the weak
// orchestrator model often says it delegated without calling the tool, so the office picks the roles
// itself from the wording and hands each of them their part. Returns null for questions and chat,
// which go to Hermes as usual.
const GOAL_START = /^\s*(?:tolong\s+|bisa\s+(?:tolong\s+)?|coba\s+)?(?:siapkan|persiapkan|buat(?:kan)?|bikin(?:kan)?|rancang|susun(?:kan)?|rencanakan|kerjakan|kembangkan|garap|riset(?:kan)?|analisis(?:kan)?|cari(?:kan)?|tulis(?:kan)?|luncurkan|jalankan)\b/i;
const GOAL_ROLES = [
  { id: "yui-brainstorm", re: /(ide|strategi|brainstorm|konsep|rencana|peluncuran|luncurkan|launch|kampanye|prioritas|solusi)/i, doc: "ide dan strategi", ask: "Brainstorming dan susun strategi" },
  { id: "daichi-riset", re: /(riset|pasar|pesaing|kompetitor|pelanggan|tren|harga|peluncuran|luncurkan|launch|kampanye|produk|bisnis|usaha)/i, doc: "riset pasar dan pesaing", ask: "Riset pasar, pesaing, dan calon pelanggan" },
  { id: "sakura-konten", re: /(konten|caption|copy|artikel|postingan|sosial media|instagram|tiktok|iklan|kampanye|peluncuran|luncurkan|launch|promosi|brand)/i, doc: "konten dan copy", ask: "Tulis konten dan copy" },
  { id: "haruto-sales", re: /(jual|penjualan|sales|prospek|penawaran|follow.?up|closing|funnel|pelanggan|peluncuran|luncurkan|launch|kampanye|promosi|produk)/i, doc: "rencana penjualan dan skrip", ask: "Susun funnel, skrip chat, dan follow-up penjualan" },
  { id: "kenji-saham", re: /(saham|emiten|idx|bursa|ihsg|investasi|dividen)/i, doc: "riset saham", ask: "Riset saham dan susun laporan" },
  { id: "takumi-qa", re: /(\bqa\b|uji|tes\b|testing|periksa kualitas|bug|kualitas)/i, doc: "laporan QA", ask: "Periksa kualitas dan uji" },
  { id: "akane-security", re: /(keamanan|security|aman|rentan|vulnerab|phishing|peretas|hack|password|owasp)/i, doc: "laporan keamanan", ask: "Periksa keamanan dan susun temuan" },
];

function detectGoalPlan(text) {
  const goal = String(text).trim();
  if (goal.length < 12 || goal.length > 600 || /\?\s*$/.test(goal) || !GOAL_START.test(goal)) return null;
  const members = new Map([...agentRegistry.values()].filter((a) => a.id !== AGENT_ID).map((a) => [a.id, a]));
  const chosen = GOAL_ROLES.filter((r) => members.has(r.id) && r.re.test(goal));
  // a single unrelated hit is not a team job (e.g. "cari tahu cuaca"): let Hermes handle it
  if (chosen.length < 2 && !/(peluncuran|luncurkan|launch|kampanye|strategi|rencana|bisnis|produk|riset|saham|keamanan|konten|penjualan)/i.test(goal)) return null;
  if (!chosen.length) return null;
  const topic = goal.replace(GOAL_START, "").trim();
  const perAgent = {};
  for (const r of chosen) {
    perAgent[r.id] = `${r.ask} untuk: ${topic}\n\nBuatkan dokumen ${r.doc} yang lengkap, ringkas, dan siap dipakai (simpan sebagai file di folder proyek), lalu rangkum isinya dalam 3 sampai 5 poin.\n\n(Permintaan asli pengguna lewat Hermes: "${goal.slice(0, 500)}")`;
  }
  return { agents: chosen.map((r) => members.get(r.id)), message: "", perAgent };
}

// Runs such an order: every named agent works on it (visible in the office), then the replies are
// reported in Hermes' chat. Saved in Hermes' history like a normal turn.
async function delegationShortcut({ sessionKey, userMessage, plan, emitDelta }) {
  const history = getHistory(sessionKey);
  history.push({ role: "user", content: userMessage, at: Date.now() });
  saveHistoryToDisk();
  emitDelta(`Baik, saya suruh ${plan.agents.map((a) => a.name).join(", ")} mengerjakannya…`);
  const results = await Promise.all(plan.agents.map(async (agent) => {
    let out;
    try { out = JSON.parse(await execDelegateTask({ agent_id: agent.id, message: plan.perAgent?.[agent.id] ?? plan.message })); } catch (err) { out = { ok: false, error: sanitizeErrorMessage(err) }; }
    return { agent, out };
  }));
  const finalText = results
    .map(({ agent, out }) => (out.ok ? `**${agent.name}** selesai:\n${out.response || "(jawaban kosong)"}` : `⚠ ${agent.name} gagal: ${out.error ?? "kesalahan tidak diketahui"}`))
    .join("\n\n");
  const replyAt = Date.now();
  history.push({ role: "assistant", content: finalText, at: replyAt });
  saveHistoryToDisk();
  recordSummary({ agentId: AGENT_ID, task: userMessage, text: finalText, msgAt: replyAt });
  return finalText;
}

function execListTeam() {
  const members = [...agentRegistry.values()].map((a) => ({
    id: a.id, name: a.name, role: a.role || "",
    settings: a.settings,
  }));
  return JSON.stringify({ team: members });
}

function execConfigureAgent(args) {
  const targetId = typeof args.agent_id === "string" ? args.agent_id.trim() : "";
  const agent = agentRegistry.get(targetId);
  if (!agent) return JSON.stringify({ ok: false, error: `Agent ${targetId} not found` });
  if (typeof args.name === "string" && args.name.trim()) agent.name = args.name.trim();
  if (typeof args.role === "string") agent.role = args.role.trim();
  if (typeof args.instructions === "string") agent.systemPrompt = args.instructions;
  if (typeof args.wipe === "boolean") agent.settings.wipe = args.wipe;
  if (typeof args.continuity === "boolean") agent.settings.continuity = args.continuity;
  if (typeof args.boundaries === "string") {
    agent.settings.boundaries = args.boundaries;
    if (agent.systemPrompt && args.boundaries) {
      agent.systemPrompt = agent.systemPrompt.replace(/\n\nBoundaries:.*$/s, "") + `\n\nBoundaries: ${args.boundaries}`;
    }
  }
  if (typeof args.model === "string" && args.model.trim()) agent.settings.model = args.model.trim();
  console.log(`[hermes-adapter] Configured agent: ${agent.name} (${targetId})`);
  broadcastEvent({
    type: "event", event: "presence",
    payload: {
      sessions: {
        recent: [],
        byAgent: [...agentRegistry.keys()].map((aid) => ({
          agentId: aid,
          recent: [],
        })),
      },
    },
  });
  return JSON.stringify({ ok: true, agent_id: targetId, name: agent.name, role: agent.role, settings: agent.settings });
}

function execDismissAgent(args) {
  const targetId = typeof args.agent_id === "string" ? args.agent_id.trim() : "";
  if (!targetId || targetId === AGENT_ID) return JSON.stringify({ ok: false, error: "Cannot dismiss the main orchestrator." });
  const agent = agentRegistry.get(targetId);
  if (!agent) return JSON.stringify({ ok: false, error: `Agent ${targetId} not found` });
  agentRegistry.delete(targetId);
  clearHistory(`agent:${targetId}:${MAIN_KEY}`);
  console.log(`[hermes-adapter] Dismissed agent: ${agent.name} (${targetId})`);
  return JSON.stringify({ ok: true, dismissed: targetId });
}

function execReadAgentContext(args) {
  const targetId = typeof args.agent_id === "string" ? args.agent_id.trim() : "";
  const agent = agentRegistry.get(targetId);
  if (!agent) return JSON.stringify({ ok: false, error: `Agent ${targetId} not found` });
  const lastN = Math.min(40, Math.max(1, typeof args.last_n === "number" ? Math.floor(args.last_n) : 10));
  const sessionKey = `agent:${targetId}:${MAIN_KEY}`;
  const history = getHistory(sessionKey);
  const messages = history.slice(-lastN);
  if (messages.length === 0) {
    return JSON.stringify({ ok: true, agent_id: targetId, name: agent.name, role: agent.role || "", message_count: 0, context: "(no conversation history yet)" });
  }
  const contextLines = messages.map((m) => {
    const role = m.role === "assistant" ? agent.name : "User";
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    return `[${role}]: ${content.slice(0, 800)}${content.length > 800 ? "…" : ""}`;
  });
  return JSON.stringify({
    ok: true,
    agent_id: targetId,
    name: agent.name,
    role: agent.role || "",
    message_count: history.length,
    showing_last: messages.length,
    context: contextLines.join("\n\n"),
  });
}

async function executeToolCall(tc, sendEvent) {
  console.log(`[hermes-adapter] Tool call: ${tc.name}`, JSON.stringify(tc.args).slice(0, 120));
  switch (tc.name) {
    case "spawn_agent":          return execSpawnAgent(tc.args, sendEvent);
    case "delegate_task":        return execDelegateTask(tc.args, sendEvent);
    case "list_team":            return execListTeam();
    case "configure_agent":      return execConfigureAgent(tc.args);
    case "dismiss_agent":        return execDismissAgent(tc.args);
    case "read_agent_context":   return execReadAgentContext(tc.args);
    default:                     return JSON.stringify({ ok: false, error: `Unknown tool: ${tc.name}` });
  }
}

// ---------------------------------------------------------------------------
// Agentic loop — handles multi-round tool-calling conversations
// ---------------------------------------------------------------------------

async function runAgenticLoop({ sessionKey, agentId, userMessage, model, tools, emitDelta, abortCheck, sendEvent, extraSystem = "" }) {
  const agent = agentRegistry.get(agentId);
  const prompt = agent?.systemPrompt && agentId === AGENT_ID ? `${agent.systemPrompt}${teamContext()}` : agent?.systemPrompt;
  const systemMsg = prompt ? [{ role: "system", content: withProjectContext(prompt) + extraSystem }] : [];
  const history = getHistory(sessionKey);
  const contextHistory = (agent?.settings?.wipe) ? [] : forModel(history);
  let messages = [...systemMsg, ...contextHistory, { role: "user", content: userMessage }];
  const keep = agent?.settings?.continuity !== false;
  // Saved right away so the request shows in the chat even after a page refresh.
  if (keep) { history.push({ role: "user", content: userMessage, at: Date.now() }); saveHistoryToDisk(); }

  let finalText = "";
  let round = 0;
  try {

  while (round < MAX_TOOL_ROUNDS) {
    round++;
    const turn = await streamOneTurn(
      messages, model, tools, emitDelta, abortCheck, hermesEventForwarder(agentId, sessionKey)
    );
    const { textContent, toolCalls, finishReason } = turn;
    recordUsage(agentId, turn);
    clearApprovalsFor(sessionKey);

    if (finishReason === "tool_calls" && toolCalls.length > 0) {
      // Inform user that tools are being executed (brief status text)
      const toolNames = toolCalls.map((t) => t.name).join(", ");
      const statusText = textContent || `Executing: ${toolNames}…`;
      if (statusText) emitDelta(statusText);

      // Add assistant message with tool_calls to messages
      messages.push({
        role: "assistant",
        content: textContent || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id, type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        })),
      });

      // Execute all tool calls and collect results
      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const result = await executeToolCall(tc, sendEvent);
          return { role: "tool", tool_call_id: tc.id, content: result };
        })
      );
      messages.push(...toolResults);
      continue;
    }

    // finish_reason = "stop" (or length/unknown) — we're done
    finalText = textContent;
    break;
  }
  } catch (err) {
    if (keep) {
      history.push({ role: "assistant", content: `⚠ ${sanitizeErrorMessage(err)}`, error: true, at: Date.now() });
      saveHistoryToDisk();
    }
    throw err;
  }

  // Persist to history (the summary points at this reply by its time)
  const replyAt = Date.now();
  if (keep) {
    history.push({ role: "assistant", content: finalText, at: replyAt });
    saveHistoryToDisk();
  }
  if (!abortCheck?.()) recordSummary({ agentId, task: userMessage, text: finalText, msgAt: replyAt });

  return finalText;
}

// The orchestrator's view of the team (so it delegates instead of spawning new agents).
function teamContext() {
  const members = [...agentRegistry.values()].filter((a) => a.id !== AGENT_ID);
  if (!members.length) return "";
  return `\n\nTim kantor saat ini. Semua agen ini SUDAH aktif dan siap menerima tugas lewat tool team_delegate dengan agent_id di bawah; jangan bilang tim belum ada dan jangan membuat agen baru untuk peran yang sudah ada:\n${
    members.map((a) => `- ${a.id}: ${a.name}${a.role ? ` (${a.role})` : ""}`).join("\n")}`;
}

// History as context for the model: no failed replies, only role + content.
function forModel(history) {
  return history.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
}

// ---------------------------------------------------------------------------
// Frame builders
// ---------------------------------------------------------------------------

function resOk(id, payload) { return { type: "res", id, ok: true, payload: payload ?? {} }; }
function resErr(id, code, message) { return { type: "res", id, ok: false, error: { code, message } }; }

// ---------------------------------------------------------------------------
// Method handlers
// ---------------------------------------------------------------------------

async function handleMethod(method, params, id, sendEvent) {
  const p = params || {};

  switch (method) {
    // --- Agent management ---------------------------------------------------

    case "agents.list": {
      const allAgents = [...agentRegistry.values()].map((agent) => ({
        id: agent.id, name: agent.name, workspace: agent.workspace,
        identity: { name: agent.name, emoji: "🤖" },
        role: agent.role,
      }));
      return resOk(id, { defaultId: AGENT_ID, mainKey: MAIN_KEY, agents: allAgents });
    }

    case "agents.create": {
      const agentName = (typeof p.name === "string" && p.name.trim()) ? p.name.trim() : "Agent";
      const slug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const newId = `${slug}-${randomId().slice(0, 6)}`;
      const workspace = (typeof p.workspace === "string" && p.workspace)
        ? p.workspace : `${HOME}/.hermes/workspace-${slug}`;
      agentRegistry.set(newId, {
        id: newId, name: agentName, workspace,
        role: "", systemPrompt: `You are ${agentName}.`,
        settings: { wipe: false, continuity: true, model: HERMES_MODEL },
      });
      return resOk(id, { agentId: newId, name: agentName, workspace });
    }

    case "agents.delete": {
      const delId = typeof p.agentId === "string" ? p.agentId : "";
      if (delId && delId !== AGENT_ID) {
        agentRegistry.delete(delId);
        clearHistory(`agent:${delId}:${MAIN_KEY}`);
      }
      return resOk(id, { ok: true, removedBindings: 0 });
    }

    case "agents.update": {
      const updId = typeof p.agentId === "string" ? p.agentId : "";
      const existing = agentRegistry.get(updId);
      if (existing) {
        if (typeof p.name === "string" && p.name.trim()) existing.name = p.name.trim();
        if (typeof p.workspace === "string" && p.workspace.trim()) existing.workspace = p.workspace.trim();
        if (typeof p.role === "string") existing.role = p.role.trim();
      }
      return resOk(id, { ok: true, removedBindings: 0 });
    }

    case "agents.files.get": {
      const key = `${p.agentId || AGENT_ID}/${p.name || ""}`;
      const content = agentFiles.get(key);
      return resOk(id, { file: content !== undefined ? { content } : { missing: true } });
    }

    case "agents.files.set": {
      const key = `${p.agentId || AGENT_ID}/${p.name || ""}`;
      agentFiles.set(key, typeof p.content === "string" ? p.content : "");
      return resOk(id, {});
    }

    // --- Config -------------------------------------------------------------

    case "config.get":
      return resOk(id, { config: { gateway: { reload: { mode: "hot" } } },
        hash: "hermes-adapter", exists: true, path: CONFIG_PATH });

    case "config.patch":
    case "config.set":
      return resOk(id, { hash: "hermes-adapter" });

    // --- Sessions -----------------------------------------------------------

    case "sessions.list": {
      const sessions = [...agentRegistry.values()].map((agent) => {
        const sessionKey = `agent:${agent.id}:${MAIN_KEY}`;
        const history = getHistory(sessionKey);
        const settings = sessionSettings.get(sessionKey) || {};
        return {
          key: sessionKey, agentId: agent.id,
          updatedAt: history.length > 0 ? Date.now() : null,
          displayName: "Main",
          origin: { label: agent.name, provider: "hermes" },
          model: settings.model || agent.settings?.model || HERMES_MODEL,
          modelProvider: "hermes",
        };
      });
      return resOk(id, { sessions });
    }

    case "sessions.preview": {
      const keys = Array.isArray(p.keys) ? p.keys : [];
      const limit = typeof p.limit === "number" ? p.limit : 8;
      const maxChars = typeof p.maxChars === "number" ? p.maxChars : 240;
      const previews = keys.map((key) => {
        const history = getHistory(key);
        if (history.length === 0) return { key, status: "empty", items: [] };
        const items = history.slice(-limit).map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          text: String(msg.content || "").slice(0, maxChars),
          timestamp: Date.now(),
        }));
        return { key, status: "ok", items };
      });
      return resOk(id, { ts: Date.now(), previews });
    }

    case "sessions.patch": {
      const key = typeof p.key === "string" ? p.key : MAIN_SESSION_KEY;
      const current = sessionSettings.get(key) || {};
      const next = { ...current };
      if (p.model !== undefined) next.model = typeof p.model === "string" ? p.model.trim() : p.model;
      if (p.thinkingLevel !== undefined) next.thinkingLevel = p.thinkingLevel;
      if (p.execHost !== undefined) next.execHost = p.execHost;
      if (p.execSecurity !== undefined) next.execSecurity = p.execSecurity;
      if (p.execAsk !== undefined) next.execAsk = p.execAsk;
      sessionSettings.set(key, next);
      const resolvedModel = await resolveHermesModel(next.model || HERMES_MODEL);
      return resOk(id, { ok: true, key, entry: { thinkingLevel: next.thinkingLevel },
        resolved: { model: resolvedModel, modelProvider: "hermes" } });
    }

    case "sessions.reset": {
      const key = typeof p.key === "string" ? p.key : MAIN_SESSION_KEY;
      clearHistory(key);
      return resOk(id, { ok: true });
    }

    // Deletes the saved chat of every agent and the summaries list. Refused while an agent is working.
    case "chat.clearAll": {
      if (activeRuns.size > 0) return resErr(id, "busy", "Masih ada agen yang bekerja. Tunggu selesai atau hentikan dulu.");
      const cleared = [...conversationHistory.values()].reduce((n, h) => n + h.length, 0);
      conversationHistory.clear();
      saveHistoryToDisk();
      summaries.clear();
      return resOk(id, { ok: true, cleared });
    }

    // --- Chat ---------------------------------------------------------------

    case "chat.send": {
      const sessionKey = typeof p.sessionKey === "string" ? p.sessionKey : MAIN_SESSION_KEY;
      const userMessage = typeof p.message === "string" ? p.message.trim() : String(p.message || "").trim();
      const runId = (typeof p.idempotencyKey === "string" && p.idempotencyKey) ? p.idempotencyKey : randomId();

      if (!userMessage) return resOk(id, { status: "no-op", runId });

      // Resolve which agent owns this session
      const sessionAgentId = sessionKey.startsWith("agent:") ? sessionKey.split(":")[1] : AGENT_ID;
      const agent = agentRegistry.get(sessionAgentId);
      const isOrchestrator = sessionAgentId === AGENT_ID;

      let aborted = false;
      activeRuns.set(runId, {
        runId,
        sessionKey,
        agentId: sessionAgentId,
        startedAt: Date.now(),
        abort() { aborted = true; },
      });

      setImmediate(async () => {
        const model = (sessionSettings.get(sessionKey) || {}).model
          || agent?.settings?.model || HERMES_MODEL;
        let seqCounter = 0;

        // Broadcast (not only this socket) so a refreshed tab keeps receiving the reply.
        const emitChat = (state, extra) => {
          broadcastEvent({ type: "event", event: "chat", seq: seqCounter++,
            payload: { runId, sessionKey, state, ...extra } });
        };

        const onTextDelta = (partial) => {
          if (!aborted) emitChat("delta", { message: { role: "assistant", content: partial } });
        };

        try {
          // Only the orchestrator gets team management tools
          // Hermes ignores tools sent with a chat request (it runs its own); the team tools reach it
          // as the MCP server office-team (team-mcp.js), so nothing is sent here.
          const tools = [];

          const plan = isOrchestrator ? (detectDelegation(userMessage) || detectGoalPlan(userMessage)) : null;
          // what must end up on disk (named in the request, or a file the office names for "buatkan website ...")
          const deliverable = !plan && !isOrchestrator ? plannedFiles(userMessage) : { files: [] };
          let finalText = plan
            ? await delegationShortcut({ sessionKey, userMessage, plan, emitDelta: onTextDelta })
            : await runAgenticLoop({
              sessionKey, agentId: sessionAgentId, userMessage,
              model, tools, emitDelta: onTextDelta,
              abortCheck: () => aborted, sendEvent,
              extraSystem: deliverableNote(deliverable),
            });
          // an agent that was asked to save files but did not: make it do so (or warn)
          if (deliverable.files.length && !aborted) {
            const history = getHistory(sessionKey);
            const systemMsg = agent?.systemPrompt ? [{ role: "system", content: withProjectContext(agent.systemPrompt) + deliverableNote(deliverable) }] : [];
            const base = [...systemMsg, ...forModel(history).slice(-12, -1)];
            const improved = await ensureFilesSaved({ agentId: sessionAgentId, baseMessages: base, plan: deliverable, replyText: finalText, model, sessionKey });
            if (improved !== finalText) {
              finalText = improved;
              const last = history[history.length - 1];
              if (last?.role === "assistant") { last.content = improved; saveHistoryToDisk(); }
            }
          }

          if (aborted) {
            emitChat("aborted", {});
          } else {
            emitChat("final", { stopReason: "end_turn",
              message: { role: "assistant", content: finalText } });
            sendEvent({ type: "event", event: "presence", seq: seqCounter++,
              payload: { sessions: { recent: [{ key: sessionKey, updatedAt: Date.now() }],
                byAgent: [{ agentId: sessionAgentId, recent: [{ key: sessionKey, updatedAt: Date.now() }] }] } } });
          }
        } catch (err) {
          if (!aborted) emitChat("error", { errorMessage: sanitizeErrorMessage(err) || "Hermes API error" });
          else emitChat("aborted", {});
        } finally {
          activeRuns.delete(runId);
        }
      });

      return resOk(id, { status: "started", runId });
    }

    case "chat.abort": {
      const runId = typeof p.runId === "string" ? p.runId.trim() : "";
      const sessionKey = typeof p.sessionKey === "string" ? p.sessionKey.trim() : "";
      let aborted = 0;
      if (runId) {
        const handle = activeRuns.get(runId);
        if (handle) {
          handle.abort();
          activeRuns.delete(runId);
          aborted += 1;
        }
      } else if (sessionKey) {
        for (const [activeRunId, handle] of activeRuns.entries()) {
          if (handle.sessionKey !== sessionKey) continue;
          handle.abort();
          activeRuns.delete(activeRunId);
          aborted += 1;
        }
      }
      return resOk(id, { ok: true, aborted });
    }

    // --- 💬 Rapat (team meetings) -------------------------------------------

    case "meeting.start":
      try {
        return resOk(id, { meeting: meetings.start(p) });
      } catch (err) {
        return resErr(id, "meeting_failed", sanitizeErrorMessage(err));
      }

    case "meeting.stop":
      return resOk(id, { ok: meetings.stop(typeof p.id === "string" ? p.id : "") });

    case "meeting.current":
      return resOk(id, { meeting: meetings.current(), maxParticipants: meetings.MAX_PARTICIPANTS, maxRounds: meetings.MAX_ROUNDS });

    case "summaries.mark": {
      const entry = summaries.setRead(String(p.id || ""), p.read);
      if (!entry) return resErr(id, "not_found", "ringkasan tidak ditemukan");
      broadcastEvent({ type: "event", event: "summary.read", payload: { id: entry.id, read: entry.read } });
      return resOk(id, { id: entry.id, read: entry.read });
    }

    case "summaries.list":
      return resOk(id, { summaries: summaries.list(Number(p.limit) || 100) });

    case "chat.active":
      // Runs still in progress, so a refreshed tab can show who is working.
      return resOk(id, { runs: [...activeRuns.values()].map((r) => ({ runId: r.runId, sessionKey: r.sessionKey, agentId: r.agentId, startedAt: r.startedAt })) });

    case "chat.history": {
      const histKey = typeof p.sessionKey === "string" ? p.sessionKey : MAIN_SESSION_KEY;
      return resOk(id, { sessionKey: histKey, messages: getHistory(histKey) });
    }

    case "agent.wait": {
      const { runId, timeoutMs = 30000 } = p;
      const start = Date.now();
      while (activeRuns.has(runId) && Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return resOk(id, { status: activeRuns.has(runId) ? "running" : "done" });
    }

    // --- Approvals ----------------------------------------------------------

    case "exec.approvals.get":
      return resOk(id, { path: "", exists: true, hash: "hermes-approvals",
        file: { version: 1, defaults: { security: "full", ask: "off", autoAllowSkills: true }, agents: {} } });

    case "exec.approvals.set":
      return resOk(id, { hash: "hermes-approvals" });

    case "exec.approval.resolve": {
      try {
        const result = await resolveApproval(String(p.id || ""), String(p.choice || p.decision || ""));
        return resOk(id, { ok: true, result });
      } catch (err) {
        return resErr(id, "approval_failed", sanitizeErrorMessage(err));
      }
    }

    case "exec.approvals.pending":
      return resOk(id, { approvals: [...pendingApprovals.values()] });

    // --- Hermes toolsets (read-only; configure in the Hermes dashboard) ------

    case "tools.catalog": {
      try {
        return resOk(id, { toolsets: await fetchToolsets() });
      } catch (err) {
        return resErr(id, "tools_failed", sanitizeErrorMessage(err));
      }
    }

    // --- Status & heartbeat -------------------------------------------------

    case "status": {
      const recent = [...agentRegistry.keys()].flatMap((aid) => {
        const h = getHistory(`agent:${aid}:${MAIN_KEY}`);
        return h.length > 0 ? [{ key: `agent:${aid}:${MAIN_KEY}`, updatedAt: Date.now() }] : [];
      });
      return resOk(id, { sessions: { recent,
        byAgent: [...agentRegistry.keys()].map((aid) => ({
          agentId: aid,
          recent: recent.filter((r) => r.key.includes(`:${aid}:`)),
        })) } });
    }

    case "wake":
      return resOk(id, { ok: true });

    // --- Skills & models ----------------------------------------------------

    case "skills.status":
      return resOk(id, { skills: [] });

    case "models.list":
      try {
        const models = await fetchHermesModels();
        return resOk(id, {
          models: (models.length > 0 ? models : [HERMES_MODEL]).map((modelId) => ({
            id: modelId,
            name: modelId,
          })),
        });
      } catch {
        return resOk(id, { models: [{ id: HERMES_MODEL, name: HERMES_MODEL }] });
      }

    case "tasks.list":
      return resOk(id, { tasks: [] });

    // --- Cron jobs ----------------------------------------------------------

    case "cron.list": {
      const includeDisabled = p.includeDisabled !== false;
      const jobs = [...cronJobs.values()];
      return resOk(id, { jobs: includeDisabled ? jobs : jobs.filter((j) => j.enabled) });
    }

    case "cron.add": {
      const jobId = randomId();
      const job = {
        id: jobId, name: typeof p.name === "string" ? p.name : "Cron Job",
        agentId: typeof p.agentId === "string" ? p.agentId : AGENT_ID,
        sessionKey: typeof p.sessionKey === "string" ? p.sessionKey : MAIN_SESSION_KEY,
        description: typeof p.description === "string" ? p.description : "",
        enabled: p.enabled !== false, deleteAfterRun: Boolean(p.deleteAfterRun),
        updatedAtMs: Date.now(), schedule: p.schedule || { kind: "every", everyMs: 3600000 },
        sessionTarget: p.sessionTarget || "main", wakeMode: p.wakeMode || "next-heartbeat",
        payload: p.payload || { kind: "systemEvent", text: "tick" }, state: {},
      };
      cronJobs.set(jobId, job);
      return resOk(id, job);
    }

    case "cron.remove": {
      const jobId = typeof p.id === "string" ? p.id : "";
      return resOk(id, { ok: true, removed: cronJobs.delete(jobId) });
    }

    case "cron.patch": {
      const jobId = typeof p.id === "string" ? p.id : "";
      const job = cronJobs.get(jobId);
      if (!job) return resOk(id, { ok: false, error: "not_found" });
      const updated = { ...job };
      if (p.enabled !== undefined) updated.enabled = Boolean(p.enabled);
      if (p.name !== undefined) updated.name = String(p.name);
      if (p.schedule !== undefined) updated.schedule = p.schedule;
      if (p.payload !== undefined) updated.payload = p.payload;
      updated.updatedAtMs = Date.now();
      cronJobs.set(jobId, updated);
      return resOk(id, { ok: true, job: updated });
    }

    case "cron.run": {
      const jobId = typeof p.id === "string" ? p.id : "";
      const job = cronJobs.get(jobId);
      if (!job) return resOk(id, { ok: false });
      cronJobs.set(jobId, { ...job, state: { ...job.state, runningAtMs: Date.now() } });
      setTimeout(() => {
        const current = cronJobs.get(jobId);
        if (!current) return;
        const done = { ...current, state: { ...current.state, runningAtMs: undefined, lastRunAtMs: Date.now(), lastStatus: "ok" } };
        cronJobs.set(jobId, done);
        broadcastEvent({ type: "event", event: "cron", payload: { action: "finished", jobId, status: "ok", summary: done } });
      }, 3000);
      return resOk(id, { ok: true, ran: true });
    }

    default:
      console.warn(`[hermes-adapter] Unhandled method: ${method}`);
      return resOk(id, {});
  }
}

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

function startAdapter() {
  const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hermes Gateway Adapter – OK\n");
  });

  const wss = new WebSocketServer({ server: httpServer });
  wss.on("error", (err) => {
    if (err.code !== "EADDRINUSE") console.error("[hermes-adapter] Server error:", sanitizeErrorMessage(err));
  });

  wss.on("connection", (ws) => {
    let connected = false;
    let globalSeq = 0;

    const send = (frame) => {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(JSON.stringify(frame)); }
        catch (e) { console.error("[hermes-adapter] send error:", sanitizeErrorMessage(e)); }
      }
    };

    // Register this connection's send function for broadcasts
    const sendEventFn = (frame) => {
      if (frame.type === "event" && typeof frame.seq !== "number") frame.seq = globalSeq++;
      send(frame);
    };
    activeSendEventFns.add(sendEventFn);

    send({ type: "event", event: "connect.challenge", payload: { nonce: randomId() } });

    ws.on("message", async (raw) => {
      let frame;
      try { frame = JSON.parse(raw.toString("utf8")); } catch { return; }
      if (!frame || typeof frame !== "object" || frame.type !== "req") return;
      const { id, method, params } = frame;
      if (typeof id !== "string" || typeof method !== "string") return;

      if (method === "connect") {
        connected = true;
        const allAgents = [...agentRegistry.values()].map((a) => ({ agentId: a.id, name: a.name, isDefault: a.id === AGENT_ID }));
        send({
          type: "res", id, ok: true,
          payload: {
            type: "hello-ok", protocol: 3,
            adapterType: "hermes",
            features: { methods: ["agents.list","agents.create","agents.delete","agents.update",
              "sessions.list","sessions.preview","sessions.patch","sessions.reset","chat.clearAll",
              "chat.send","chat.abort","chat.history","agent.wait",
              "status","config.get","config.set","config.patch",
              "agents.files.get","agents.files.set",
              "exec.approvals.get","exec.approvals.set","exec.approval.resolve","exec.approvals.pending",
              "tools.catalog","summaries.list","summaries.mark","chat.active","meeting.start","meeting.stop","meeting.current",
              "wake","skills.status","models.list",
              "tasks.list",
              "cron.list","cron.add","cron.remove","cron.patch","cron.run"],
              events: ["chat","presence","heartbeat","cron","tool","approval","summary","summary.read","meeting"] },
            snapshot: { health: { agents: allAgents, defaultAgentId: AGENT_ID },
              sessionDefaults: { mainKey: MAIN_KEY } },
            auth: { role: "operator", scopes: ["operator.admin","operator.approvals"] },
            policy: { tickIntervalMs: 30000 },
          },
        });
        return;
      }

      if (!connected) { send(resErr(id, "not_connected", "Send connect first.")); return; }

      try {
        const response = await handleMethod(method, params, id, sendEventFn);
        send(response);
      } catch (err) {
        const message = sanitizeErrorMessage(err);
        console.error(`[hermes-adapter] Error handling ${method}:`, message);
        send(resErr(id, "internal_error", message || "Internal error"));
      }
    });

    ws.on("close", () => activeSendEventFns.delete(sendEventFn));
    ws.on("error", (err) => {
      console.error("[hermes-adapter] WebSocket error:", sanitizeErrorMessage(err));
      activeSendEventFns.delete(sendEventFn);
    });
  });

  httpServer.listen(ADAPTER_PORT, "127.0.0.1", () => {
    console.log(`\n[hermes-adapter] ✓ Listening on ws://localhost:${ADAPTER_PORT}`);
    console.log(`[hermes-adapter] ✓ Forwarding to Hermes API at ${HERMES_API_URL}`);
    console.log(`[hermes-adapter] ✓ Model: ${HERMES_MODEL}`);
    console.log(`[hermes-adapter] ✓ Multi-agent orchestration: ENABLED`);
    console.log(`\nOpen Claw3D → ws://localhost:${ADAPTER_PORT}\n`);
  });

  httpServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[hermes-adapter] Port ${ADAPTER_PORT} in use. Set HERMES_ADAPTER_PORT to change it.`);
    } else {
      console.error("[hermes-adapter] Server error:", sanitizeErrorMessage(err));
    }
    process.exit(1);
  });
}

// Persistent team (fixed ids keep history across restarts). TEAM_FILE points at
// config/team.json; the office's agent panel edits it through the functions below.
const TEAM_FILE = process.env.TEAM_FILE || path.join(HOME, ".hermes", "clawd3d-team.json");

function registerTeamMember(member) {
  const name = typeof member.name === "string" && member.name.trim() ? member.name.trim() : member.id;
  const boundaries = typeof member.boundaries === "string" ? member.boundaries : "";
  let systemPrompt = typeof member.instructions === "string" && member.instructions.trim()
    ? member.instructions.trim()
    : `You are ${name}, a ${member.role || "specialist"} agent.`;
  if (boundaries) systemPrompt += `\n\nBoundaries: ${boundaries}`;
  agentRegistry.set(member.id, {
    id: member.id, name, workspace: `${HOME}/.hermes/workspace-${member.id}`,
    role: member.role || "", systemPrompt,
    settings: { wipe: false, continuity: true, model: member.model || HERMES_MODEL, boundaries },
  });
}

function loadTeamFromDisk() {
  try {
    if (!fs.existsSync(TEAM_FILE)) return;
    const team = JSON.parse(fs.readFileSync(TEAM_FILE, "utf8"));
    for (const member of Array.isArray(team) ? team : []) {
      if (!member || typeof member.id !== "string" || !member.id || member.id === AGENT_ID) continue;
      registerTeamMember(member);
    }
    console.log(`[hermes-adapter] Loaded team of ${agentRegistry.size - 1} agent(s) from ${TEAM_FILE}.`);
  } catch (err) {
    console.warn("[hermes-adapter] Could not load team:", sanitizeErrorMessage(err));
  }
}

// Tell every connected office that the roster changed.
function broadcastRoster() {
  broadcastEvent({
    type: "event", event: "presence",
    payload: { sessions: { recent: [], byAgent: [...agentRegistry.keys()].map((aid) => ({ agentId: aid, recent: [] })) } },
  });
}

// Active project (set from the office's 📁 Proyek picker). Every agent's system
// prompt gets the project folder and the git branch rules appended, including
// sub-agents that Hermes delegates to.
let activeProject = null; // { name, path, git }

// Where finished files must end up. Hermes' own folders (/opt/data, cache/scratch, /tmp) live
// inside the container and are invisible to the user, so every result goes to /workspace
// (the user's PROJECTS_DIR). Without an active project that is a shared fallback folder.
const FALLBACK_DIR = "/workspace/hasil-agen";
const filesRule = (dir) => `
- Simpan SEMUA file hasil kerja (kode, dokumen, gambar, SVG, desain, laporan) langsung di ${dir}, bukan di /opt/data, /tmp, atau cache/scratch: folder itu tidak terlihat oleh pengguna. Kalau berkas yang mau diubah ada di luar folder ini (mis. dari percakapan sebelumnya), salin dulu ke sini, lanjutkan di sini, dan sebutkan path lengkapnya (di bawah /workspace) di jawaban.`;

const projectContext = () => {
  if (!activeProject) {
    return `

Tidak ada proyek aktif. Folder hasil kerja bersama: ${FALLBACK_DIR} (folder milik pengguna; buat kalau belum ada, mis. \`mkdir -p ${FALLBACK_DIR}\`).${filesRule(FALLBACK_DIR)}`;
  }
  const { name, path: dir, git } = activeProject;
  const gitRules = git ? `
- Aturan git (wajib): sebelum mengubah file, jalankan \`git status\` dan \`git branch --show-current\`.
  Kalau branch aktif belum diawali "agent/", buat satu branch kerja bersama untuk tugas ini:
  \`git checkout -b agent/<nama-tugas-singkat>\`. Seluruh tim memakai branch itu; jangan pindah ke branch lain.
- Jangan pernah commit atau push ke main, master, atau develop; jangan force push; jangan menghapus branch atau riwayat.
  Commit kecil dengan pesan yang jelas. Push hanya kalau pengguna memintanya.` : `
- Folder ini bukan repositori git: tidak perlu perintah git. Jangan menghapus atau menimpa file yang sudah ada tanpa diminta.`;
  return `

Proyek aktif: "${name}" di folder ${dir} (folder milik pengguna yang di-mount ke container).
- Kerjakan semua file dan perintah terminal di folder ini: pakai path absolut atau jalankan \`cd ${dir}\` lebih dulu.${filesRule(dir)}
- Baca struktur folder dan README proyek sebelum mengubah apa pun, lalu ikuti konvensi yang sudah ada.
${gitRules}
- Jangan membaca, menampilkan, atau mengubah file rahasia (.env, kunci, kredensial).`;
};

// Replies are read in a small chat panel and speech bubbles: keep them short.
const REPLY_STYLE = `

Gaya jawaban (wajib): jawab dalam Bahasa Indonesia, singkat dan langsung ke inti.
Maksimal 5 kalimat atau 5 poin pendek. Tanpa pembukaan, basa-basi, atau pengulangan pertanyaan.
Beri penjelasan panjang, kode lengkap, atau laporan detail hanya kalau pengguna memintanya secara eksplisit;
untuk pekerjaan di file, cukup laporkan apa yang diubah dan di mana.`;

const withProjectContext = (systemPrompt) => `${systemPrompt}${REPLY_STYLE}${projectContext()}`;

// Live team management (used by the office's agent panel).
const team = {
  setProject(project) {
    activeProject = project && project.name ? { name: project.name, path: project.path, git: project.git !== false } : null;
    console.log(`[hermes-adapter] Active project: ${activeProject ? activeProject.path : "(none)"}`);
  },
  ORCHESTRATOR_ID: AGENT_ID,
  upsert(member) {
    if (!member || member.id === AGENT_ID) return;
    registerTeamMember(member);
    broadcastRoster();
  },
  remove(id) {
    if (!id || id === AGENT_ID) return;
    agentRegistry.delete(id);
    clearHistory(`agent:${id}:${MAIN_KEY}`);
    broadcastRoster();
  },
};

loadTeamFromDisk();
loadHistoryFromDisk();
startAdapter();

// 💬 Kantor channel: the user says something in the office chat and one agent answers casually
// (a line or two, in character, no tools). Not saved in the agent's own chat history.
async function officeChat({ agent_id, message, context }) {
  const agent = agentRegistry.get(typeof agent_id === "string" ? agent_id.trim() : "");
  if (!agent) return { ok: false, error: "agen tidak ditemukan" };
  const text = String(message ?? "").trim().slice(0, 600);
  if (!text) return { ok: false, error: "pesan kosong" };
  const lines = (Array.isArray(context) ? context : []).slice(-10)
    .map((l) => `${String(l?.from ?? "").slice(0, 40)}: ${String(l?.text ?? "").slice(0, 300)}`);
  const system = `${agent.systemPrompt || `Kamu adalah ${agent.name}.`}\n\nSekarang kamu ada di obrolan santai kantor (channel Kantor) bersama rekan-rekan dan pengguna. Balas sebagai ${agent.name} dengan 1 sampai 2 kalimat pendek, ramah, dan natural dalam Bahasa Indonesia, sesuai kepribadianmu. Ini hanya ngobrol: jangan menjalankan tool atau perintah, jangan membuat file, dan jangan mendelegasikan tugas. Jangan menulis namamu di awal jawaban.`;
  const user = `${lines.length ? `Obrolan kantor sejauh ini:\n${lines.join("\n")}\n\n` : ""}Pengguna berkata: ${text}\n\nBalas sebagai ${agent.name}.`;
  try {
    const result = await streamOneTurn(
      [{ role: "system", content: system }, { role: "user", content: user }],
      agent.settings.model || HERMES_MODEL, [], null, null, null, 120_000,
    );
    recordUsage(agent.id, result);
    const escaped = agent.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let reply = String(result.textContent || "").trim().replace(new RegExp(`^\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*:\\s*`, "i"), "").trim();
    // a casual channel: at most three sentences, even if the model rambles
    const sentences = reply.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 3) reply = sentences.slice(0, 3).join("").trim();
    if (reply.length > 320) reply = `${reply.slice(0, 319)}…`;
    if (!reply) return { ok: false, error: `${agent.name} tidak menjawab` };
    return { ok: true, agent_id: agent.id, name: agent.name, text: reply };
  } catch (err) {
    return { ok: false, error: sanitizeErrorMessage(err) };
  }
}

// Handed to the MCP server (team-mcp.js): Hermes' tools for working with the real office agents.
const teamApi = {
  list: () => [...agentRegistry.values()].filter((a) => a.id !== AGENT_ID).map((a) => ({ id: a.id, name: a.name, role: a.role || "" })),
  delegate: execDelegateTask,
  context: execReadAgentContext,
};

module.exports = { team, TEAM_FILE, usage, teamApi, officeChat };
