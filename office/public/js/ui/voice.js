// Per-agent voices with the browser's built-in speech (Web Speech API).
// Free and local. In Microsoft Edge the list also includes Microsoft's
// "Online (Natural)" voices (e.g. Gadis, Ardi for Indonesian) at no cost.
//
// Voice config per agent (people.json → "voice"):
//   { "lang": "id-ID", "gender": "female" | "male", "prefer": ["Gadis"], "pitch": 1.1, "rate": 1.0 }

const STORE_KEY = "kantor-hermes-voice";
const MALE = /ardi|andika|male|pria|david|guy|mark|ryan|christopher|eric/i;
const FEMALE = /gadis|damayanti|female|wanita|zira|aria|jenny|hazel|susan|google bahasa indonesia/i;

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
let voices = [];
const loadVoices = () => {
  voices = synth ? synth.getVoices() : [];
};
if (synth) {
  loadVoices();
  synth.addEventListener?.("voiceschanged", loadVoices);
}

const genderOf = (v) => (FEMALE.test(v.name) ? "female" : MALE.test(v.name) ? "male" : "unknown");
const quality = (v) => (/natural|online|neural|google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);

export const pickVoice = (cfg = {}) => {
  if (!voices.length) loadVoices();
  const lang = (cfg.lang || "id-ID").toLowerCase();
  const base = lang.split("-")[0];
  for (const want of cfg.prefer ?? []) {
    const hit = voices.find((v) => v.name.toLowerCase().includes(String(want).toLowerCase()));
    if (hit) return hit;
  }
  const sameLang = voices.filter((v) => v.lang.toLowerCase().replace("_", "-") === lang);
  const sameBase = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  // No voice for this language: let the browser choose by `lang` rather than
  // reading Indonesian with an English voice.
  const pool = sameLang.length ? sameLang : sameBase;
  if (!pool.length) return null;
  const byGender = cfg.gender ? pool.filter((v) => genderOf(v) === cfg.gender) : [];
  const list = (byGender.length ? byGender : pool).slice().sort((a, b) => quality(b) - quality(a));
  return list[0] ?? null;
};

// Speakable text: no code, links or markdown; first sentences only.
export const toSpeech = (text, maxChars = 240) => {
  let s = String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= maxChars) return s;
  const cut = s.slice(0, maxChars);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  s = end > 60 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
  return s;
};

export class VoiceBox {
  constructor({ onStart, onEnd } = {}) {
    this.configs = {};
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.queue = [];
    this.busy = false;
    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch { /* ignore */ }
    this.enabled = saved === null ? true : saved === "on";
  }

  get supported() {
    return Boolean(synth);
  }

  // Resolves once the browser has listed its voices (Chrome loads them async).
  whenReady() {
    if (!synth) return Promise.resolve([]);
    if (voices.length) return Promise.resolve(voices);
    return new Promise((resolve) => {
      const done = () => { loadVoices(); resolve(voices); };
      synth.addEventListener?.("voiceschanged", done, { once: true });
      setTimeout(done, 2000);
    });
  }

  // Voices this browser offers, Indonesian first, then by name.
  availableVoices() {
    if (!voices.length) loadVoices();
    const isId = (v) => v.lang.toLowerCase().startsWith("id");
    return voices
      .map((v) => ({ name: v.name, lang: v.lang, indonesian: isId(v), gender: genderOf(v) }))
      .sort((a, b) => Number(b.indonesian) - Number(a.indonesian) || a.name.localeCompare(b.name));
  }

  hasLanguage(lang = "id") {
    return voices.some((v) => v.lang.toLowerCase().startsWith(lang));
  }

  setConfigs(map) {
    this.configs = map || {};
  }

  setEnabled(on) {
    this.enabled = on;
    try { localStorage.setItem(STORE_KEY, on ? "on" : "off"); } catch { /* ignore */ }
    if (!on) this.stop();
  }

  stop() {
    this.queue = [];
    if (synth) synth.cancel();
    if (this.current) this.onEnd?.(this.current);
    this.current = null;
    this.busy = false;
  }

  describe(agentId) {
    const v = pickVoice(this.configs[agentId]);
    return v ? `${v.name} (${v.lang})` : "suara bawaan browser";
  }

  // `config` overrides the saved voice (used to preview unsaved settings).
  speak(agentId, text, { force = false, config = null } = {}) {
    if (!synth || (!this.enabled && !force)) return;
    const line = toSpeech(text);
    if (!line) return;
    this.queue.push({ agentId, line, config });
    this.next();
  }

  next() {
    if (this.busy || !this.queue.length) return;
    const { agentId, line, config } = this.queue.shift();
    const cfg = config ?? this.configs[agentId] ?? {};
    const u = new SpeechSynthesisUtterance(line);
    const voice = pickVoice(cfg);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = cfg.lang || "id-ID";
    }
    u.pitch = Math.max(0, Math.min(2, cfg.pitch ?? 1));
    u.rate = Math.max(0.5, Math.min(2, cfg.rate ?? 1));
    u.volume = Math.max(0, Math.min(1, cfg.volume ?? 1));
    this.busy = true;
    this.current = agentId;
    const done = () => {
      if (this.current === agentId) this.onEnd?.(agentId);
      this.current = null;
      this.busy = false;
      setTimeout(() => this.next(), 250);
    };
    u.onstart = () => this.onStart?.(agentId);
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  }
}
