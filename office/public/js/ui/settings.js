// ⚙ Pengaturan: one header button opens a pop-up with every menu button and the view options
// (the opacity of the floors that are not selected). Closes on a click outside, on Escape, and
// after a button that opens a panel (data-close). The opacity is remembered per browser.
const FADE_KEY = "kantor-hermes-fade";

export const initSettings = ({ world }) => {
  const toggle = document.getElementById("settings-toggle");
  const pop = document.getElementById("settings-pop");
  const range = document.getElementById("fade-range");
  const output = document.getElementById("fade-value");

  const close = () => {
    pop.hidden = true;
    toggle.classList.remove("playing");
    toggle.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    pop.hidden = false;
    toggle.classList.add("playing");
    toggle.setAttribute("aria-expanded", "true");
  };
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (pop.hidden) open();
    else close();
  });
  // a button that opens a panel closes the pop-up after its own handler has run
  pop.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) setTimeout(close, 0);
  });
  document.addEventListener("pointerdown", (e) => {
    if (pop.hidden || pop.contains(e.target) || toggle.contains(e.target) || e.target.closest(".project-pop, .edge-pop")) return;
    close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) close(); });

  // opacity of the other floors
  let percent = 20;
  try { percent = Math.min(100, Math.max(0, Number(localStorage.getItem(FADE_KEY) ?? 20))); } catch { /* ignore */ }
  if (!Number.isFinite(percent)) percent = 20;
  const apply = () => {
    range.value = String(percent);
    output.textContent = `${percent}%`;
    world.setFadeAlpha(percent / 100);
  };
  apply();
  range.addEventListener("input", () => {
    percent = Number(range.value);
    apply();
    try { localStorage.setItem(FADE_KEY, String(percent)); } catch { /* ignore */ }
  });
  return { close, open };
};
