"use strict";
// Trending headlines for the agents' small talk (world/chatter.js).
//   GET /api/news   { items: [{ title, source, topic }], fetchedAt }
// Headlines come from the public Google News RSS feeds for Indonesia (technology, science,
// sports, entertainment, business). They are cached for 30 minutes, so the office makes
// only a handful of requests per hour, and nothing about the user or the agents is sent.
// Sad, violent, crime and political headlines are filtered out: the agents chat lightly.
// If the feeds cannot be reached the list is empty and the agents use their normal topics.
const TOPICS = {
  TECHNOLOGY: "teknologi",
  SCIENCE: "sains",
  SPORTS: "olahraga",
  ENTERTAINMENT: "hiburan",
  BUSINESS: "bisnis",
};
const FEED = (topic) => `https://news.google.com/rss/headlines/section/topic/${topic}?hl=id&gl=ID&ceid=ID:id`;
const TTL = 30 * 60 * 1000;
const PER_TOPIC = 8;

// Anything that is not suitable for casual, light conversation.
const BLOCKED = new RegExp([
  "tewas", "meninggal", "wafat", "korban", "jenazah", "pembunuh", "bunuh", "tikam", "tembak", "bom\\b", "teror", "perang",
  "serangan", "kekerasan", "pemerkosa", "asusila", "pelecehan", "cabul", "narkoba", "judi", "judol", "korupsi", "suap",
  "ditangkap", "tersangka", "terdakwa", "vonis", "penjara", "dipecat", "kecelakaan", "bencana", "gempa", "banjir", "longsor",
  "kebakaran", "tsunami", "erupsi", "darurat", "krisis", "resesi", "phk", "demo\\b", "kerusuhan", "politik", "pemilu", "pilkada",
  "pilpres", "partai", "caleg", "presiden", "menteri", "dpr\\b", "sara\\b", "hoaks", "hoax", "penipuan", "scam", "peretas", "bocor",
  "virus", "wabah", "pandemi", "kanker", "bunuh diri", "gugat", "cerai", "selingkuh", "skandal", "viral",
].join("|"), "i");

const decode = (s) => s
  .replace(/<!\[CDATA\[|\]\]>/g, "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/<[^>]+>/g, "")
  .replace(/\s+/g, " ").trim();

const parseFeed = (xml, topic) => {
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const body = m[1];
    const rawTitle = /<title>([\s\S]*?)<\/title>/.exec(body)?.[1];
    if (!rawTitle) continue;
    const source = decode(/<source[^>]*>([\s\S]*?)<\/source>/.exec(body)?.[1] ?? "");
    let title = decode(rawTitle);
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim(); // "Judul - Sumber"
    if (title.length < 20 || title.length > 140 || BLOCKED.test(title)) continue;
    if (title === title.toUpperCase()) continue; // shouting headlines
    out.push({ title, source: source.replace(/^www\./, ""), topic });
    if (out.length >= PER_TOPIC) break;
  }
  return out;
};

let cache = { at: 0, items: [] };
let pending = null;

const refresh = async () => {
  const lists = await Promise.all(Object.entries(TOPICS).map(async ([topic, label]) => {
    try {
      const res = await fetch(FEED(topic), { signal: AbortSignal.timeout(7000), headers: { "User-Agent": "Mozilla/5.0 (office-news)" } });
      return res.ok ? parseFeed(await res.text(), label) : [];
    } catch {
      return [];
    }
  }));
  const seen = new Set();
  const items = lists.flat().filter((i) => (seen.has(i.title) ? false : seen.add(i.title)));
  // keep the previous list when every feed failed
  cache = { at: Date.now(), items: items.length ? items : cache.items };
  return cache;
};

const getNews = async () => {
  if (Date.now() - cache.at < TTL) return cache;
  pending ??= refresh().finally(() => { pending = null; });
  return pending;
};

const createNewsApi = () => async (req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "method tidak didukung" }));
  }
  const { items, at } = await getNews();
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  return res.end(JSON.stringify({ items, fetchedAt: at }));
};

module.exports = { createNewsApi, parseFeed, BLOCKED };
