"use strict";
// Summaries of finished agent replies, shown in the office's 📋 RINGKASAN list.
// Each entry: { id, agentId, kind: "chat" | "meeting", at, task, summary }.
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
          entries.push({ id: newId(), agentId, kind: "chat", at, task: summarize(q.content, 120), summary: summarize(a.content) });
        }
      }
      entries = entries.slice(-MAX_ENTRIES);
      if (entries.length) save();
    } catch { /* no history yet */ }
  };

  try {
    entries = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(entries)) entries = [];
  } catch {
    backfill();
  }

  return {
    // Record a finished reply; returns the entry (broadcast it to the office).
    add({ agentId, kind = "chat", task, text, summary }) {
      const entry = {
        id: newId(), agentId, kind, at: Date.now(),
        task: summarize(task, 120), summary: summary ? summarize(summary, 600) : summarize(text),
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
    removeAgent(agentId) {
      entries = entries.filter((e) => e.agentId !== agentId);
      save();
    },
  };
};

module.exports = { createSummaries, summarize };
