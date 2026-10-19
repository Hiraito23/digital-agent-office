// 🎨 Outline colour: the border colour of every panel (--panel-edge), chosen with a colour
// picker or typed as a hex code. Remembered per browser.
const KEY = "kantor-hermes-edge-color";
const DEFAULT = "#5b7cff";

// "#abc", "abc", "#AABBCC" → "#aabbcc", or null when it is not a hex colour
const normalize = (value) => {
  let v = String(value).trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(v)) v = [...v].map((c) => c + c).join("");
  return /^[0-9a-f]{6}$/.test(v) ? `#${v}` : null;
};

export const initEdgeColor = ({ button }) => {
  const root = document.documentElement;
  const apply = (hex) => root.style.setProperty("--panel-edge", hex);
  const save = (hex) => { try { localStorage.setItem(KEY, hex); } catch { /* storage unavailable */ } };

  let current = DEFAULT;
  try { current = normalize(localStorage.getItem(KEY) || "") || DEFAULT; } catch { /* ignore */ }
  apply(current);

  const pop = document.createElement("div");
  pop.className = "edge-pop";
  pop.hidden = true;
  pop.innerHTML = `
    <span>Warna garis tepi panel</span>
    <div class="row"><input type="color" aria-label="Pilih warna"><input type="text" maxlength="7" spellcheck="false" placeholder="#5B7CFF" aria-label="Kode hex"></div>
    <button type="button" data-reset>Kembalikan ke bawaan</button>`;
  document.body.append(pop);
  const picker = pop.querySelector('input[type="color"]');
  const text = pop.querySelector('input[type="text"]');

  const show = (hex) => { picker.value = hex; text.value = hex.toUpperCase(); text.classList.remove("bad"); };
  const set = (hex) => { current = hex; apply(hex); save(hex); show(hex); };

  picker.addEventListener("input", () => set(picker.value));
  text.addEventListener("input", () => {
    const hex = normalize(text.value);
    text.classList.toggle("bad", !hex);
    if (hex) { current = hex; apply(hex); save(hex); picker.value = hex; }
  });
  text.addEventListener("blur", () => show(current));
  pop.querySelector("[data-reset]").onclick = () => set(DEFAULT);

  const close = () => { pop.hidden = true; };
  button.onclick = (e) => {
    e.stopPropagation();
    if (!pop.hidden) return close();
    show(current);
    pop.hidden = false;
    const r = button.getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.right - pop.offsetWidth))}px`;
    pop.style.top = `${Math.max(8, r.top - pop.offsetHeight - 8)}px`;
  };
  document.addEventListener("pointerdown", (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== button) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
};
