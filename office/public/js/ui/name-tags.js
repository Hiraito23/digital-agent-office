// Name tags and speech bubbles above the agents. They are plain DOM elements
// (not 3D text) so the text stays sharp in every pixel mode. world.js provides
// the screen position of each head; render() places a tag and, when the agent
// has said something recently, a bubble above it.

const BUBBLE_MAX_CHARS = 110;

// Speech bubbles show plain text: drop code blocks and markdown symbols.
const toBubbleText = (text) => {
  const clean = String(text || "").replace(/```[\s\S]*?```/g, "[kode]").replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > BUBBLE_MAX_CHARS ? `${clean.slice(0, BUBBLE_MAX_CHARS - 1)}…` : clean;
};

export class NameTags {
  constructor(container) {
    this.container = container;
    this.nodes = new Map(); // agentId -> { tag, bubble }
    this.bubbles = new Map(); // agentId -> { text, until }
  }

  // Show a bubble above an agent for `ms` milliseconds.
  say(agentId, text, ms = 6000) {
    const clean = toBubbleText(text);
    if (clean) this.bubbles.set(agentId, { text: clean, until: performance.now() + ms });
  }

  // tags: [{ agent, x, y }] in CSS pixels (from World.tagPositions()).
  render(tags) {
    const seen = new Set();
    for (const { agent, x, y } of tags) {
      seen.add(agent.id);
      const node = this.nodeFor(agent);
      const label = `${agent.activityIcon ? `${agent.activityIcon} ` : ""}${agent.name}<span class="role">${agent.role || ""}</span>`;
      if (node.tag.innerHTML !== label) node.tag.innerHTML = label;
      node.tag.classList.toggle("speaking", Boolean(agent.speaking));
      const top = y - 4;
      node.tag.style.left = `${x}px`;
      node.tag.style.top = `${top}px`;

      const bubble = this.bubbles.get(agent.id);
      if (bubble && bubble.until > performance.now()) {
        if (node.bubble.textContent !== bubble.text) node.bubble.textContent = bubble.text;
        node.bubble.style.display = "block";
        node.bubble.style.left = `${x}px`;
        node.bubble.style.top = `${top - 26}px`;
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
    }
  }

  nodeFor(agent) {
    let node = this.nodes.get(agent.id);
    if (!node) {
      node = { tag: document.createElement("div"), bubble: document.createElement("div") };
      node.tag.className = `tag${agent.isMain ? " main" : ""}`;
      node.bubble.className = "bubble";
      this.container.append(node.tag, node.bubble);
      this.nodes.set(agent.id, node);
    }
    return node;
  }
}
