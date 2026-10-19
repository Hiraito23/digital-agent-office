"use strict";
// Projects the agents can work on: the folders inside WORKSPACE_DIR (the host
// folder PROJECTS_DIR from .env, mounted as /workspace in both containers).
//   GET /api/projects           { root, active, projects: [{ name, git, branch }] }
//   GET /api/projects/browse?path=<rel>  subfolders of a workspace folder (the folder browser)
//   PUT /api/projects/active    { name } any workspace folder, e.g. "Kalla/oase" (or null to clear)
// The active project is saved in config/office.json and handed to the adapter,
// which adds the project folder and git rules to every agent's prompt.
const fs = require("fs");
const path = require("path");

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/workspace";
const OFFICE_FILE = process.env.OFFICE_FILE || path.join(__dirname, "..", "office.json");

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

// Projects = git repos only: top-level folders that are repos, plus repos one
// level deeper (so a folder that groups repos, like "Kalla/oase-tanjung",
// shows each repo). Agents need git to work on their own branch.
const listProjects = () => {
  const projects = [];
  for (const top of subfolders(WORKSPACE_DIR)) {
    const topDir = path.join(WORKSPACE_DIR, top);
    const info = gitInfo(topDir);
    if (info.git) {
      projects.push({ name: top, ...info });
      continue;
    }
    for (const child of subfolders(topDir)) {
      const childInfo = gitInfo(path.join(topDir, child));
      if (childInfo.git) projects.push({ name: `${top}/${child}`, ...childInfo });
    }
  }
  return projects.sort((a, b) => a.name.localeCompare(b.name));
};

// A folder inside the workspace named by a relative "a/b/c" path (no "..", at most 6 levels);
// its real path can never leave the workspace. Returns { name, full } or null.
const resolveFolder = (rel) => {
  const parts = String(rel || "").split("/").filter(Boolean);
  if (parts.length > 6 || parts.some((p) => p === "." || p === ".." || /[\\\0]/.test(p))) return null;
  try {
    const base = fs.realpathSync(WORKSPACE_DIR);
    const full = fs.realpathSync(path.join(base, ...parts));
    if (full !== base && !full.startsWith(base + path.sep)) return null;
    if (!fs.statSync(full).isDirectory()) return null;
    return { name: parts.join("/"), full };
  } catch {
    return null;
  }
};

// Subfolders of a workspace folder for the folder browser, each with its git state.
const browse = (rel) => {
  const folder = resolveFolder(rel);
  if (!folder) return null;
  const folders = subfolders(folder.full).sort((a, b) => a.localeCompare(b)).map((name) => ({ name, ...gitInfo(path.join(folder.full, name)) }));
  const parts = folder.name ? folder.name.split("/") : [];
  return { path: folder.name, parent: parts.length ? parts.slice(0, -1).join("/") : null, ...gitInfo(folder.full), folders };
};

const toProject = (name) => {
  if (!name) return null;
  const dir = path.posix.join(WORKSPACE_DIR, name);
  return { name, path: dir, git: gitInfo(dir).git };
};

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
  if (saved && resolveFolder(saved)) team.setProject(toProject(saved));

  return async (req, res, urlPath) => {
    if (urlPath === "/api/projects" && req.method === "GET") {
      const projects = listProjects();
      const saved = readOffice().activeProject ?? null;
      // A saved folder that is gone is not active. Any folder in the workspace can be the project.
      const active = saved && resolveFolder(saved) ? saved : null;
      return send(res, 200, { root: WORKSPACE_DIR, active, git: active ? gitInfo(path.join(WORKSPACE_DIR, active)).git : false, projects });
    }
    if (urlPath === "/api/projects/browse" && req.method === "GET") {
      const rel = new URL(req.url, "http://x").searchParams.get("path") || "";
      const listing = browse(rel);
      return listing ? send(res, 200, { root: WORKSPACE_DIR, ...listing }) : send(res, 404, { error: "folder tidak ditemukan" });
    }
    if (urlPath === "/api/projects/active" && req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return send(res, 400, { error: "JSON tidak valid" });
      const name = body.name ? String(body.name).replace(/^\/+|\/+$/g, "") : null;
      if (name && !resolveFolder(name)) {
        return send(res, 404, { error: `folder "${name}" tidak ditemukan di ${WORKSPACE_DIR}` });
      }
      writeOffice({ ...readOffice(), activeProject: name });
      const project = toProject(name);
      team.setProject(project);
      return send(res, 200, { ok: true, active: name, path: project?.path ?? null, git: project?.git ?? false });
    }
    return send(res, 404, { error: "tidak ditemukan" });
  };
};

module.exports = { createProjectsApi };
