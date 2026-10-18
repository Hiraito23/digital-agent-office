// 📊 Pemakaian panel: token usage per agent and per AI model, as daily / weekly /
// monthly totals. The numbers come from the server (/api/usage), which counts the
// `usage` Hermes reports on every reply (server/usage.js).

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = (n) => Number(n || 0).toLocaleString("id-ID");
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} jt` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} rb` : String(n));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const dm = (key) => `${Number(key.slice(8, 10))} ${MONTHS[Number(key.slice(5, 7)) - 1]}`;
const label = (range, p) =>
  range === "monthly" ? `${MONTHS[Number(p.key.slice(5, 7)) - 1]} ${p.key.slice(0, 4)}`
  : range === "weekly" ? `${dm(p.key)} – ${dm(p.end)}`
  : dm(p.key);
const WINDOW = { daily: "7 hari terakhir", weekly: "8 minggu terakhir", monthly: "6 bulan terakhir" };
const UNIT = { daily: "hari", weekly: "minggu", monthly: "bulan" };

export const initUsage = ({ agents, nameOf }) => {
  const panel = document.getElementById("usage");
  const body = document.getElementById("usage-body");
  const status = document.getElementById("usage-status");
  const tabs = panel.querySelectorAll("[data-range]");
  let range = "daily";
  let timer = null;

  const total = (t) => (t?.input || 0) + (t?.output || 0);

  const render = (data) => {
    const list = agents().map((a) => ({ id: a.id, data: data.agents[a.id] }));
    for (const id of Object.keys(data.agents)) if (!list.some((x) => x.id === id)) list.push({ id, data: data.agents[id] });
    list.sort((a, b) => total(b.data?.total) - total(a.data?.total));
    const t = data.total;
    const cards = list.map(({ id, data: d }) => {
      const sum = d?.total || { calls: 0, input: 0, output: 0 };
      const series = d?.series || data.periods.map(() => null);
      const max = Math.max(1, ...series.map(total));
      const bars = series.map((s, i) => {
        const v = total(s);
        return `<span class="u-bar" style="height:${v ? Math.max(6, Math.round((v / max) * 100)) : 2}%" title="${esc(label(data.range, data.periods[i]))}: ${num(v)} token (${num(s?.calls)} balasan)"></span>`;
      }).join("");
      const models = Object.entries(d?.models || {}).sort((a, b) => total(b[1]) - total(a[1]))
        .map(([m, x]) => `<li><span class="u-model" title="${esc(m)}">${esc(m)}</span><span>${short(x.input)} masuk · ${short(x.output)} keluar · ${num(x.calls)}×</span></li>`).join("");
      return `
        <section class="u-card${sum.calls ? "" : " idle"}">
          <div class="u-head"><b>${esc(nameOf(id))}</b><span class="u-total">${num(total(sum))} token</span></div>
          <div class="u-sub">${num(sum.input)} masuk · ${num(sum.output)} keluar · ${num(sum.calls)} balasan</div>
          <div class="u-bars" aria-hidden="true">${bars}</div>
          <ul class="u-models">${models || `<li class="muted">Belum ada pemakaian.</li>`}</ul>
        </section>`;
    }).join("");
    const first = label(data.range, data.periods[0]);
    const last = label(data.range, data.periods[data.periods.length - 1]);
    body.innerHTML = `
      <div class="u-summary">
        <div><b>${num(total(t))}</b><span>token total</span></div>
        <div><b>${num(t.input)}</b><span>masuk (prompt)</span></div>
        <div><b>${num(t.output)}</b><span>keluar (jawaban)</span></div>
        <div><b>${num(t.calls)}</b><span>balasan</span></div>
      </div>
      <p class="muted">${WINDOW[data.range]} (${esc(first)} → ${esc(last)}, zona waktu ${esc(data.timezone)}). Batang = token per ${UNIT[data.range]}; arahkan kursor untuk rincian.</p>
      ${cards}
      <p class="muted">Token "masuk" termasuk instruksi sistem dan riwayat chat yang dikirim ulang di tiap balasan. Model gratis tetap tercatat, hanya tanpa biaya.</p>`;
  };

  const load = async () => {
    try {
      const res = await fetch(`/api/usage?range=${range}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      render(await res.json());
      status.textContent = "";
    } catch (err) {
      status.textContent = `Gagal memuat pemakaian: ${err.message}`;
      status.className = "agents-status err";
    }
  };

  const setRange = (r) => {
    range = r;
    tabs.forEach((b) => b.classList.toggle("active", b.dataset.range === r));
    load();
  };
  tabs.forEach((b) => { b.onclick = () => setRange(b.dataset.range); });

  const close = () => { panel.classList.add("hidden"); clearInterval(timer); timer = null; };
  document.getElementById("usage-close").onclick = close;
  document.getElementById("usage-toggle").onclick = () => {
    if (!panel.classList.contains("hidden")) return close();
    panel.classList.remove("hidden");
    load();
    timer = setInterval(load, 15000);
  };
};
