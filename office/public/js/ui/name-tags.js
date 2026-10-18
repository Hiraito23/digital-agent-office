// Name tags and speech bubbles above the agents. They are plain DOM elements
// (not 3D text) so the text stays sharp in every pixel mode. world.js provides
// the screen position of each head; render() places a tag and, when the agent
// has said something recently, a bubble above it.
//
// While an agent works on a task the tag also shows a progress bar with the elapsed time
// and the tool in use. The model cannot report a real percentage, so the bar is an
// estimate: it creeps up with time, jumps a little with every tool call, stops at about
// 94% and only fills (green) when the task is really finished (red when it failed).

const BUBBLE_MAX_CHARS = 170;
const TAG_HEIGHT = 30; // px: name line + job title line + padding
const PROGRESS_HEIGHT = 20; // px: the extra height of the progress bar and its caption
const DONE_SHOW_MS = 2200; // how long a finished task's bar stays
const MAX_ESTIMATE = 0.94;

// Speech bubbles show plain text: drop code blocks and markdown symbols.
const toBubbleText = (text) => {
  const clean = String(text || "").replace(/```[\s\S]*?```/g, "[kode]").replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > BUBBLE_MAX_CHARS ? `${clean.slice(0, BUBBLE_MAX_CHARS - 1)}…` : clean;
};

const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export class NameTags {
  constructor(container) {
    this.container = container;
    this.nodes = new Map(); // agentId -> { tag, label, progress, fill, text, bubble }
    this.bubbles = new Map(); // agentId -> { text, until }
    this.tools = new Map(); // agentId -> emoji of the Hermes tool in use
    this.tasks = new Map(); // agentId -> { start, steps, pct, tool, state: "running" | "done" | "error", endedAt }
  }

  // Show the emoji of the tool an agent is running (null clears it).
  setTool(agentId, emoji) {
    if (emoji) this.tools.set(agentId, emoji);
    else this.tools.delete(agentId);
  }

  // Show a bubble above an agent for `ms` milliseconds.
  say(agentId, text, ms = 6000) {
    const clean = toBubbleText(text);
    if (clean) this.bubbles.set(agentId, { text: clean, until: performance.now() + ms });
  }

  // --- progress of a task ---------------------------------------------------

  // elapsedMs: for a task already under way (page refreshed while the agent works)
  startTask(agentId, elapsedMs = 0) {
    const existing = this.tasks.get(agentId);
    if (existing?.state === "running") return;
    this.tasks.set(agentId, { start: performance.now() - Math.max(0, elapsedMs), steps: 0, pct: 0.04, tool: "", state: "running", endedAt: 0 });
  }

  // One more tool call: the bar jumps ahead and the caption shows what is being run.
  taskStep(agentId, label = "") {
    const task = this.tasks.get(agentId);
    if (!task || task.state !== "running") return;
    task.steps += 1;
    task.tool = String(label || "").replace(/\s+/g, " ").slice(0, 22);
  }

  // The reply was cancelled: no result to show, so the bar just disappears.
  cancelTask(agentId) {
    this.tasks.delete(agentId);
  }

  endTask(agentId, ok = true) {
    const task = this.tasks.get(agentId);
    if (!task || task.state !== "running") return;
    task.state = ok ? "done" : "error";
    task.endedAt = performance.now();
    task.pct = ok ? 1 : task.pct;
  }

  isWorking(agentId) {
    return this.tasks.get(agentId)?.state === "running";
  }

  // Estimated progress 0..MAX_ESTIMATE, never going backwards.
  estimate(task, now) {
    const minutes = (now - task.start) / 60000;
    const raw = 1 - Math.exp(-(minutes * 1.1 + task.steps * 0.2));
    task.pct = Math.max(task.pct, Math.min(MAX_ESTIMATE, 0.04 + raw * (MAX_ESTIMATE - 0.04)));
    return task.pct;
  }

  renderProgress(node, agentId, now) {
    const task = this.tasks.get(agentId);
    const visible = task && (task.state === "running" || now - task.endedAt < DONE_SHOW_MS);
    if (!visible) {
      if (task) this.tasks.delete(agentId);
      node.progress.style.display = "none";
      node.tag.classList.remove("working", "finished", "failed");
      return false;
    }
    const pct = task.state === "running" ? this.estimate(task, now) : task.pct;
    node.progress.style.display = "block";
    node.fill.style.width = `${Math.round(pct * 100)}%`;
    node.tag.classList.toggle("working", task.state === "running");
    node.tag.classList.toggle("finished", task.state === "done");
    node.tag.classList.toggle("failed", task.state === "error");
    const caption = task.state === "running"
      ? `${clock(now - task.start)}${task.tool ? ` · ${task.tool}` : ""}`
      : task.state === "done" ? `Selesai ✓ ${clock(task.endedAt - task.start)}` : "Gagal ✕";
    if (node.text.textContent !== caption) node.text.textContent = caption;
    return true;
  }

  // tags: [{ agent, x, y }] in CSS pixels (from World.tagPositions()).
  render(tags) {
    const seen = new Set();
    const now = performance.now();
    for (const { agent, x, y } of tags) {
      seen.add(agent.id);
      const node = this.nodeFor(agent);
      const tool = this.tools.get(agent.id);
      const icon = tool ? `${tool} ` : agent.activityIcon ? `${agent.activityIcon} ` : "";
      const label = `<span class="name">${icon}${agent.name}</span><span class="role">${agent.role || ""}</span>`;
      if (node.label.innerHTML !== label) node.label.innerHTML = label;
      node.tag.classList.toggle("speaking", Boolean(agent.speaking));
      node.tag.classList.toggle("tooling", Boolean(tool));
      const hasProgress = this.renderProgress(node, agent.id, now);
      const top = y - 4;
      node.tag.style.left = `${x}px`;
      node.tag.style.top = `${top}px`;

      const bubble = this.bubbles.get(agent.id);
      if (bubble && bubble.until > now) {
        if (node.bubble.textContent !== bubble.text) node.bubble.textContent = bubble.text;
        node.bubble.style.display = "block";
        node.bubble.style.left = `${x}px`;
        node.bubble.style.top = `${top - TAG_HEIGHT - (hasProgress ? PROGRESS_HEIGHT : 0) - 8}px`; // above the tag (and its bar)
      } else {
        node.bubble.style.display = "none";
      }
    }
    // remove tags of agents that left
    for (const [id, node] of this.nodes) {
      if (seen.has(id)) continue;
      node.tag.remove();
      node.bubble.remove();
      this.nodes.delete(id);
      this.tasks.delete(id);
    }
  }

  nodeFor(agent) {
    let node = this.nodes.get(agent.id);
    if (!node) {
      const tag = document.createElement("div");
      const label = document.createElement("div");
      const progress = document.createElement("div");
      const track = document.createElement("div");
      const fill = document.createElement("div");
      const text = document.createElement("div");
      tag.className = `tag${agent.isMain ? " main" : ""}`;
      progress.className = "progress";
      track.className = "progress-track";
      fill.className = "progress-fill";
      text.className = "progress-text";
      progress.style.display = "none";
      track.append(fill);
      progress.append(track, text);
      tag.append(label, progress);
      node = { tag, label, progress, fill, text, bubble: document.createElement("div") };
      node.bubble.className = "bubble";
      this.container.append(node.tag, node.bubble);
      this.nodes.set(agent.id, node);
    }
    return node;
  }
}
