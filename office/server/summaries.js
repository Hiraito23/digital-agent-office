"use strict";
// Summaries of finished agent replies, shown in the office's 📋 RINGKASAN list.
// Each entry: { id, agentId, kind: "chat" | "meeting", at, task, summary, read }.
// `read` is set only by the user (checkbox in the list).
// Saved next to the chat history (office-data volume) so the list survives
// restarts. On first run the list is filled from the existing chat history.
const fs = require("fs");
const path = require("path");

const MAX_ENTRIES = 200;

// Plain one-paragraph summary: no code blocks or markdown, first sentences only.
const summarize = (text, max = 220) => {
  const clean = String(text || "")
    .replace(/```[\s\S]*?```/g, " [kode] ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return stop > max * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
};

const createSummaries = ({ file, historyFile }) => {
  let entries = [];
  let seq = 0;
  const newId = () => `s-${Date.now().toString(36)}-${(seq++).toString(36)}`;

  const save = () => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(entries, null, 2));
      fs.renameSync(tmp, file);
    } catch (err) {
      console.warn("[summaries] could not save:", err.message);
    }
  };

  // Past conversations from the chat history: one entry per user/assistant pair.
  const backfill = () => {
    try {
      const at = fs.statSync(historyFile).mtimeMs;
      const history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
      for (const [key, messages] of Object.entries(history)) {
        const agentId = key.split(":")[1];
        if (!agentId || !Array.isArray(messages)) continue;
        for (let i = 0; i + 1 < messages.length; i++) {
          const q = messages[i];
          const a = messages[i + 1];
          if (q.role !== "user" || a.role !== "assistant" || typeof a.content !== "string" || !a.content.trim()) continue;
          if (a.error || a.content.trim().startsWith("⚠")) continue; // failed replies are not summaries
          entries.push({ id: newId(), agentId, kind: "chat", at, task: summarize(q.content, 120), summary: summarize(a.content), msgIndex: i + 1 });
        }
      }
      entries = entries.slice(-MAX_ENTRIES);
      if (entries.length) save();
    } catch { /* no history yet */ }
  };

  // Older entries without a link to their reply: find it in the history by the
  // task text (each user/assistant pair is used once, oldest first).
  const linkOld = () => {
    let history = {};
    try { history = JSON.parse(fs.readFileSync(historyFile, "utf8")); } catch { return; }
    const used = new Set();
    let changed = false;
    for (const e of entries) {
      if (e.msgAt || Number.isInteger(e.msgIndex) || e.kind !== "chat") continue;
      const messages = history[`agent:${e.agentId}:main`] || [];
      for (let i = 0; i + 1 < messages.length; i++) {
        const key = `${e.agentId}:${i}`;
        if (used.has(key) || messages[i].role !== "user" || messages[i + 1].role !== "assistant") continue;
        if (summarize(messages[i].content, 120) !== e.task) continue;
        used.add(key);
        e.msgIndex = i + 1;
        changed = true;
        break;
      }
    }
    if (changed) save();
  };

  try {
    entries = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(entries)) entries = [];
    linkOld();
  } catch {
    backfill();
  }

  return {
    // Record a finished reply; returns the entry (broadcast it to the office).
    // msgAt: the `at` of the reply in the chat history, so the office can jump to it.
    add({ agentId, kind = "chat", task, text, summary, msgAt }) {
      const entry = {
        id: newId(), agentId, kind, at: Date.now(), msgAt: msgAt ?? null,
        task: summarize(task, 120),
        // Meeting minutes keep their lines (Ringkasan / Keputusan / Action item).
        summary: kind === "meeting" ? String(summary || text || "").trim().slice(0, 1500) : summarize(summary || text),
      };
      if (!entry.summary) return null;
      entries.push(entry);
      if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
      save();
      return entry;
    },
    // Newest first.
    list(limit = 100) {
      return entries.slice(-limit).reverse();
    },
    // The user ticks an entry as read (or unread) in the 📋 RINGKASAN list.
    setRead(id, read) {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return null;
      entry.read = Boolean(read);
      save();
      return entry;
    },
    removeAgent(agentId) {
      entries = entries.filter((e) => e.agentId !== agentId);
      save();
    },
  };
};

module.exports = { createSummaries, summarize };
