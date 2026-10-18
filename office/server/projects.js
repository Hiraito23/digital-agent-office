"use strict";
// Projects the agents can work on: the folders inside WORKSPACE_DIR (the host
// folder PROJECTS_DIR from .env, mounted as /workspace in both containers).
//   GET /api/projects           { root, active, projects: [{ name, git, branch }] }
//   PUT /api/projects/active    { name } (or { name: null } to clear)
// The active project is saved in config/office.json and handed to the adapter,
// which adds the project folder and git rules to every agent's prompt.
const fs = require("fs");
const path = require("path");

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/workspace";
const OFFICE_FILE = process.env.OFFICE_FILE || path.join(__dirname, "..", "office.json");
// "name" or "group/name"; no "..", backslashes or leading slash.
const NAME_RE = /^(?!.*\.\.)[^/\\\0]{1,120}(\/[^/\\\0]{1,120})?$/;

const readOffice = () => {
  try { return JSON.parse(fs.readFileSync(OFFICE_FILE, "utf8")); } catch { return {}; }
};
const writeOffice = (data) => {
  const tmp = `${OFFICE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, OFFICE_FILE);
};

// Current branch from .git/HEAD ("ref: refs/heads/<branch>"); null when not a repo.
const gitInfo = (dir) => {
  try {
    let gitDir = path.join(dir, ".git");
    if (fs.statSync(gitDir).isFile()) {
      const pointer = fs.readFileSync(gitDir, "utf8").trim().replace(/^gitdir:\s*/, "");
      gitDir = path.resolve(dir, pointer);
    }
    const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    return { git: true, branch: head.startsWith("ref: refs/heads/") ? head.slice(16) : "(detached)" };
  } catch {
    return { git: false, branch: null };
  }
};

const subfolders = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
      .map((e) => e.name);
  } catch {
    return [];
  }
};

// Projects = top-level folders, plus git repos one level deeper (so a folder
// that groups repos, like "Kalla/oase-tanjung", shows each repo).
const listProjects = () => {
  const projects = [];
  for (const top of subfolders(WORKSPACE_DIR)) {
    const topDir = path.join(WORKSPACE_DIR, top);
    const info = gitInfo(topDir);
    projects.push({ name: top, ...info });
    if (info.git) continue;
    for (const child of subfolders(topDir)) {
      const childInfo = gitInfo(path.join(topDir, child));
      if (childInfo.git) projects.push({ name: `${top}/${child}`, ...childInfo });
    }
  }
  return projects.sort((a, b) => a.name.localeCompare(b.name));
};

const toProject = (name) => (name ? { name, path: path.posix.join(WORKSPACE_DIR, name) } : null);

const send = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 4096) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { resolve(null); } });
  });

const createProjectsApi = ({ team }) => {
  // Re-apply the saved project when the server starts.
  const saved = readOffice().activeProject;
  if (saved && listProjects().some((p) => p.name === saved)) team.setProject(toProject(saved));

  return async (req, res, urlPath) => {
    if (urlPath === "/api/projects" && req.method === "GET") {
      const active = readOffice().activeProject ?? null;
      return send(res, 200, { root: WORKSPACE_DIR, active, projects: listProjects() });
    }
    if (urlPath === "/api/projects/active" && req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return send(res, 400, { error: "JSON tidak valid" });
      const name = body.name ? String(body.name) : null;
      if (name && (!NAME_RE.test(name) || !listProjects().some((p) => p.name === name))) {
        return send(res, 404, { error: `proyek "${name}" tidak ditemukan di ${WORKSPACE_DIR}` });
      }
      writeOffice({ ...readOffice(), activeProject: name });
      team.setProject(toProject(name));
      return send(res, 200, { ok: true, active: name, path: toProject(name)?.path ?? null });
    }
    return send(res, 404, { error: "tidak ditemukan" });
  };
};

module.exports = { createProjectsApi };
