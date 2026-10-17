// "⚙ Agen" panel: add, edit and remove agents, and edit the shared SOUL.md.
// Talks to /api/agents and /api/soul (office/agents-api.js).
import { COSTUMES } from "./people3d.js";

const HAIR = [["short", "Pendek"], ["long", "Panjang"], ["bob", "Bob"], ["ponytail", "Kuncir kuda"], ["bun", "Sanggul"], ["spiky", "Jabrik"], ["cap", "Topi"]];
const OUTFIT = [["shirt", "Kemeja"], ["blazer", "Jas + dasi"], ["hoodie", "Hoodie"], ["dress", "Dress"]];
const ACCESSORY = [["", "Tidak ada"], ["glasses", "Kacamata"], ["headset", "Headset"]];
const COLORS = [
  ["hairColor", "Rambut", "#3b2416"], ["skin", "Kulit", "#f1c7a3"], ["top", "Atasan", "#5c7cfa"],
  ["shirt", "Kerah/kemeja", "#ffffff"], ["tie", "Dasi", "#c92a2a"], ["pants", "Celana", "#2b2f3a"],
  ["shoes", "Sepatu", "#3b3b3b"], ["cap", "Topi", "#e03131"],
];

const costumeOptions = (value) => {
  const group = (theme, label) => `<optgroup label="${label}">${Object.entries(COSTUMES)
    .filter(([, c]) => c.theme === theme)
    .map(([id, c]) => `<option value="${id}"${id === value ? " selected" : ""}>${c.label}</option>`).join("")}</optgroup>`;
  return `<option value=""${value ? "" : " selected"}>Tanpa kostum</option>${group("pokemon", "Tema Pokémon")}${group("digimon", "Tema Digimon")}${group("anime", "Tema Anime")}`;
};

// Voices offered by this browser; keeps a saved voice visible even if this browser lacks it.
const voiceOptions = (list, saved) => {
  const match = saved ? list.find((v) => v.name === saved) ?? list.find((v) => v.name.toLowerCase().includes(saved.toLowerCase())) : null;
  const selected = match?.name ?? saved ?? "";
  const opt = (v) => `<option value="${esc(v.name)}"${v.name === selected ? " selected" : ""}>${esc(v.name)}</option>`;
  const id = list.filter((v) => v.indonesian);
  const other = list.filter((v) => !v.indonesian);
  return [
    `<option value=""${selected ? "" : " selected"}>Otomatis (sesuai jenis suara)</option>`,
    saved && !match ? `<option value="${esc(saved)}" selected>${esc(saved)} (tidak ada di browser ini)</option>` : "",
    id.length ? `<optgroup label="Bahasa Indonesia">${id.map(opt).join("")}</optgroup>` : `<optgroup label="Bahasa Indonesia"><option disabled>Tidak ada di browser ini</option></optgroup>`,
    other.length ? `<optgroup label="Bahasa lain">${other.map(opt).join("")}</optgroup>` : "",
  ].join("");
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const options = (list, value) => list.map(([v, label]) => `<option value="${v}"${v === (value ?? "") ? " selected" : ""}>${label}</option>`).join("");

const api = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `gagal (${res.status})`);
  return data;
};

export const initAgentPanel = ({ voice, onChanged }) => {
  const panel = document.getElementById("agents");
  const body = document.getElementById("agents-body");
  const tabs = panel.querySelectorAll("[data-tab]");
  const status = document.getElementById("agents-status");
  let tab = "team";
  let roster = [];

  const flash = (msg, kind = "ok") => {
    status.textContent = msg;
    status.className = `agents-status ${kind}`;
    if (kind === "ok") setTimeout(() => { if (status.textContent === msg) status.textContent = ""; }, 3500);
  };

  // ---- team list -----------------------------------------------------------

  const showTeam = async () => {
    body.innerHTML = `<p class="muted">Memuat…</p>`;
    try {
      roster = (await api("GET", "/api/agents")).agents;
    } catch (err) {
      body.innerHTML = `<p class="agents-status err">${esc(err.message)}</p>`;
      return;
    }
    body.innerHTML = `
      <ul class="agent-list">
        ${roster.map((a) => `
          <li>
            <span class="swatch" style="background:${esc(a.look.top || "#868e96")}"></span>
            <span class="who"><b>${esc(a.name)}</b><small>${esc(a.role || "")}${a.builtin ? " · orkestrator" : ""}</small></span>
            <button data-edit="${esc(a.id)}">Ubah</button>
          </li>`).join("")}
      </ul>
      <button class="primary wide" data-new>＋ Agen baru</button>`;
    body.querySelectorAll("[data-edit]").forEach((b) => { b.onclick = () => showForm(roster.find((a) => a.id === b.dataset.edit)); });
    body.querySelector("[data-new]").onclick = () => showForm(null);
  };

  // ---- add / edit form -----------------------------------------------------

  const showForm = async (agent) => {
    const isNew = !agent;
    const builtin = Boolean(agent?.builtin);
    const look = agent?.look ?? { hair: "short", outfit: "shirt" };
    const v = look.voice ?? { gender: "female", pitch: 1, rate: 1 };
    await voice.whenReady();
    const voiceList = voice.availableVoices();
    body.innerHTML = `
      <form class="agent-form" autocomplete="off">
        <h3>${isNew ? "Agen baru" : `Ubah ${esc(agent.name)}`}</h3>
        ${isNew ? `<label>ID <small>(opsional, huruf kecil/angka/-; kosongkan = dari nama)</small><input name="id" maxlength="40" pattern="[a-z0-9][a-z0-9-]{1,39}"></label>` : ""}
        ${builtin ? `<p class="muted">Persona Hermes diatur oleh SOUL.md (tab Soul) dan prompt orkestrator. Di sini Anda bisa mengubah tampilan dan suaranya.</p>` : `
        <label>Nama *<input name="name" maxlength="40" required value="${esc(agent?.name)}"></label>
        <label>Peran<input name="role" maxlength="60" value="${esc(agent?.role)}" placeholder="mis. Data Analyst"></label>
        <label>Instruksi / kepribadian<textarea name="instructions" rows="6" maxlength="4000" placeholder="Kamu adalah …, tugasmu …, gaya bicaramu …">${esc(agent?.instructions)}</textarea></label>
        <label>Batasan<textarea name="boundaries" rows="2" maxlength="1000" placeholder="mis. Jangan menghapus file tanpa konfirmasi.">${esc(agent?.boundaries)}</textarea></label>`}
        <fieldset><legend>Tampilan</legend>
          <label>Kostum <small>(menggantikan rambut dan pakaian; anime tetap berambut)</small><select name="costume">${costumeOptions(look.costume ?? "")}</select></label>
          <div class="row3">
            <label>Rambut<select name="hair">${options(HAIR, look.hair)}</select></label>
            <label>Pakaian<select name="outfit">${options(OUTFIT, look.outfit)}</select></label>
            <label>Aksesori<select name="accessory">${options(ACCESSORY, look.accessory)}</select></label>
          </div>
          <div class="colors">
            ${COLORS.map(([key, label, def]) => `<label class="color"><input type="color" name="${key}" value="${esc(look[key] || def)}"><span>${label}</span></label>`).join("")}
          </div>
        </fieldset>
        <fieldset><legend>Suara</legend>
          <div class="row3">
            <label>Jenis<select name="gender">${options([["female", "Wanita"], ["male", "Pria"]], v.gender)}</select></label>
            <label>Nada <output name="pitchOut">${v.pitch ?? 1}</output><input type="range" name="pitch" min="0.5" max="2" step="0.05" value="${v.pitch ?? 1}"></label>
            <label>Kecepatan <output name="rateOut">${v.rate ?? 1}</output><input type="range" name="rate" min="0.5" max="2" step="0.05" value="${v.rate ?? 1}"></label>
          </div>
          <label>Suara pilihan <small>(${voiceList.length} suara tersedia di browser ini)</small><select name="prefer">${voiceOptions(voiceList, (v.prefer ?? [])[0] ?? "")}</select></label>
          <button type="button" data-test>🔊 Tes suara</button>
        </fieldset>
        <div class="form-actions">
          <button type="submit" class="primary">Simpan</button>
          <button type="button" data-cancel>Batal</button>
          ${!isNew && !builtin ? `<button type="button" class="danger" data-delete>Hapus agen</button>` : ""}
        </div>
      </form>`;

    const form = body.querySelector("form");
    const f = form.elements;
    f.pitch.oninput = () => { f.pitchOut.value = f.pitch.value; };
    f.rate.oninput = () => { f.rateOut.value = f.rate.value; };

    const collectLook = () => {
      const out = { costume: f.costume.value, hair: f.hair.value, outfit: f.outfit.value, accessory: f.accessory.value };
      for (const [key] of COLORS) out[key] = f[key].value;
      if (out.hair !== "cap") delete out.cap;
      const chosen = voiceList.find((x) => x.name === f.prefer.value);
      out.voice = {
        lang: chosen ? chosen.lang.replace("_", "-") : "id-ID",
        gender: f.gender.value,
        pitch: Number(f.pitch.value),
        rate: Number(f.rate.value),
        prefer: f.prefer.value ? [f.prefer.value] : [],
      };
      if (!/^[a-z]{2}-[A-Z]{2}$/.test(out.voice.lang)) out.voice.lang = "id-ID";
      return out;
    };

    form.querySelector("[data-test]").onclick = () => {
      const name = builtin ? agent.name : f.name.value.trim() || "agen baru";
      voice.speak("__preview__", `Halo, saya ${name}. Begini suara saya.`, { force: true, config: collectLook().voice });
    };
    form.querySelector("[data-cancel]").onclick = showTeam;
    const del = form.querySelector("[data-delete]");
    if (del) {
      del.onclick = async () => {
        if (!confirm(`Hapus ${agent.name}? Riwayat chat-nya juga dihapus.`)) return;
        try {
          await api("DELETE", `/api/agents/${encodeURIComponent(agent.id)}`);
          flash(`${agent.name} dihapus`);
          await onChanged({ removed: agent.id });
          showTeam();
        } catch (err) {
          flash(err.message, "err");
        }
      };
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const payload = { look: collectLook() };
      if (!builtin) {
        payload.name = f.name.value;
        payload.role = f.role.value;
        payload.instructions = f.instructions.value;
        payload.boundaries = f.boundaries.value;
      }
      if (isNew && f.id.value.trim()) payload.id = f.id.value.trim();
      try {
        if (isNew) await api("POST", "/api/agents", payload);
        else await api("PUT", `/api/agents/${encodeURIComponent(agent.id)}`, payload);
        flash(isNew ? "Agen baru ditambahkan" : "Perubahan disimpan");
        await onChanged({});
        showTeam();
      } catch (err) {
        flash(err.message, "err");
      }
    };
  };

  // ---- SOUL.md -------------------------------------------------------------

  const showSoul = async () => {
    body.innerHTML = `<p class="muted">Memuat SOUL.md…</p>`;
    let soul;
    try {
      soul = await api("GET", "/api/soul");
    } catch (err) {
      body.innerHTML = `<p class="agents-status err">${esc(err.message)}</p>`;
      return;
    }
    body.innerHTML = `
      <form class="agent-form soul-form">
        <p class="muted">SOUL.md adalah identitas dasar yang dipakai <b>semua</b> agen (bahasa, nada, nilai). Persona tiap agen tetap diatur di tab Tim.</p>
        <textarea name="content" rows="18" maxlength="20000" spellcheck="false">${esc(soul.content)}</textarea>
        <div class="form-actions"><button type="submit" class="primary">Simpan SOUL.md</button></div>
        <p class="muted">Berlaku untuk pesan berikutnya. Kalau belum terasa, jalankan <code>docker compose restart hermes</code>.</p>
      </form>`;
    const form = body.querySelector("form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api("PUT", "/api/soul", { content: form.elements.content.value });
        flash("SOUL.md disimpan");
      } catch (err) {
        flash(err.message, "err");
      }
    };
  };

  const show = (next) => {
    tab = next;
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    status.textContent = "";
    (tab === "soul" ? showSoul : showTeam)();
  };
  tabs.forEach((t) => { t.onclick = () => show(t.dataset.tab); });

  document.getElementById("agents-toggle").addEventListener("click", () => {
    const opening = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    if (opening) show(tab);
  });
  document.getElementById("agents-close").addEventListener("click", () => panel.classList.add("hidden"));
};
