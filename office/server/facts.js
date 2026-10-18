"use strict";
// Interesting facts for the agents' small talk (world/chatter.js), collected from Indonesian
// Wikipedia and kept in a growing pool (saved in the office-data volume, so it survives restarts).
//   GET /api/facts?limit=150   { items: [{ text, title, topic, kind, source }], total }
// How: every 30 minutes (and many times right after the first start) a handful of Wikipedia
// categories (candi, hewan, planet, penemuan, rekor dunia, fisika, biologi, ... and their
// subcategories) are sampled; the first sentence of the intro of random articles becomes a
// fact. Biographies, villages, lists and sad/violent/political topics are skipped. Only the
// public Wikipedia API is called, with no information about the user.
const fs = require("fs");
const path = require("path");
const { BLOCKED } = require("./news.js");

const API = "https://id.wikipedia.org/w/api.php";
const UA = "AgenticDigitalOffice/1.0 (https://github.com/Hiraito23/digital-agent-office; office small talk)";
const FILE = process.env.FACTS_FILE || path.join(process.env.HOME || "/tmp", ".hermes", "office-facts.json");
const MAX_POOL = 1500;
const TARGET_FIRST = 220; // facts to collect quickly on a fresh start
const REFRESH_MS = 30 * 60 * 1000;

// Categories with interesting articles (each is expanded into subcategories now and then).
const CATEGORIES = [
  "Candi di Indonesia", "Tarian Indonesia", "Gunung berapi di Indonesia", "Danau di Indonesia", "Alat musik Indonesia",
  "Planet", "Hewan", "Penemuan", "Rekor dunia", "Fenomena alam", "Teknologi", "Permainan video", "Olahraga",
  "Minuman Indonesia", "Taman nasional di Indonesia", "Pulau di Indonesia", "Astronomi", "Fisika", "Biologi",
  "Matematika", "Sejarah Indonesia", "Bangunan bersejarah di Indonesia", "Mamalia", "Ikan", "Burung di Indonesia",
  "Makanan Indonesia", "Tumbuhan endemik Indonesia", "Kimia", "Geografi", "Ilmu komputer", "Internet", "Musik", "Film",
  "Kuliner", "Seni", "Arsitektur", "Transportasi", "Luar angkasa", "Samudra", "Hutan", "Serangga", "Reptil", "Amfibi",
];

const BIO = /(adalah seorang|adalah salah satu (?:tokoh|pemain|penyanyi|aktor|aktris|politikus|pengusaha)|\blahir\b|dilahirkan|\bwafat\b|\bmeninggal\b)/i;
const PLACE_STUB = /(desa|kelurahan|kecamatan|kabupaten|dusun|kampung|nagari|gampong|distrik|dukuh)\b.*\b(di|dalam)\b.*\b(provinsi|kabupaten|kota|Indonesia)/i;

// dry textbook definitions are skipped; striking ones (largest, oldest, endemic, ...) are marked `fun`
const DRY = /^(?:Dalam|Pada|Di) (?:bidang )?(?:matematika|kalkulus|aljabar|fisika|kimia|geometri|statistika|ilmu komputer|logika|teori)/i;
const FUN = /(terbesar|terkecil|tertua|terpanjang|tertinggi|terdalam|terkenal|satu-satunya|pertama|endemik|langka|unik|rekor|ditemukan|populer|khas|tradisional|legendaris|bersejarah|megah|indah|cepat|kuat)/i;

let pool = new Map(); // title -> { text, title, topic, kind, source }
let timer = null;
let running = false;

try {
  for (const f of JSON.parse(fs.readFileSync(FILE, "utf8")).facts ?? []) {
    if (f?.title && f?.text) pool.set(f.title, { ...f, fun: f.fun ?? FUN.test(f.text) });
  }
} catch { /* first start */ }

let saveTimer = null;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      const tmp = `${FILE}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ facts: [...pool.values()] }));
      fs.renameSync(tmp, FILE);
    } catch (err) {
      console.warn("[facts] could not save:", err.message);
    }
  }, 1000);
};

const wiki = async (params) => {
  const url = `${API}?format=json&origin=*&${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json();
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// Articles and subcategories of a category.
const members = async (category) => {
  const out = { pages: [], subcats: [] };
  for (const [type, key] of [["page", "pages"], ["subcat", "subcats"]]) {
    const r = await wiki({ action: "query", list: "categorymembers", cmtitle: `Kategori:${category}`, cmtype: type, cmnamespace: type === "page" ? "0" : "14", cmlimit: "200" });
    out[key] = (r.query?.categorymembers ?? []).map((m) => m.title);
  }
  return out;
};

// First sentence(s) of the intro, without parentheses, 40..210 characters.
const toFact = (extract) => {
  const clean = String(extract || "").replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [clean];
  let fact = sentences[0].trim();
  if (fact.length < 45 && sentences[1]) fact = `${fact} ${sentences[1].trim()}`;
  if (fact.length > 210) {
    const cut = fact.slice(0, 207);
    fact = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 80))}…`;
  }
  return fact;
};

const accept = (title, extract) => {
  if (!extract || extract.length < 60 || title.startsWith("Daftar ") || /\(disambiguasi\)/i.test(title)) return null;
  if (DRY.test(extract) || BLOCKED.test(extract) || BLOCKED.test(title) || BIO.test(extract) || PLACE_STUB.test(extract.slice(0, 200))) return null;
  const text = toFact(extract);
  if (text.length < 40 || BLOCKED.test(text)) return null;
  return text;
};

// Samples one category (sometimes one of its subcategories) and adds new facts to the pool.
const sample = async (category, depth = 0) => {
  const { pages, subcats } = await members(category);
  if (subcats.length && depth < 2 && (pages.length < 8 || Math.random() < 0.5)) {
    return sample(pick(subcats).replace(/^Kategori:/, ""), depth + 1);
  }
  const titles = shuffle(pages).filter((t) => !pool.has(t)).slice(0, 20);
  if (!titles.length) return 0;
  const r = await wiki({ action: "query", prop: "extracts", exintro: "1", explaintext: "1", exsentences: "3", exlimit: "20", titles: titles.join("|") });
  let added = 0;
  for (const p of Object.values(r.query?.pages ?? {})) {
    const text = accept(p.title, p.extract);
    if (!text || pool.has(p.title)) continue;
    pool.set(p.title, { text, title: p.title, topic: category, kind: "fakta", source: "Wikipedia", fun: FUN.test(p.extract) });
    added += 1;
  }
  return added;
};

const refresh = async (rounds) => {
  if (running) return;
  running = true;
  try {
    let added = 0;
    for (let i = 0; i < rounds; i += 1) {
      try { added += await sample(pick(CATEGORIES)); } catch (err) { console.warn("[facts]", err.message); }
      await new Promise((r) => setTimeout(r, 400)); // be gentle with Wikipedia
    }
    while (pool.size > MAX_POOL) pool.delete(pool.keys().next().value); // the oldest go first
    if (added) { save(); console.log(`[facts] +${added} fakta (total ${pool.size})`); }
  } finally {
    running = false;
  }
};

const start = () => {
  if (timer) return;
  // a fresh start collects a first batch quickly, later refreshes are small
  const warmUp = async () => {
    for (let i = 0; i < 12 && pool.size < TARGET_FIRST; i += 1) await refresh(6);
  };
  setTimeout(() => warmUp().catch(() => {}), 6000);
  timer = setInterval(() => refresh(6).catch(() => {}), REFRESH_MS);
  timer.unref?.();
};

const createFactsApi = () => {
  start();
  return async (req, res) => {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "method tidak didukung" }));
    }
    const limit = Math.min(300, Math.max(1, Number(new URL(req.url, "http://x").searchParams.get("limit")) || 150));
    const items = shuffle([...pool.values()]).slice(0, limit);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(JSON.stringify({ items, total: pool.size }));
  };
};

module.exports = { createFactsApi, toFact, accept };
