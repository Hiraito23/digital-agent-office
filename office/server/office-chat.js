"use strict";
// POST /api/office-chat { agent_id, message, context: [{ from, text }] }
// The Kantor tab of the chat box is a casual office channel: when the user writes there, one
// agent (chosen by the browser) answers in a line or two. See officeChat() in the adapter.
const send = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 65536) { reject(new Error("data terlalu besar")); req.destroy(); }
    });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("JSON tidak valid")); } });
    req.on("error", reject);
  });

const createOfficeChatApi = ({ officeChat }) => async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method tidak didukung" });
  try {
    const body = await readBody(req);
    const result = await officeChat({ agent_id: String(body.agent_id ?? ""), message: body.message, context: body.context });
    return send(res, result.ok ? 200 : 400, result);
  } catch (err) {
    return send(res, 400, { ok: false, error: err.message || "gagal" });
  }
};

module.exports = { createOfficeChatApi };
