// 📂 Berkas panel: browse the workspace folder the agents save into, open files in a
// new tab, download a file, or download a whole folder as .zip (server/files-api.js).

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
const when = (ms) => new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ICON = { html: "🌐", htm: "🌐", md: "📝", txt: "📄", json: "🧾", csv: "📊", svg: "🖼", png: "🖼", jpg: "🖼", jpeg: "🖼", gif: "🖼", webp: "🖼", pdf: "📕", css: "🎨", js: "📜" };
const iconOf = (name) => ICON[name.split(".").pop().toLowerCase()] || "📄";
const q = (p) => encodeURIComponent(p);
const readable = (name) => /\.(md|markdown|txt)$/i.test(name); // opened in the document reader (viewer.html)

export const initFiles = ({ getProject }) => {
  const panel = document.getElementById("files");
  const body = document.getElementById("files-body");
  const crumbs = document.getElementById("files-path");
  const status = document.getElementById("files-status");
  let cur = "";

  const go = async (rel) => {
    status.textContent = "Memuat…";
    status.className = "agents-status";
    try {
      const res = await fetch(`/api/files?path=${q(rel)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat");
      cur = data.path;
      render(data);
      status.textContent = "";
    } catch (err) {
      status.textContent = `⚠ ${err.message}`;
      status.className = "agents-status err";
    }
  };

  const render = (data) => {
    const parts = data.path ? data.path.split("/") : [];
    crumbs.innerHTML = `<button data-go="">workspace</button>` + parts.map((p, i) => ` / <button data-go="${esc(parts.slice(0, i + 1).join("/"))}">${esc(p)}</button>`).join("");
    const join = (n) => (data.path ? `${data.path}/${n}` : n);
    const rows = data.entries.map((e) => e.dir
      ? `<div class="f-row"><button class="f-name" data-go="${esc(join(e.name))}">📁 ${esc(e.name)}</button><span class="f-meta"></span><a class="f-act" href="/api/files/zip?path=${q(join(e.name))}" title="Unduh folder (.zip)">⬇ zip</a></div>`
      : `<div class="f-row"><a class="f-name" href="${readable(e.name) ? `/viewer.html?path=${q(join(e.name))}` : `/api/files/raw?path=${q(join(e.name))}`}" target="_blank" rel="noopener" title="${readable(e.name) ? "Baca dokumen (bisa disimpan sebagai PDF)" : "Buka di tab baru"}">${iconOf(e.name)} ${esc(e.name)}</a><span class="f-meta">${size(e.size)} · ${when(e.mtime)}</span><a class="f-act" href="/api/files/raw?path=${q(join(e.name))}&download=1" title="Unduh file">⬇</a></div>`).join("");
    const up = data.path ? `<div class="f-row"><button class="f-name" data-go="${esc(parts.slice(0, -1).join("/"))}">⬆ ..</button></div>` : "";
    const zipAll = `<a class="f-zip" href="/api/files/zip?path=${q(data.path)}">⬇ Unduh folder ini (.zip)</a>`;
    body.innerHTML = `${up}${rows || '<p class="f-empty">Folder ini kosong. Hasil kerja agen akan muncul di sini.</p>'}${zipAll}`;
  };

  panel.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-go]");
    if (b) go(b.dataset.go);
  });
  document.getElementById("files-refresh").onclick = () => go(cur);
  document.getElementById("files-close").onclick = () => panel.classList.add("hidden");
  document.getElementById("files-toggle").onclick = () => {
    if (!panel.classList.contains("hidden")) return panel.classList.add("hidden");
    panel.classList.remove("hidden");
    const project = getProject?.();
    go(cur || (project ? `${project}` : ""));
  };
};
