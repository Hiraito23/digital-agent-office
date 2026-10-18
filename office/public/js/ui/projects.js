// 📁 Project picker in the header. Lists the folders the agents may work on
// (PROJECTS_DIR from .env, mounted as /workspace) and sets the active one via
// /api/projects/active. The adapter then gives every agent the project folder
// and the git branch rules. The list refreshes whenever the picker is opened.

const label = (p) => `📁 ${p.name}${p.git ? ` · ${p.branch}` : " · bukan git"}`;

export const initProjectPicker = ({ onChange }) => {
  const select = document.getElementById("project-select");
  let active = null;

  const render = (data) => {
    active = data.active;
    const options = [`<option value="">📁 Pilih proyek…</option>`]
      .concat(data.projects.map((p) => `<option value="${p.name.replace(/"/g, "&quot;")}"${p.name === active ? " selected" : ""}>${label(p)}</option>`));
    select.innerHTML = options.join("");
    select.title = active ? `Agen bekerja di ${data.root}/${active}` : `Pilih folder proyek di ${data.root} untuk dikerjakan agen`;
    select.classList.toggle("active", Boolean(active));
  };

  const refresh = async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (res.ok) render(await res.json());
    } catch { /* offline: keep the current list */ }
  };

  select.addEventListener("focus", refresh);
  select.addEventListener("change", async () => {
    const name = select.value || null;
    const res = await fetch("/api/projects/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      onChange?.({ error: data.error || "gagal memilih proyek" });
      select.value = active ?? "";
      return;
    }
    active = data.active;
    select.classList.toggle("active", Boolean(active));
    onChange?.({ name: data.active, path: data.path });
  });

  refresh();
};
