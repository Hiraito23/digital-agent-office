// 📋 RINGKASAN panel (left side): one short summary per finished reply, newest
// first. The list lives on the server (summaries.list / "summary" events), so it
// survives page refreshes. Clicking an entry opens that agent's chat.

const KEY = "kantor-hermes-summaries-collapsed";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const when = (ms) => {
  if (!ms) return "";
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return today ? time : `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ${time}`;
};

export const initSummaries = ({ gw, nameOf, onOpen }) => {
  const panel = document.getElementById("summaries");
  const list = document.getElementById("summary-list");
  const toggle = document.getElementById("summary-toggle");
  let entries = [];

  let collapsed = false;
  try { collapsed = localStorage.getItem(KEY) === "1"; } catch { /* ignore */ }
  const applyCollapsed = () => {
    panel.classList.toggle("collapsed", collapsed);
    toggle.textContent = collapsed ? "+" : "–";
    toggle.title = collapsed ? "Tampilkan" : "Sembunyikan";
  };
  applyCollapsed();
  toggle.onclick = () => {
    collapsed = !collapsed;
    applyCollapsed();
    try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
  };

  const render = () => {
    list.innerHTML = entries.length
      ? entries.map((e) => `
        <li data-agent="${esc(e.agentId)}" class="${e.kind === "meeting" ? "meeting" : ""}" title="Buka chat ${esc(nameOf(e.agentId))}">
          <div class="sm-head"><b>${e.kind === "meeting" ? "💬 " : ""}${esc(nameOf(e.agentId))}</b><span>${when(e.at)}</span></div>
          ${e.task ? `<div class="sm-task">${e.kind === "meeting" ? "Rapat" : "Tugas"}: ${esc(e.task)}</div>` : ""}
          <div class="sm-text">${esc(e.summary)}</div>
        </li>`).join("")
      : `<li class="muted">Belum ada jawaban. Ringkasan muncul di sini setiap kali agen selesai menjawab.</li>`;
  };

  list.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-agent]");
    if (li) onOpen(li.dataset.agent);
  });

  const load = async () => {
    try {
      const res = await gw.request("summaries.list", { limit: 100 });
      entries = res.summaries || [];
      render();
    } catch { /* older adapter */ }
  };

  gw.addEventListener("summary", (e) => {
    entries.unshift(e.detail);
    entries.length = Math.min(entries.length, 100);
    render();
  });

  render();
  return { load, render };
};
