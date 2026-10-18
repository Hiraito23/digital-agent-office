"use strict";
// Token usage per agent and per model, kept per day so the 📊 Pemakaian panel can show
// daily, weekly and monthly totals. Hermes reports `usage` (prompt/completion tokens) on
// every reply; the adapter calls record() with it.
// Saved next to the chat history (office-data volume) so it survives restarts:
//   { "2026-10-18": { "<agentId>": { "<model>": { calls, input, output } } } }
const fs = require("fs");
const path = require("path");

const TZ = process.env.OFFICE_TZ || "Asia/Jakarta";
const KEEP_DAYS = 400;

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayKey = (ms) => dayFmt.format(new Date(ms)); // YYYY-MM-DD in the office timezone

const addDays = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekStart = (key) => addDays(key, -((new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7)); // Monday
const monthStart = (key) => `${key.slice(0, 7)}-01`;

const RANGES = {
  daily: { count: 7, start: (k) => k, next: (k) => addDays(k, 1) },
  weekly: { count: 8, start: weekStart, next: (k) => addDays(k, 7) },
  monthly: { count: 6, start: monthStart, next: (k) => { const d = new Date(`${k}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 10); } },
};

const createUsage = ({ file }) => {
  let days = {};
  try { days = JSON.parse(fs.readFileSync(file, "utf8")) || {}; } catch { days = {}; }

  let timer = null;
  const save = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const keys = Object.keys(days).sort();
        for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[k];
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const tmp = `${file}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(days));
        fs.renameSync(tmp, file);
      } catch (err) {
        console.warn("[usage] could not save:", err.message);
      }
    }, 500);
  };

  const record = ({ agentId, model, input, output, at = Date.now() }) => {
    const inTok = Number(input) || 0;
    const outTok = Number(output) || 0;
    if (!agentId || (!inTok && !outTok)) return;
    const slot = ((days[dayKey(at)] ||= {})[agentId] ||= {});
    const m = (slot[model || "(tidak diketahui)"] ||= { calls: 0, input: 0, output: 0 });
    m.calls += 1;
    m.input += inTok;
    m.output += outTok;
    save();
  };

  // range: daily (last 7 days) | weekly (last 8 weeks, Monday start) | monthly (last 6 months).
  const report = (range = "daily") => {
    const cfg = RANGES[range] || RANGES.daily;
    const today = dayKey(Date.now());
    let starts = [cfg.start(today)];
    for (let i = 1; i < cfg.count; i++) starts.unshift(cfg.start(addDays(starts[0], -1)));
    const periods = starts.map((s) => ({ key: s, end: addDays(cfg.next(s), -1) }));
    const first = starts[0];
    const index = (key) => {
      const s = cfg.start(key);
      return starts.indexOf(s);
    };

    const agents = {};
    const empty = () => ({ calls: 0, input: 0, output: 0 });
    const add = (t, m) => { t.calls += m.calls; t.input += m.input; t.output += m.output; };
    const total = empty();
    for (const [day, perAgent] of Object.entries(days)) {
      if (day < first) continue;
      const i = index(day);
      if (i < 0) continue;
      for (const [agentId, models] of Object.entries(perAgent)) {
        const a = (agents[agentId] ||= { total: empty(), models: {}, series: starts.map(empty) });
        for (const [model, m] of Object.entries(models)) {
          add(a.total, m);
          add((a.models[model] ||= empty()), m);
          add(a.series[i], m);
          add(total, m);
        }
      }
    }
    return { range: RANGES[range] ? range : "daily", timezone: TZ, periods, total, agents };
  };

  return { record, report };
};

module.exports = { createUsage };
