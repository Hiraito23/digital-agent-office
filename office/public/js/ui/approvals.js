// PERSETUJUAN panel: commands Hermes wants to run that need your OK (for
// example a risky terminal command). The adapter forwards Hermes'
// approval.request as an "approval" event; each button answers it with
// exec.approval.resolve, which the adapter sends to POST /v1/runs/{id}/approval.

const CHOICES = {
  once: "Izinkan sekali",
  session: "Izinkan sesi ini",
  always: "Selalu izinkan",
  deny: "Tolak",
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const initApprovals = ({ gw, nameOf, onRequest, onResolved }) => {
  const el = document.getElementById("approvals");
  const panel = el.closest(".panel");
  const pending = new Map(); // id -> approval

  const render = () => {
    panel.classList.toggle("waiting", pending.size > 0);
    if (!pending.size) {
      el.innerHTML = `<p class="muted">Tidak ada yang menunggu Anda</p>`;
      return;
    }
    el.innerHTML = [...pending.values()].map((a) => `
      <div class="approval" data-id="${esc(a.id)}">
        <b>${esc(nameOf(a.agentId))}</b> minta izin${a.description ? `: ${esc(a.description)}` : ""}
        ${a.command ? `<code>${esc(a.command)}</code>` : ""}
        <div class="acts">${a.choices.filter((c) => CHOICES[c]).map((c) =>
          `<button data-choice="${c}" class="${c === "deny" ? "deny" : ""}">${CHOICES[c]}</button>`).join("")}</div>
      </div>`).join("");
  };

  el.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-choice]");
    if (!btn) return;
    const id = btn.closest(".approval").dataset.id;
    const approval = pending.get(id);
    el.querySelectorAll(`.approval[data-id="${CSS.escape(id)}"] button`).forEach((b) => { b.disabled = true; });
    try {
      await gw.request("exec.approval.resolve", { id, choice: btn.dataset.choice });
      pending.delete(id);
      onResolved?.(approval, btn.dataset.choice);
    } catch (err) {
      onResolved?.(approval, null, err);
      pending.delete(id);
    }
    render();
  });

  gw.addEventListener("approval", (e) => {
    const p = e.detail;
    if (p.state === "requested" && p.approval) {
      pending.set(p.approval.id, p.approval);
      onRequest?.(p.approval);
    } else if (p.state === "resolved") {
      pending.delete(p.id);
    }
    render();
  });

  // Approvals that were already waiting before this tab connected.
  gw.addEventListener("status", async (e) => {
    if (!e.detail.connected) return;
    try {
      const res = await gw.request("exec.approvals.pending");
      pending.clear();
      for (const a of res.approvals || []) pending.set(a.id, a);
      render();
    } catch { /* older adapter */ }
  });
};
