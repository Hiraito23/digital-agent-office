// 📁 Project picker in the header. Opens a folder browser over the workspace the agents may
// access (PROJECTS_DIR from .env, mounted as /workspace): open folders, then pick any folder as
// the active project (git repos are marked and also listed as shortcuts). The adapter gives
// every agent that folder and, for a git repo, the branch rules. The listing is read on demand.

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const initProjectPicker = ({ onChange }) => {
  const button = document.getElementById("project-select");
  let active = null;
  let root = "/workspace";
  let repos = [];
  let dir = ""; // folder shown in the browser (relative to the workspace)

  const pop = document.createElement("div");
  pop.className = "project-pop hud";
  pop.hidden = true;
  document.body.append(pop);

  const syncButton = () => {
    button.value = active ?? "";
    button.textContent = active ? `📁 ${active}` : "📁 Pilih proyek…";
    button.title = active ? `Agen bekerja di ${root}/${active}. Klik untuk mengganti folder` : `Pilih folder di ${root} yang boleh dikerjakan agen`;
    button.classList.toggle("active", Boolean(active));
  };

  const get = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "gagal memuat");
    return data;
  };

  const choose = async (name) => {
    const res = await fetch("/api/projects/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      onChange?.({ error: data.error || "gagal memilih proyek" });
      return;
    }
    active = data.active;
    syncButton();
    pop.hidden = true;
    onChange?.({ name: data.active, path: data.path });
  };

  const crumbs = () => {
    const parts = dir ? dir.split("/") : [];
    return [`<button data-open="" title="${esc(root)}">⌂ Akar</button>`]
      .concat(parts.map((p, i) => `<button data-open="${esc(parts.slice(0, i + 1).join("/"))}">${esc(p)}</button>`))
      .join('<span class="sep">›</span>');
  };

  const render = (listing, error = "") => {
    const here = listing?.path ?? dir;
    pop.innerHTML = `
      <div class="pp-head"><b>📁 Folder proyek</b><button data-close title="Tutup">✕</button></div>
      <div class="pp-crumbs">${crumbs()}</div>
      ${error ? `<p class="pp-err">${esc(error)}</p>` : ""}
      <ul class="pp-list">
        ${listing?.parent !== null && listing?.parent !== undefined ? `<li data-open="${esc(listing.parent)}" class="up"><span>↩ Naik satu folder</span></li>` : ""}
        ${(listing?.folders ?? []).map((f) => {
          const rel = here ? `${here}/${f.name}` : f.name;
          return `<li data-open="${esc(rel)}"><span class="name">📁 ${esc(f.name)}</span>${f.git ? `<small class="git">git · ${esc(f.branch)}</small>` : ""}<button data-pick="${esc(rel)}" title="Jadikan proyek aktif">Pilih</button></li>`;
        }).join("") || (listing ? `<li class="empty">Tidak ada subfolder.</li>` : "")}
      </ul>
      ${repos.length ? `<div class="pp-repos"><small>Repo git cepat</small>${repos.slice(0, 12).map((r) => `<button data-pick="${esc(r.name)}"${r.name === active ? ' class="on"' : ""}>${esc(r.name)}</button>`).join("")}</div>` : ""}
      <div class="pp-foot">
        <span>${active ? `Aktif: <b>${esc(active)}</b>` : "Belum ada proyek aktif"}</span>
        <div>
          ${active ? `<button data-pick="">Lepas</button>` : ""}
          <button class="primary" data-pick="${esc(here)}"${here ? "" : " disabled"}>✔ Pilih folder ini</button>
        </div>
      </div>
      <small class="pp-note">Akar akses: ${esc(root)}. Folder yang bisa dipilih ada di bawahnya (atur lewat PROJECTS_DIR di .env, lalu jalankan ulang docker compose).</small>`;
  };

  const open = async (rel) => {
    try {
      const listing = await get(`/api/projects/browse?path=${encodeURIComponent(rel)}`);
      dir = listing.path;
      root = listing.root || root;
      render(listing);
    } catch (err) {
      render(null, err.message);
    }
  };

  const show = async () => {
    try {
      const data = await get("/api/projects");
      active = data.active;
      root = data.root || root;
      repos = data.projects || [];
      syncButton();
    } catch { /* offline: keep the current state */ }
    pop.hidden = false;
    const r = button.getBoundingClientRect();
    pop.style.top = `${Math.round(r.bottom + 8)}px`;
    pop.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
    await open(active ? active.split("/").slice(0, -1).join("/") : "");
  };

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (pop.hidden) show();
    else pop.hidden = true;
  });
  pop.addEventListener("click", (e) => {
    e.stopPropagation();
    const pick = e.target.closest("[data-pick]");
    if (pick) return pick.disabled ? undefined : choose(pick.dataset.pick || null);
    if (e.target.closest("[data-close]")) { pop.hidden = true; return; }
    const target = e.target.closest("[data-open]");
    if (target) open(target.dataset.open);
  });
  document.addEventListener("pointerdown", (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== button) pop.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") pop.hidden = true; });

  get("/api/projects").then((data) => {
    active = data.active;
    root = data.root || root;
    repos = data.projects || [];
    syncButton();
  }).catch(syncButton);
};
