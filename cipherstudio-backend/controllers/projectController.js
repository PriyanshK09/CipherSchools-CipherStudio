import Project from "../models/Project.js";
import File from "../models/File.js";
import User from "../models/User.js";
import fetch from "node-fetch";
import zlib from "zlib";
import tar from "tar";

const defaultFilePayloads = () => {
  const reactCss = `body {\n  margin: 0;\n  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n  background-color: #020617;\n  color: #e2e8f0;\n}\n`;
  const appComponent = `export default function App() {\n  return (\n    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#020617', color: '#e2e8f0' }}>\n      <div style={{ textAlign: 'center' }}>\n        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>CipherStudio</h1>\n        <p>Build and preview full-stack projects in your browser.</p>\n      </div>\n    </div>\n  );\n}\n`;
  const mainEntry = `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.jsx';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`;
  const pkg = {
    name: "cipherstudio-sandbox",
    version: "0.0.1",
    private: true,
    main: "src/main.jsx",
    dependencies: {
      react: "latest",
      "react-dom": "latest"
    }
  };

  return {
    css: reactCss,
    app: appComponent,
    main: mainEntry,
    pkg: JSON.stringify(pkg, null, 2)
  };
};

const createDefaultFilesForProject = async (projectId) => {
  const payloads = defaultFilePayloads();
  const srcFolder = await File.create({
    projectId,
    parentId: null,
    name: "src",
    type: "folder",
    path: "src"
  });

  const created = await File.insertMany([
    {
      projectId,
      parentId: srcFolder._id,
      name: "App.jsx",
      type: "file",
      path: "src/App.jsx",
      content: payloads.app
    },
    {
      projectId,
      parentId: srcFolder._id,
      name: "main.jsx",
      type: "file",
      path: "src/main.jsx",
      content: payloads.main
    },
    {
      projectId,
      parentId: srcFolder._id,
      name: "index.css",
      type: "file",
      path: "src/index.css",
      content: payloads.css
    },
    {
      projectId,
      parentId: null,
      name: "package.json",
      type: "file",
      path: "package.json",
      content: payloads.pkg
    }
  ]);

  return [srcFolder, ...created];
};

const replaceProjectFiles = async (projectId, files = []) => {
  await File.deleteMany({ projectId });
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const ordered = [...files].sort((a, b) => a.path.split("/").length - b.path.split("/").length);
  const idByPath = new Map();

  for (const entry of ordered) {
    const parentPath = entry.path.includes("/") ? entry.path.split("/").slice(0, -1).join("/") : "";
    const parentId = parentPath ? idByPath.get(parentPath) ?? null : null;
    const doc = await File.create({
      projectId,
      parentId,
      name: entry.name,
      type: entry.type,
      path: entry.path,
      content: entry.type === "file" ? entry.content ?? "" : ""
    });
    idByPath.set(entry.path, doc._id);
  }

  return File.find({ projectId }).sort({ path: 1 });
};

export const createProject = async (req, res, next) => {
  try {
    const { name, provider = null, remoteUrl = null, meta = null } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await Project.create({
      userId: req.userId,
      name,
      provider,
      remoteUrl,
      meta
    });

    const files = await createDefaultFilesForProject(project._id);

    res.status(201).json({
      project,
      files
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectsForUser = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [
        { userId: req.userId },
        { collaborators: req.userId }
      ]
    }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    const hasAccess = String(project.userId) === String(req.userId) || (project.collaborators || []).some((id) => String(id) === String(req.userId));
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const files = await File.find({ projectId: project._id }).sort({ path: 1 });
    res.json({ project, files });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { name, files } = req.body;
    if (files !== undefined && !Array.isArray(files)) {
      return res.status(400).json({ message: "files must be an array" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    const hasAccess = String(project.userId) === String(req.userId) || (project.collaborators || []).some((id) => String(id) === String(req.userId));
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    if (name) {
      project.name = name;
    }
    project.updatedAt = new Date();
    await project.save();

    let syncedFiles;
    if (Array.isArray(files)) {
      syncedFiles = await replaceProjectFiles(project._id, files);
    }

    res.json({ project, files: syncedFiles });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (String(project.userId) !== String(req.userId)) return res.status(403).json({ message: "Only owner can delete" });
    await Project.deleteOne({ _id: project._id });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    await File.deleteMany({ projectId: project._id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const listCollaborators = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId }).populate("collaborators", "name email");
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project.collaborators || []);
  } catch (error) {
    next(error);
  }
};

export const addCollaborator = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (String(user._id) === String(project.userId)) return res.status(400).json({ message: "Owner already has access" });
    const exists = (project.collaborators || []).some((id) => String(id) === String(user._id));
    if (!exists) {
      project.collaborators = [...(project.collaborators || []), user._id];
      await project.save();
      return res.status(204).end();
    }
    return res.status(409).json({ message: "Already a collaborator" });
  } catch (error) {
    next(error);
  }
};

export const removeCollaborator = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
    if (!project) return res.status(404).json({ message: "Project not found" });
    project.collaborators = (project.collaborators || []).filter((id) => String(id) !== String(userId));
    await project.save();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

const parseGithubUrl = (url) => {
  if (!url) return null;
  const m = String(url).trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^\/\s]+)\/([^\/?#\s]+?)(?:\.git)?(?:[\/#?].*)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
};

export const cloneFromGithub = async (req, res, next) => {
  try {
    const { url, owner: o, repo: r, branch: b, name: n } = req.body || {};
    const parsed = url ? parseGithubUrl(url) : null;
    const owner = (o || parsed?.owner || "").trim();
    const repo = (r || parsed?.repo || "").trim();
    if (!owner || !repo) {
      return res.status(400).json({ message: "Provide a valid GitHub URL or owner/repo" });
    }

    // Try to resolve a tarball URL without using REST API to avoid rate limits
    let branch = (b || "").trim();
    const tryRefs = branch ? [branch] : ["main", "master"]; // common defaults
    let tarballResp = null;
    let usedRef = null;
    for (const ref of tryRefs) {
      const resp = await fetch(`https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(ref)}`);
      if (resp.ok) {
        tarballResp = resp; usedRef = ref; break;
      }
    }
    if (!tarballResp) {
      // Last resort: fetch default_branch via API (with optional token) and try again
      const headers = {};
      if (process.env.GITHUB_TOKEN) headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
      const repoResp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoResp.ok) {
        const msg = await repoResp.text();
        return res.status(repoResp.status).json({ message: `GitHub repo fetch failed: ${msg}` });
      }
      const info = await repoResp.json();
      branch = info.default_branch || "main";
      const resp = await fetch(`https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(branch)}`);
      if (!resp.ok) {
        const msg = await resp.text();
        return res.status(resp.status).json({ message: `GitHub tarball fetch failed: ${msg}` });
      }
      tarballResp = resp; usedRef = branch;
    }

    // Stream + extract tarball
    const MAX_FILES = 1000;
    const MAX_BYTES = 20 * 1024 * 1024; // 20MB content cap
    let totalBytes = 0;
    const files = [];

    await new Promise((resolve, reject) => {
      const gunzip = zlib.createGunzip();
      const parser = tar.t({
        onentry: (entry) => {
          const { type, path: fullPath } = entry;
          // Tarball prefixes files with a top-level folder like `${repo}-${ref}/...`
          const parts = fullPath.split("/");
          parts.shift(); // remove top-level folder
          const relPath = parts.join("/");
          if (!relPath) {
            entry.resume();
            return;
          }
          if (type === "Directory") {
            entry.resume();
            return;
          }
          if (type !== "File") {
            entry.resume();
            return;
          }
          const chunks = [];
          entry.on("data", (c) => {
            totalBytes += c.length;
            if (totalBytes > MAX_BYTES) {
              parser.destroy(new Error(`Repository content too large (> ${MAX_BYTES} bytes)`));
              return;
            }
            chunks.push(c);
          });
          entry.on("end", () => {
            const buf = Buffer.concat(chunks);
            files.push({ path: relPath, content: buf.toString("utf-8") });
            if (files.length > MAX_FILES) {
              parser.destroy(new Error(`Repository too large to import (> ${MAX_FILES} files)`));
            }
          });
        }
      });
      parser.on("finish", resolve);
      parser.on("error", reject);
      tarballResp.body.pipe(gunzip).pipe(parser);
    });

    // Derive unique folder entries
    const folderSet = new Set();
    for (const f of files) {
      const parts = f.path.split("/");
      for (let i = 1; i < parts.length; i++) folderSet.add(parts.slice(0, i).join("/"));
    }
    const folders = Array.from(folderSet).sort((a, b) => a.split("/").length - b.split("/").length);

    // Create project
    const project = await Project.create({
      userId: req.userId,
      name: n || repo,
      provider: "github",
      remoteUrl: url || `https://github.com/${owner}/${repo}`,
      meta: { owner, repo, branch: usedRef || branch }
    });

    const entries = [
      ...folders.map((p) => ({ name: p.split("/").pop(), type: "folder", path: p })),
      ...files.map((f) => ({ name: f.path.split("/").pop(), type: "file", path: f.path, content: f.content }))
    ];
    const replaced = await replaceProjectFiles(project._id, entries);

    res.status(201).json({ project, files: replaced });
  } catch (error) {
    next(error);
  }
};
