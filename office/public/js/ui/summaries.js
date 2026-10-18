// 📋 RINGKASAN panel (left side): one short summary per finished reply, newest
// first. The list lives on the server (summaries.list / "summary" events), so it
// survives page refreshes. Each entry has a checkbox the user ticks once they
// have read it (summaries.mark, saved on the server); unread entries stand out
// and can be shown on their own. Clicking an entry opens that agent's chat.

const KEY = "kantor-hermes-summaries-collapsed";
const FILTER_KEY = "kantor-hermes-summaries-unread-only";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const when = (ms) => {
  if (!ms) return "";
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return today ? time : `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ${time}`;
};

const load = (key) => { try { return localStorage.getItem(key) === "1"; } catch { return false; } };
const store = (key, on) => { try { localStorage.setItem(key, on ? "1" : "0"); } catch { /* ignore */ } };

export const initSummaries = ({ gw, nameOf, onOpen }) => {
  const panel = document.getElementById("summaries");
  const list = document.getElementById("summary-list");
  const toggle = document.getElementById("summary-toggle");
  const count = document.getElementById("summary-unread");
  const filter = document.getElementById("summary-filter");
  let entries = [];
  let collapsed = load(KEY);
  let unreadOnly = load(FILTER_KEY);

  const applyCollapsed = () => {
    panel.classList.toggle("collapsed", collapsed);
    toggle.textContent = collapsed ? "+" : "–";
    toggle.title = collapsed ? "Tampilkan" : "Sembunyikan";
  };
  applyCollapsed();
  toggle.onclick = () => {
    collapsed = !collapsed;
    applyCollapsed();
    store(KEY, collapsed);
  };
  filter.checked = unreadOnly;
  filter.onchange = () => {
    unreadOnly = filter.checked;
    store(FILTER_KEY, unreadOnly);
    render();
  };

  const render = () => {
    const unread = entries.filter((e) => !e.read).length;
    count.textContent = unread ? `${unread} belum dibaca` : "semua sudah dibaca";
    count.classList.toggle("has-unread", unread > 0);
    const shown = unreadOnly ? entries.filter((e) => !e.read) : entries;
    list.innerHTML = shown.length
      ? shown.map((e) => `
        <li data-id="${esc(e.id)}" data-agent="${esc(e.agentId)}" class="${e.kind === "meeting" ? "meeting" : ""} ${e.read ? "read" : "unread"}" title="Buka chat ${esc(nameOf(e.agentId))}">
          <div class="sm-head">
            <label class="sm-check" title="${e.read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}"><input type="checkbox"${e.read ? " checked" : ""} /><span>${e.read ? "Dibaca" : "Baru"}</span></label>
            <b>${e.kind === "meeting" ? "💬 " : ""}${esc(nameOf(e.agentId))}</b><span>${when(e.at)}</span>
          </div>
          ${e.task ? `<div class="sm-task">${e.kind === "meeting" ? "Rapat" : "Tugas"}: ${esc(e.task)}</div>` : ""}
          <div class="sm-text">${esc(e.summary)}</div>
        </li>`).join("")
      : `<li class="muted">${unreadOnly && entries.length ? "Semua ringkasan sudah Anda baca." : "Belum ada jawaban. Ringkasan muncul di sini setiap kali agen selesai menjawab."}</li>`;
  };

  list.addEventListener("click", async (e) => {
    const li = e.target.closest("li[data-agent]");
    if (!li) return;
    const box = e.target.closest(".sm-check");
    if (!box) return onOpen(li.dataset.agent);
    // the checkbox only marks read/unread; it never opens the chat
    e.stopPropagation();
    if (e.target.tagName !== "INPUT") return; // the label forwards the click to its input
    const entry = entries.find((x) => x.id === li.dataset.id);
    if (!entry) return;
    const read = e.target.checked;
    entry.read = read;
    render();
    try {
      await gw.request("summaries.mark", { id: entry.id, read });
    } catch {
      entry.read = !read; // not saved: undo
      render();
    }
  });

  const reload = async () => {
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
  // marked in another tab
  gw.addEventListener("summary.read", (e) => {
    const entry = entries.find((x) => x.id === e.detail.id);
    if (entry && entry.read !== e.detail.read) {
      entry.read = e.detail.read;
      render();
    }
  });

  render();
  return { load: reload, render };
};
