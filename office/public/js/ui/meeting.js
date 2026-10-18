// 💬 Rapat panel: start a team meeting about a project or idea. Pick a topic and
// participants; they walk to the meeting room and take turns speaking (the
// adapter runs the turns, server/meetings.js), then Hermes writes the minutes.
// The world shows who is in the room, bubbles show who is talking.

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const initMeeting = ({ gw, world, nameOf, roleOf, agents, say, voice, logActivity, getProject }) => {
  const panel = document.getElementById("meeting");
  const body = document.getElementById("meeting-body");
  const status = document.getElementById("meeting-status");
  let meeting = null; // last meeting state from the server
  let live = null; // { agentId, text } of the turn being spoken
  let limits = { maxParticipants: 5, maxRounds: 3 };
  let draft = { topic: "", participants: [], rounds: 1 };

  const flash = (msg, kind = "err") => {
    status.textContent = msg;
    status.className = `agents-status ${kind}`;
  };

  const minutesMarkdown = (m) => [
    `# Notulen rapat: ${m.topic}`, "",
    `Tanggal: ${new Date().toLocaleString("id-ID")}`,
    `Peserta: ${["hermes", ...m.participants].map(nameOf).join(", ")}`, "",
    "## Notulen", "", m.minutes || "(belum ada)", "",
    "## Transkrip", "",
    ...m.transcript.map((t) => `**${nameOf(t.agentId)}:** ${t.text}\n`),
  ].join("\n");

  // ---- form ----------------------------------------------------------------

  const showForm = () => {
    const team = agents().filter((a) => a.id !== "hermes");
    const project = getProject();
    body.innerHTML = `
      <form class="agent-form meeting-form">
        <p class="muted">Peserta berjalan ke <b>Ruang Rapat</b> dan bergiliran bicara. Hermes membuka rapat dan menutupnya dengan notulen (ringkasan, keputusan, action item). Selama rapat agen hanya berdiskusi, tidak mengubah file.</p>
        <p class="muted">Proyek aktif: <b>${project ? esc(project) : "tidak ada"}</b>${project ? " (ikut jadi konteks rapat)" : ""}.</p>
        <label>Topik rapat
          <textarea name="topic" rows="3" maxlength="2000" placeholder="Misalnya: rencana fitur login dan pembagian tugasnya">${esc(draft.topic)}</textarea>
        </label>
        <fieldset><legend>Peserta (maks. ${limits.maxParticipants})</legend>
          <div class="meeting-people">${team.map((a) => `
            <label class="color"><input type="checkbox" name="p" value="${esc(a.id)}"${draft.participants.includes(a.id) ? " checked" : ""} />
              <span>${esc(a.name)} <small>${esc(a.role || "")}</small></span></label>`).join("")}
          </div>
        </fieldset>
        <label>Putaran bicara
          <select name="rounds">${[1, 2, 3].slice(0, limits.maxRounds).map((n) => `<option value="${n}"${n === draft.rounds ? " selected" : ""}>${n} putaran</option>`).join("")}</select>
          <small>Setiap peserta bicara sekali per putaran. Lebih banyak putaran = diskusi lebih dalam, tapi lebih lama.</small>
        </label>
        <div class="form-actions"><button type="submit" class="primary">💬 Mulai rapat</button></div>
      </form>`;
    const form = body.querySelector("form");
    form.onchange = form.oninput = () => {
      draft = {
        topic: form.elements.topic.value,
        participants: [...form.querySelectorAll("input[name=p]:checked")].map((i) => i.value),
        rounds: Number(form.elements.rounds.value),
      };
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      form.onchange();
      if (!draft.topic.trim()) return flash("Isi topik rapat dulu");
      if (!draft.participants.length) return flash("Pilih minimal satu peserta");
      if (draft.participants.length > limits.maxParticipants) return flash(`Maksimal ${limits.maxParticipants} peserta`);
      status.textContent = "";
      try {
        await gw.request("meeting.start", draft);
      } catch (err) {
        flash(err.message);
      }
    };
  };

  // ---- meeting view --------------------------------------------------------

  const showMeeting = () => {
    const m = meeting;
    const running = m.state === "running";
    const turns = m.transcript.map((t) => `
      <div class="msg assistant meeting-turn"><b>${esc(nameOf(t.agentId))}</b>${esc(t.text)}</div>`).join("");
    const speaking = live ? `
      <div class="msg assistant meeting-turn live"><b>${esc(nameOf(live.agentId))} sedang bicara…</b>${esc(live.text || "…")}</div>` : "";
    const stateLine = {
      running: "Rapat sedang berlangsung",
      ended: "Rapat selesai",
      stopped: "Rapat dihentikan",
      error: `Rapat gagal: ${esc(m.error || "")}`,
    }[m.state] || "";
    body.innerHTML = `
      <div class="meeting-view">
        <h3>${esc(m.topic)}</h3>
        <p class="muted">${stateLine} · peserta: ${["hermes", ...m.participants].map((id) => esc(nameOf(id))).join(", ")} · ${m.rounds} putaran</p>
        ${m.minutes ? `<div class="meeting-minutes"><b>📝 Notulen</b>${esc(m.minutes)}</div>` : ""}
        <div class="meeting-log chat-log">${turns}${speaking}${!turns && !speaking ? `<p class="muted">Peserta sedang berjalan ke Ruang Rapat…</p>` : ""}</div>
        <div class="form-actions">
          ${running ? `<button data-act="stop">■ Akhiri rapat</button>` : `<button data-act="new" class="primary">💬 Rapat baru</button>`}
          ${m.minutes ? `<button data-act="copy">Salin notulen</button><button data-act="download">Unduh .md</button>` : ""}
        </div>
      </div>`;
    const log = body.querySelector(".meeting-log");
    log.scrollTop = log.scrollHeight;
    body.querySelectorAll("button[data-act]").forEach((b) => {
      b.onclick = async () => {
        const act = b.dataset.act;
        if (act === "stop") await gw.request("meeting.stop", { id: m.id }).catch((err) => flash(err.message));
        if (act === "new") { meeting = null; live = null; render(); }
        if (act === "copy") {
          try { await navigator.clipboard.writeText(minutesMarkdown(m)); flash("Notulen disalin", "ok"); } catch { flash("Gagal menyalin"); }
        }
        if (act === "download") {
          const url = URL.createObjectURL(new Blob([minutesMarkdown(m)], { type: "text/markdown" }));
          const a = Object.assign(document.createElement("a"), { href: url, download: `notulen-${m.id}.md` });
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      };
    });
  };

  const render = () => {
    if (panel.classList.contains("hidden")) return;
    (meeting ? showMeeting : showForm)();
  };

  // ---- events from the adapter ----------------------------------------------

  const enterRoom = (m) => world.startMeeting("hermes", m.participants);

  gw.addEventListener("meeting", (e) => {
    const p = e.detail;
    if (p.state === "started") {
      meeting = p.meeting;
      live = null;
      enterRoom(meeting);
      logActivity(`Rapat dimulai: ${meeting.topic.slice(0, 60)}`, "ok");
      panel.classList.remove("hidden");
    }
    if (!meeting || (p.id && p.id !== meeting.id)) return render();
    if (p.state === "speaking") live = { agentId: p.agentId, text: "" };
    if (p.state === "delta") {
      live = { agentId: p.agentId, text: String(p.text || "").replace(/\*\*|__/g, "") };
      say(p.agentId, p.text, 8000);
    }
    if (p.state === "turn") {
      live = null;
      meeting.transcript.push({ agentId: p.agentId, text: p.text });
      say(p.agentId, p.text, 9000);
      voice.speak(p.agentId, p.text);
    }
    if (p.state === "ended") {
      meeting.state = "ended";
      meeting.minutes = p.minutes;
      world.endMeeting();
      logActivity(`Rapat selesai: notulen ada di 📋 RINGKASAN`, "ok");
    }
    if (p.state === "stopped" || p.state === "error") {
      meeting.state = p.state;
      meeting.error = p.error;
      live = null;
      world.endMeeting();
      logActivity(p.state === "error" ? `Rapat gagal: ${String(p.error).slice(0, 60)}` : "Rapat dihentikan", p.state === "error" ? "err" : "");
    }
    render();
  });

  // A meeting already running when this tab connects (e.g. after a refresh).
  gw.addEventListener("status", async (e) => {
    if (!e.detail.connected) return;
    try {
      const res = await gw.request("meeting.current");
      limits = { maxParticipants: res.maxParticipants || 5, maxRounds: res.maxRounds || 3 };
      if (res.meeting?.state === "running") {
        meeting = res.meeting;
        live = res.meeting.speaking ? { agentId: res.meeting.speaking, text: "" } : null;
        setTimeout(() => enterRoom(meeting), 500); // after the roster is in the world
      }
      render();
    } catch { /* older adapter */ }
  });

  document.getElementById("meeting-toggle").addEventListener("click", () => {
    panel.classList.toggle("hidden");
    status.textContent = "";
    render();
  });
  document.getElementById("meeting-close").addEventListener("click", () => panel.classList.add("hidden"));
};
