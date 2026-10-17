// Minimal client for the Hermes gateway adapter (Claw3D/OpenClaw-style frames).
export class Gateway extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this.pending = new Map();
    this.seq = 0;
    this.connected = false;
  }

  start() {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onmessage = (event) => {
      let frame;
      try { frame = JSON.parse(event.data); } catch { return; }
      if (frame.type === "event" && frame.event === "connect.challenge") {
        this.request("connect", { client: { id: "pixel-office", mode: "webchat" } }).then(() => {
          this.connected = true;
          this.emit("status", { connected: true });
        });
        return;
      }
      if (frame.type === "res") {
        const entry = this.pending.get(frame.id);
        if (!entry) return;
        this.pending.delete(frame.id);
        frame.ok ? entry.resolve(frame.payload) : entry.reject(new Error(frame.error?.message || "request failed"));
        return;
      }
      if (frame.type === "event") this.emit(frame.event, frame.payload ?? {});
    };
    ws.onclose = () => {
      this.connected = false;
      for (const entry of this.pending.values()) entry.reject(new Error("disconnected"));
      this.pending.clear();
      this.emit("status", { connected: false });
      setTimeout(() => this.start(), 2000);
    };
  }

  emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  request(method, params = {}) {
    const id = `po-${Date.now()}-${this.seq++}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.ws.send(JSON.stringify({ type: "req", id, method, params }));
      } catch (err) {
        this.pending.delete(id);
        reject(err);
      }
    });
  }
}

export const sessionKeyFor = (agentId) => `agent:${agentId}:main`;
export const agentIdFromSession = (key) => (typeof key === "string" && key.startsWith("agent:") ? key.split(":")[1] : "hermes");
