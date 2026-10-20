// 📎 Lampiran: pick files from the workspace (the 📂 Berkas folders, for example the meeting minutes in
// rapat/) and attach them to the next chat message. The text of each file goes to the agent as
// context; the chat bubble only shows the file names (see splitAttachments, used when bubbles are drawn).
// Text files up to 200 KB each, at most 5 files, 40,000 characters in total.

const MAX_FILES = 5;
const MAX_BYTES = 200 * 1024;
const MAX_TOTAL = 40_000;
const TEXT_EXT = new Set(["md", "markdown", "txt", "json", "csv", "tsv", "yml", "yaml", "xml", "html", "htm", "css", "js", "mjs", "ts", "tsx", "jsx", "py", "sql", "sh", "log", "ini", "toml", "env", "conf"]);
const MARK = "\n\n📎 Berkas terlampir:\n";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const extOf = (name) => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");
const isText = (name) => TEXT_EXT.has(extOf(name));
const size = (n) => (n >= 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

// The message that goes to the agent: your text, then every attached file between triple quotes.
export const withAttachments = (text, files) => {
  if (!files.length) return text;
  const body = files.map((f) => `### ${f.path}\n"""\n${f.text}\n"""`).join("\n\n");
  return `${text}${MARK}${body}`;
};

// For drawing a bubble: { text, files: [path, ...] } from a message that may contain attachments.
export const splitAttachments = (content) => {
  const i = String(content ?? "").indexOf(MARK);
  if (i < 0) return { text: content, files: [] };
  const files = [...content.slice(i).matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  return { text: content.slice(0, i), files };
};

export const initAttach = ({ onChange }) => {
  const button = document.getElementById("attach-btn");
  const chips = document.getElementById("chat-attachments");
  const pop = document.createElement("div");
  pop.className = "attach-pop hud";
  pop.hidden = true;
  document.body.append(pop);

  const files = []; // { path, name, text }
  let dir = "";
  let listing = null;
  let recent = [];
  let busy = "";

  const total = () => files.reduce((n, f) => n + f.text.length, 0);

  const renderChips = () => {
    chips.hidden = !files.length;
    chips.innerHTML = files.map((f, i) => `<span class="att-chip" title="${esc(f.path)}">📎 ${esc(f.name)} <small>${f.text.length.toLocaleString("id-ID")} karakter</small><button type="button" data-remove="${i}" title="Lepas">✕</button></span>`).join("");
    button.classList.toggle("has-files", files.length > 0);
    onChange?.(files);
  };

  const get = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    return res;
  };

  // Adds a file by its workspace path (also used by "Lanjutkan ke Hermes"); returns an error message or "".
  const add = async (path, size0 = 0) => {
    const name = path.split("/").pop();
    if (files.some((f) => f.path === path)) return "";
    if (files.length >= MAX_FILES) return `Maksimal ${MAX_FILES} berkas`;
    if (!isText(name)) return "Hanya berkas teks (.md, .txt, .json, .csv, kode, ...) yang bisa dilampirkan";
    if (size0 > MAX_BYTES) return `Berkas terlalu besar (maks. ${MAX_BYTES / 1024} KB)`;
    try {
      const text = (await (await get(`/api/files/raw?path=${encodeURIComponent(path)}`)).text()).trim();
      if (!text) return "Berkas kosong";
      if (total() + text.length > MAX_TOTAL) return "Total lampiran terlalu panjang";
      files.push({ path, name, text });
      renderChips();
      return "";
    } catch (err) {
      return err.message;
    }
  };

  // ---- the picker -----------------------------------------------------------------

  const crumbs = () => {
    const parts = dir ? dir.split("/") : [];
    return [`<button data-open="">⌂ Akar</button>`].concat(parts.map((p, i) => `<button data-open="${esc(parts.slice(0, i + 1).join("/"))}">${esc(p)}</button>`)).join('<span class="sep">›</span>');
  };

  const render = (error = "") => {
    const rows = (listing?.entries ?? []).map((e) => {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.dir) return `<li data-open="${esc(rel)}"><span class="name">📁 ${esc(e.name)}</span></li>`;
      const ok = isText(e.name);
      const on = files.some((f) => f.path === rel);
      return `<li class="file${ok ? "" : " off"}${on ? " on" : ""}" ${ok ? `data-pick="${esc(rel)}" data-size="${e.size}"` : ""} title="${ok ? "Klik untuk melampirkan" : "Bukan berkas teks"}"><span class="name">${on ? "✓ " : "📄 "}${esc(e.name)}</span><small>${size(e.size)}</small></li>`;
    }).join("");
    pop.innerHTML = `
      <div class="ap-head"><b>📎 Lampirkan berkas</b><button data-close title="Tutup">✕</button></div>
      ${recent.length ? `<div class="ap-recent"><small>Hasil rapat terbaru</small>${recent.map((r) => `<button data-pick="${esc(r.path)}" data-size="${r.size}" class="${files.some((f) => f.path === r.path) ? "on" : ""}" title="${esc(r.path)}">${esc(r.name.replace(/\.md$/, ""))}</button>`).join("")}</div>` : ""}
      <div class="ap-crumbs">${crumbs()}</div>
      ${error ? `<p class="ap-err">${esc(error)}</p>` : busy ? `<p class="muted">${esc(busy)}</p>` : ""}
      <ul class="ap-list">${rows || `<li class="empty">Folder kosong.</li>`}</ul>
      <small class="ap-note">Isi berkas dikirim ke agen sebagai konteks (maks. ${MAX_FILES} berkas, teks saja). ${files.length ? `Terlampir: ${files.length}.` : ""}</small>`;
  };

  const open = async (rel) => {
    try {
      listing = await (await get(`/api/files?path=${encodeURIComponent(rel)}`)).json();
      dir = listing.path;
      render();
    } catch (err) {
      listing = null;
      render(err.message);
    }
  };

  const show = async () => {
    pop.hidden = false;
    const r = button.getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(window.innerWidth - 368, Math.round(r.left)))}px`;
    pop.style.bottom = `${Math.round(window.innerHeight - r.top + 8)}px`;
    try { // the newest meeting minutes first
      const meetings = await (await get("/api/files?path=rapat")).json();
      recent = meetings.entries.filter((e) => !e.dir && isText(e.name)).sort((a, b) => b.mtime - a.mtime).slice(0, 5)
        .map((e) => ({ path: `rapat/${e.name}`, name: e.name, size: e.size }));
    } catch { recent = []; }
    await open(recent.length ? "rapat" : dir);
  };

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (pop.hidden) show();
    else pop.hidden = true;
  });
  pop.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (e.target.closest("[data-close]")) { pop.hidden = true; return; }
    const pick = e.target.closest("[data-pick]");
    if (pick) {
      const path = pick.dataset.pick;
      const i = files.findIndex((f) => f.path === path);
      if (i >= 0) { files.splice(i, 1); renderChips(); render(); return; }
      busy = "Membaca berkas…";
      render();
      const err = await add(path, Number(pick.dataset.size) || 0);
      busy = "";
      render(err);
      return;
    }
    const target = e.target.closest("[data-open]");
    if (target) open(target.dataset.open);
  });
  chips.addEventListener("click", (e) => {
    const i = e.target.closest("[data-remove]")?.dataset.remove;
    if (i !== undefined) { files.splice(Number(i), 1); renderChips(); if (!pop.hidden) render(); }
  });
  document.addEventListener("pointerdown", (e) => { if (!pop.hidden && !pop.contains(e.target) && !button.contains(e.target)) pop.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") pop.hidden = true; });

  renderChips();
  return {
    add,
    files: () => files.slice(),
    clear: () => { files.length = 0; renderChips(); },
  };
};
