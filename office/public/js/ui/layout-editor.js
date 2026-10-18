// 🛠 Layout editor (build mode, like The Sims): move, rotate, duplicate, delete and add
// furniture. Click a piece and drag it over the floor; it snaps to a grid and sits flush
// against walls and neighbours. A green footprint means the spot is free, red means it
// is not (outside the floor, in a wall, blocking a door, or on another piece).
// Changes are saved automatically on the server (/api/layout -> config/layout.json) and
// can be undone. Desks keep their agent, activity spots (sofa, arcade, ...) move along.
import * as THREE from "three";
import { CATALOG, CATALOG_ORDER, LAYOUT_VERSION, worldRects } from "../office/furniture.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const MAX_UNDO = 60;

// Saved items from the server, or null for the default layout.
export const loadLayout = async () => {
  try {
    const res = await fetch("/api/layout", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    // a layout saved for an older floor plan does not fit this one: use the default
    return Array.isArray(data.items) && data.version === LAYOUT_VERSION ? data.items : null;
  } catch {
    return null;
  }
};

export const initLayoutEditor = ({ world, canvas }) => {
  const furn = world.office.furniture;
  const top = world.office.floorTop;
  const panel = document.getElementById("layout");
  const statusEl = document.getElementById("layout-status");
  const catalogEl = document.getElementById("layout-catalog");
  const selectedEl = document.getElementById("layout-selected");
  const toggleBtn = document.getElementById("layout-toggle");
  const undoBtn = document.getElementById("layout-undo");
  const redoBtn = document.getElementById("layout-redo");

  let active = false;
  let selected = null; // item id
  let held = null; // { id, x, z, rot, offX, offZ, isNew, before, start, moved, ok }
  const undoStack = [];
  const redoStack = [];
  let saveTimer = null;

  const overlay = new THREE.Group();
  world.scene.add(overlay);

  // ---- feedback -----------------------------------------------------------

  const setStatus = (text, kind = "") => {
    statusEl.textContent = text;
    statusEl.className = `agents-status ${kind}`;
  };

  const clearOverlay = () => {
    overlay.children.forEach((o) => o.geometry?.dispose());
    overlay.clear();
  };

  // Footprint on the floor: green = free, red = blocked, yellow = selected.
  const showOverlay = (item, state) => {
    clearOverlay();
    const color = state === "bad" ? 0xfa5252 : state === "ok" ? 0x40c057 : 0xffd43b;
    for (const r of worldRects(item)) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const cx = (r.x0 + r.x1) / 2;
      const cz = (r.z0 + r.z1) / 2;
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(cx, top + 0.03, cz);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, d)), new THREE.LineBasicMaterial({ color, depthTest: false }));
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(cx, top + 0.035, cz);
      fill.renderOrder = edge.renderOrder = 10; // drawn over the furniture so the footprint stays visible
      overlay.add(fill, edge);
    }
  };

  // ---- history and saving -------------------------------------------------

  const snapshot = () => JSON.stringify(furn.toJSON());
  const snapshotWithout = (id) => JSON.stringify(furn.toJSON().filter((i) => i.id !== id));
  const pushUndo = (snap) => {
    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    renderTools();
  };

  const save = async () => {
    saveTimer = null;
    try {
      const res = await fetch("/api/layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: LAYOUT_VERSION, items: furn.toJSON() }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      setStatus("Tersimpan ✓", "ok");
    } catch (err) {
      setStatus(`Gagal menyimpan: ${err.message}`, "err");
    }
  };
  const scheduleSave = () => {
    setStatus("Menyimpan…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  };

  const apply = (snap) => {
    furn.load(JSON.parse(snap));
    if (selected && !furn.get(selected)) selected = null;
    select(selected);
    renderCatalog();
    scheduleSave();
  };
  const undo = () => {
    if (held || !undoStack.length) return;
    redoStack.push(snapshot());
    apply(undoStack.pop());
    renderTools();
  };
  const redo = () => {
    if (held || !redoStack.length) return;
    undoStack.push(snapshot());
    apply(redoStack.pop());
    renderTools();
  };

  // ---- panel --------------------------------------------------------------

  const renderTools = () => {
    undoBtn.disabled = !undoStack.length;
    redoBtn.disabled = !redoStack.length;
  };

  const renderCatalog = () => {
    catalogEl.innerHTML = CATALOG_ORDER.map((type) => {
      const def = CATALOG[type];
      const full = def.max && furn.count(type) >= def.max;
      return `<button type="button" data-type="${esc(type)}"${full ? " disabled" : ""} title="${full ? `Maksimal ${def.max}` : `Tambah ${esc(def.label.toLowerCase())}`}"><span class="lay-ico">${def.icon}</span> ${esc(def.label)}</button>`;
    }).join("");
  };

  const renderSelected = () => {
    const item = selected ? furn.get(selected) : null;
    if (!item) {
      selectedEl.innerHTML = `<p class="muted">Pilih benda di kantor untuk memindah atau mengubahnya.</p>`;
      return;
    }
    const def = CATALOG[item.type];
    selectedEl.innerHTML = `
      <div class="lay-name"><span class="lay-ico">${def.icon}</span> <b>${esc(def.label)}</b> <small>${esc(item.id)}</small></div>
      <div class="lay-actions">
        <button type="button" data-act="rotate" title="Putar 90° (R)">↻ Putar</button>
        <button type="button" data-act="duplicate" title="Gandakan (D)">⧉ Gandakan</button>
        ${def.variants > 1 ? `<button type="button" data-act="variant" title="Ganti warna / varian">🎨 Varian</button>` : ""}
        <button type="button" data-act="delete" class="danger" title="Hapus (Del)">🗑 Hapus</button>
      </div>`;
  };

  const select = (id) => {
    selected = id;
    const item = id ? furn.get(id) : null;
    if (item && !held) showOverlay(item, "sel");
    else if (!held) clearOverlay();
    renderSelected();
  };

  // ---- holding a piece (dragging it, or placing a new one) ----------------

  const probeOf = () => ({ ...furn.get(held.id), x: held.x, z: held.z, rot: held.rot });

  const refreshHold = () => {
    const probe = probeOf();
    const res = furn.canPlace(probe);
    held.ok = res.ok;
    furn.update(held.id, { x: held.x, z: held.z, rot: held.rot }, { preview: true });
    showOverlay(probe, res.ok ? "ok" : "bad");
    setStatus(res.ok ? (held.isNew ? "Klik untuk menaruh · R putar · Esc batal" : "Lepas untuk menaruh · R putar") : res.reason, res.ok ? "" : "err");
  };

  const startHold = (item, opts) => {
    held = { id: item.id, x: item.x, z: item.z, rot: item.rot, offX: 0, offZ: 0, isNew: false, moved: false, ok: true, start: { x: item.x, z: item.z, rot: item.rot }, ...opts };
    canvas.style.cursor = "grabbing";
    refreshHold();
  };

  const cancelHold = () => {
    if (!held) return;
    const h = held;
    held = null;
    canvas.style.cursor = "";
    if (h.isNew) { furn.remove(h.id, { silent: true }); select(null); } else { furn.resetModel(h.id); select(h.id); }
    setStatus("");
  };

  const commitHold = () => {
    const h = held;
    if (!h) return;
    if (h.isNew && !h.ok) { // a new piece stays in hand until it lands on a free spot
      refreshHold();
      return;
    }
    held = null;
    canvas.style.cursor = "";
    const changedPlace = h.isNew || h.x !== h.start.x || h.z !== h.start.z || h.rot !== h.start.rot;
    if (!h.ok || !changedPlace) { furn.resetModel(h.id); select(h.id); if (!h.ok) setStatus("Tidak bisa ditaruh di sini", "err"); else setStatus(""); return; }
    pushUndo(h.before);
    furn.update(h.id, { x: h.x, z: h.z, rot: h.rot });
    select(h.id);
    renderCatalog();
    scheduleSave();
  };

  const startPlacing = (type, from = null) => {
    cancelHold();
    const def = CATALOG[type];
    if (!def || (def.max && furn.count(type) >= def.max)) return;
    const centre = world.groundPoint(window.innerWidth / 2, window.innerHeight / 2);
    const x = from?.x ?? centre?.x ?? 20;
    const z = from?.z ?? centre?.z ?? 12;
    const item = furn.add(type, x, z, from?.rot ?? 0, from?.variant, { silent: true });
    startHold(item, { isNew: true, before: snapshotWithout(item.id), moved: true });
    select(item.id);
  };

  // ---- actions on the selected piece --------------------------------------

  const rotateSelected = () => {
    if (held) { held.rot = (held.rot + 1) % 4; held.moved = true; refreshHold(); return; }
    const item = selected ? furn.get(selected) : null;
    if (!item) return;
    const turned = { ...item, rot: (item.rot + 1) % 4 };
    const res = furn.canPlace(turned);
    if (!res.ok) { setStatus(`Tidak bisa diputar: ${res.reason}`, "err"); return; }
    pushUndo(snapshot());
    furn.update(item.id, { rot: turned.rot });
    select(item.id);
    scheduleSave();
  };

  const deleteSelected = () => {
    const item = selected ? furn.get(selected) : null;
    if (!item || held) return;
    pushUndo(snapshot());
    furn.remove(item.id);
    select(null);
    renderCatalog();
    scheduleSave();
  };

  const duplicateSelected = () => {
    const item = selected ? furn.get(selected) : null;
    if (!item || held) return;
    startPlacing(item.type, { x: item.x + 0.6, z: item.z + 0.6, rot: item.rot, variant: item.variant });
  };

  const cycleVariant = () => {
    const item = selected ? furn.get(selected) : null;
    const def = item && CATALOG[item.type];
    if (!def?.variants || held) return;
    pushUndo(snapshot());
    furn.update(item.id, { variant: ((item.variant ?? 0) + 1) % def.variants });
    select(item.id);
    scheduleSave();
  };

  const resetAll = async () => {
    if (!window.confirm("Kembalikan semua furnitur ke posisi bawaan? (bisa diurungkan dengan Ctrl+Z)")) return;
    cancelHold();
    pushUndo(snapshot());
    furn.reset();
    select(null);
    renderCatalog();
    try {
      await fetch("/api/layout", { method: "DELETE" });
      setStatus("Layout dikembalikan ke bawaan ✓", "ok");
    } catch (err) {
      setStatus(`Gagal menghapus layout tersimpan: ${err.message}`, "err");
    }
  };

  // ---- pointer and keyboard ----------------------------------------------

  // Capture phase: runs before the camera controls, so dragging a piece does not orbit.
  canvas.addEventListener("pointerdown", (e) => {
    if (!active || e.button !== 0) return;
    if (held?.isNew) { e.stopImmediatePropagation(); return; } // the click lands the piece (pointerup)
    const hit = world.pickFurniture(e.clientX, e.clientY);
    if (!hit) { select(null); return; } // empty floor: the camera orbits as usual
    e.stopImmediatePropagation();
    e.preventDefault();
    select(hit.id);
    const g = world.groundPoint(e.clientX, e.clientY);
    startHold(hit, { offX: g ? hit.x - g.x : 0, offZ: g ? hit.z - g.z : 0, before: snapshot() });
  }, { capture: true });

  window.addEventListener("pointermove", (e) => {
    if (!active) return;
    if (!held) {
      if (e.target === canvas) canvas.style.cursor = world.pickFurniture(e.clientX, e.clientY) ? "grab" : "";
      return;
    }
    if (e.target !== canvas && held.isNew) return; // the new piece waits while the pointer is over the panel
    const g = world.groundPoint(e.clientX, e.clientY);
    if (!g) return;
    const probe = probeOf();
    const s = furn.snap(probe, g.x + held.offX, g.z + held.offZ);
    if (!held.moved && Math.hypot(s.x - held.start.x, s.z - held.start.z) < 0.05) return;
    held.moved = true;
    held.x = s.x;
    held.z = s.z;
    refreshHold();
  });

  window.addEventListener("pointerup", (e) => {
    if (!active || e.button !== 0 || !held) return;
    if (held.isNew && e.target !== canvas) return;
    commitHold();
  });

  window.addEventListener("keydown", (e) => {
    if (!active) return;
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if ((e.ctrlKey || e.metaKey) && key === "y") { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (key === "r") rotateSelected();
    else if (key === "delete" || key === "backspace") { e.preventDefault(); deleteSelected(); }
    else if (key === "d") duplicateSelected();
    else if (key === "escape") { if (held) cancelHold(); else select(null); }
  });

  catalogEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-type]");
    if (btn && !btn.disabled) startPlacing(btn.dataset.type);
  });
  selectedEl.addEventListener("click", (e) => {
    const act = e.target.closest("button[data-act]")?.dataset.act;
    if (act === "rotate") rotateSelected();
    else if (act === "duplicate") duplicateSelected();
    else if (act === "variant") cycleVariant();
    else if (act === "delete") deleteSelected();
  });
  undoBtn.onclick = undo;
  redoBtn.onclick = redo;
  document.getElementById("layout-reset").onclick = resetAll;

  // ---- open / close -------------------------------------------------------

  const exit = () => {
    if (!active) return;
    cancelHold();
    active = false;
    selected = null;
    clearOverlay();
    panel.classList.add("hidden");
    document.body.classList.remove("editing");
    toggleBtn.classList.remove("playing");
    canvas.style.cursor = "";
    if (saveTimer) { clearTimeout(saveTimer); save(); }
  };

  const enter = () => {
    active = true;
    panel.classList.remove("hidden");
    document.body.classList.add("editing");
    toggleBtn.classList.add("playing");
    setStatus("");
    renderCatalog();
    renderTools();
    select(null);
  };

  toggleBtn.addEventListener("click", () => (active ? exit() : enter()));
  document.getElementById("layout-close").onclick = exit;
  document.getElementById("layout-done").onclick = exit;

  return { isActive: () => active, exit };
};
