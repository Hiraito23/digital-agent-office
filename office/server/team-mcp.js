"use strict";
// MCP server that lets Hermes (the orchestrator) hand work to the real office agents.
//
// Why: the Hermes API server ignores tools that a client sends along with a chat request and
// runs its own tools. Its built-in delegate_task only creates anonymous helpers inside Hermes,
// so "Hermes asks Sakura" never reached the Sakura of the office. Hermes does support MCP
// servers, so the office offers its team as one (registered automatically, see hermes-setup.js).
//
//   POST /mcp   JSON-RPC 2.0 over streamable HTTP (plain JSON replies), Authorization: Bearer <API key>
//
// Tools:
//   team_list      the team members (id, name, role)
//   team_delegate  give a task to an agent; waits for the reply (default 100 s)
//   team_result    fetch the reply of a task that was still running
//   team_context   the recent conversation of an agent (what it is doing / has done)
// The agent works exactly as when you chat with it: it shows up working in the office (progress
// bar), its reply is saved in its chat and in the summaries.
const crypto = require("crypto");

const PROTOCOL = "2025-03-26";
const DEFAULT_WAIT = 100; // seconds; Hermes gives up on a tool call after a couple of minutes
const MAX_WAIT = 170;
const MAX_JOBS = 60;

const TOOLS = [
  {
    name: "team_list",
    description: "Daftar anggota tim kantor (id, nama, peran). Panggil ini untuk tahu agent_id yang valid sebelum team_delegate.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "team_delegate",
    description: "Beri tugas ke seorang anggota tim kantor (mis. Sakura, Kenji, Haruto). Agen itu mengerjakannya sendiri dengan persona dan skill-nya, lalu hasilnya dikembalikan di sini. Gunakan ini (bukan delegate_task bawaan) untuk menyuruh anggota tim. Tulis tugas selengkap mungkin: tujuan, konteks, hasil yang diharapkan.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "ID agen, mis. sakura-uiux (lihat team_list)" },
        task: { type: "string", description: "Tugas lengkap untuk agen itu" },
        wait_seconds: { type: "integer", description: `Berapa detik menunggu hasil (bawaan ${DEFAULT_WAIT}, 0 = langsung lanjut tanpa menunggu)` },
      },
      required: ["agent_id", "task"],
      additionalProperties: false,
    },
  },
  {
    name: "team_result",
    description: "Ambil hasil tugas yang tadinya belum selesai saat team_delegate (pakai task_id dari balasannya).",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        wait_seconds: { type: "integer", description: `Berapa detik menunggu (bawaan ${DEFAULT_WAIT})` },
      },
      required: ["task_id"],
      additionalProperties: false,
    },
  },
  {
    name: "team_context",
    description: "Baca percakapan terbaru seorang anggota tim untuk tahu apa yang sedang atau sudah ia kerjakan.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string" } },
      required: ["agent_id"],
      additionalProperties: false,
    },
  },
];

const text = (value, isError = false) => ({ content: [{ type: "text", text: String(value) }], isError });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clampWait = (v, fallback = DEFAULT_WAIT) => (Number.isFinite(Number(v)) ? Math.min(MAX_WAIT, Math.max(0, Math.floor(Number(v)))) : fallback);

const sameKey = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 262144) { reject(new Error("too large")); req.destroy(); }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

// api: { list() -> [{ id, name, role }], delegate({ agent_id, message }) -> JSON string, context({ agent_id }) -> JSON string }
const createTeamMcp = ({ api, authKey }) => {
  const jobs = new Map();
  let seq = 0;

  const nameOf = (id) => api.list().find((m) => m.id === id)?.name ?? id;

  const describe = (job) => {
    let out;
    try { out = JSON.parse(job.result); } catch { out = { ok: false, error: String(job.result) }; }
    if (!out.ok) return text(`${nameOf(job.agentId)} gagal mengerjakan tugas: ${out.error ?? "kesalahan tidak diketahui"}`, true);
    return text(`Hasil dari ${nameOf(job.agentId)} (${job.agentId}):\n\n${out.response || "(jawaban kosong)"}`);
  };
  const running = (job) => text(
    `${nameOf(job.agentId)} masih mengerjakan tugasnya (task_id: ${job.id}). Di kantor ia terlihat bekerja dan hasilnya tampil di chat-nya. `
    + `Panggil team_result dengan task_id itu untuk mengambil hasilnya, atau lanjutkan tugas lain dulu.`,
  );

  const callTool = async (name, args = {}) => {
    switch (name) {
      case "team_list": {
        const members = api.list();
        return text(members.length
          ? members.map((m) => `- ${m.id}: ${m.name}${m.role ? ` (${m.role})` : ""}`).join("\n")
          : "Belum ada anggota tim.");
      }
      case "team_delegate": {
        const agentId = String(args.agent_id ?? "").trim();
        const task = String(args.task ?? "").trim();
        if (!agentId || !task) return text("agent_id dan task wajib diisi.", true);
        if (!api.list().some((m) => m.id === agentId)) return text(`Agen "${agentId}" tidak ada. Panggil team_list untuk melihat daftar agen.`, true);
        const job = { id: `t${Date.now().toString(36)}${(seq++).toString(36)}`, agentId, task, startedAt: Date.now(), done: false, result: null };
        job.promise = api.delegate({ agent_id: agentId, message: task })
          .then((r) => { job.result = r; })
          .catch((err) => { job.result = JSON.stringify({ ok: false, error: err.message }); })
          .finally(() => { job.done = true; });
        jobs.set(job.id, job);
        while (jobs.size > MAX_JOBS) jobs.delete(jobs.keys().next().value);
        const wait = clampWait(args.wait_seconds);
        if (wait > 0) await Promise.race([job.promise, sleep(wait * 1000)]);
        return job.done ? describe(job) : running(job);
      }
      case "team_result": {
        const job = jobs.get(String(args.task_id ?? ""));
        if (!job) return text("task_id tidak dikenal (mungkin sudah terlalu lama).", true);
        if (!job.done) await Promise.race([job.promise, sleep(clampWait(args.wait_seconds) * 1000)]);
        return job.done ? describe(job) : running(job);
      }
      case "team_context": {
        const agentId = String(args.agent_id ?? "").trim();
        if (!api.list().some((m) => m.id === agentId)) return text(`Agen "${agentId}" tidak ada.`, true);
        let out;
        try { out = JSON.parse(api.context({ agent_id: agentId })); } catch { out = null; }
        if (!out?.ok) return text(out?.error ?? "Tidak bisa membaca percakapan agen itu.", true);
        return text(`${out.name} (${out.role || "tanpa peran"}), ${out.message_count} pesan; yang terbaru:\n\n${out.context}`);
      }
      default:
        return text(`Tool tidak dikenal: ${name}`, true);
    }
  };

  const rpc = async (msg) => {
    const { id, method, params } = msg ?? {};
    const reply = (result) => ({ jsonrpc: "2.0", id, result });
    const fail = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
    if (id === undefined) return null; // notification (e.g. notifications/initialized): no reply
    switch (method) {
      case "initialize":
        return reply({
          protocolVersion: params?.protocolVersion || PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "office-team", version: "1.0.0" },
          instructions: "Tim kantor Agentic Digital Office. Gunakan team_delegate untuk menyuruh anggota tim.",
        });
      case "ping":
        return reply({});
      case "tools/list":
        return reply({ tools: TOOLS });
      case "tools/call":
        try {
          return reply(await callTool(params?.name, params?.arguments));
        } catch (err) {
          return reply(text(`Gagal: ${err.message}`, true));
        }
      default:
        return fail(-32601, `Method not found: ${method}`);
    }
  };

  return async (req, res) => {
    const send = (status, data, headers = {}) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
      res.end(data === undefined ? "" : JSON.stringify(data));
    };
    const auth = String(req.headers.authorization ?? "");
    if (!authKey || !sameKey(auth, `Bearer ${authKey}`)) return send(401, { error: "unauthorized" });
    if (req.method === "DELETE") return send(200, {}); // end of an MCP session
    if (req.method !== "POST") return send(405, { error: "method tidak didukung" }, { Allow: "POST, DELETE" });
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return send(400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map(rpc))).filter(Boolean);
      return out.length ? send(200, out) : send(202);
    }
    const out = await rpc(body);
    return out ? send(200, out) : send(202);
  };
};

module.exports = { createTeamMcp, TOOLS };
