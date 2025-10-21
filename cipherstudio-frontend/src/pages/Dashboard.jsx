import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Pencil, Plus, Search as SearchIcon, Users, Clock, FolderGit2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ProjectService from "../services/ProjectService.js";
import Modal from "../components/ui/Modal.jsx";
import { ProjectCardSkeleton, Skeleton } from "../components/ui/Skeleton.jsx";

const LAST_PROJECT_KEY = "cipherstudio.lastProjectId";

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("updated-desc");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isAuthenticated || !user?.id) {
        setProjects([]);
        setLoading(false);
        return;
      }
      try {
        const list = await ProjectService.fetchProjects(user.id);
        if (!cancelled) {
          setProjects(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to fetch projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.id, isAuthenticated]);

  const openProject = (proj) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_PROJECT_KEY, proj._id || proj.id || "");
      }
    } catch {}
    const ws = crypto.randomUUID();
    navigate(`/workspace/${ws}/ide`);
  };

  const parseGithub = (url) => {
    if (!url) return null;
    const m = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^\/\s]+)\/([^\/?#\s]+?)(?:\.git)?(?:[\/#?].*)?$/i);
    if (!m) return null;
    return { owner: m[1], repo: m[2] };
  };

  useEffect(() => {
    const parsed = parseGithub(cloneUrl);
    if (parsed && !cloneName) {
      setCloneName(parsed.repo.replace(/[-_]/g, " "));
    }
    setCloneError("");
  }, [cloneUrl]);

  const onClone = async () => {
    const parsed = parseGithub(cloneUrl);
    if (!parsed) {
      setCloneError("Enter a valid GitHub URL like https://github.com/owner/repo");
      return;
    }
    const name = cloneName?.trim() || parsed.repo;
    try {
      setCloning(true);
      setCloneError("");
      const result = await ProjectService.cloneFromUrl({
        url: cloneUrl,
        name
      });
      const proj = result?.project || result; // fallback if backend returns the doc
      if (!proj) throw new Error("Clone failed: invalid response");
      setProjects((ps) => [proj, ...ps]);
      setCloneOpen(false);
      setCloneUrl("");
      setCloneName("");
      openProject(proj);
    } catch (e) {
      setCloneError(e?.message || "Failed to clone repository");
    } finally {
      setCloning(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.name || "Untitled Project").toLowerCase().includes(q));
  }, [projects, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const byDate = (a, b, key) => new Date(b[key] || b.updatedAt || b.createdAt || 0) - new Date(a[key] || a.updatedAt || a.createdAt || 0);
    switch (sortKey) {
      case "updated-asc":
        return arr.sort((a, b) => -byDate(a, b, "updatedAt"));
      case "name-asc":
        return arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "name-desc":
        return arr.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      case "created-desc":
        return arr.sort((a, b) => byDate(a, b, "createdAt"));
      case "collab-desc":
        return arr.sort((a, b) => (b.collaborators?.length || 0) - (a.collaborators?.length || 0));
      case "updated-desc":
      default:
        return arr.sort((a, b) => byDate(a, b, "updatedAt"));
    }
  }, [filtered, sortKey]);

  const totalCollabs = useMemo(() => projects.reduce((a, p) => a + (p.collaborators?.length || 0), 0), [projects]);
  const lastUpdated = useMemo(() => {
    const times = projects.map(p => new Date(p.updatedAt || p.createdAt || 0).getTime());
    const t = Math.max(...times, 0);
    return t ? new Date(t).toLocaleString() : "—";
  }, [projects]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header + actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Your Workspaces</h1>
            <p className="mt-1 text-sm text-slate-400">Create, reopen, and manage your browser IDE projects.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workspaces"
                className="w-64 rounded-lg border border-slate-700/80 bg-slate-900/70 pl-8 pr-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="hidden rounded-lg border border-slate-700/80 bg-slate-900/70 px-2 py-2 text-sm text-slate-200 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 sm:block"
              title="Sort"
            >
              <option value="updated-desc">Recently updated</option>
              <option value="updated-asc">Least recently updated</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="created-desc">Recently created</option>
              <option value="collab-desc">Most collaborators</option>
            </select>
            <button
              type="button"
              onClick={() => setCloneOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              Clone from URL
            </button>
            <Link
              to={`/workspace/${crypto.randomUUID()}/ide`}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400"
            >
              <Plus size={14} /> New Workspace
            </Link>
          </div>
        </div>

        {/* Stats */}
        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-500"><FolderGit2 size={12} /> Total</div>
            {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <div className="mt-2 text-2xl font-bold text-amber-300">{projects.length}</div>}
          </div>
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-500"><Users size={12} /> Collaborators</div>
            {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <div className="mt-2 text-2xl font-bold text-amber-300">{totalCollabs}</div>}
          </div>
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-500"><Clock size={12} /> Last updated</div>
            {loading ? <Skeleton className="mt-2 h-5 w-40" /> : <div className="mt-2 text-base font-medium text-slate-300">{lastUpdated}</div>}
          </div>
        </section>

        {/* Content */}
        {loading ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <li key={idx}><ProjectCardSkeleton /></li>
            ))}
          </ul>
        ) : error ? (
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-6 text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-800/70 bg-slate-950/60 p-10 text-center text-slate-400">
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300">No Results</div>
            <p className="max-w-md text-sm">{projects.length === 0 ? "No projects yet." : "No workspaces match your search."} Create a new workspace to get started.</p>
            <Link
              to={`/workspace/${crypto.randomUUID()}/ide`}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              <Plus size={14} /> Create workspace
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p) => (
              <li
                key={p._id || p.id}
                className="group relative overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 transition hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-[0_20px_40px_-20px_rgba(245,158,11,0.35)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-400/20 to-amber-500/5 opacity-0 transition group-hover:opacity-100" />
                <div className="relative z-[1] flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-slate-200 font-semibold">{p.name || "Untitled Project"}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">Updated {(p.updatedAt || p.createdAt) ? new Date(p.updatedAt || p.createdAt).toLocaleString() : ""}</div>
                    <div className="mt-2 text-xs text-slate-400">Collaborators: {(p.collaborators?.length || 0)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openProject(p)}
                      className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-amber-500/70 hover:bg-slate-900/60"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const name = prompt("Rename project", p.name);
                        if (!name) return;
                        try { await ProjectService.updateProject(p._id || p.id, { name }); setProjects(ps => ps.map(x => (x._id===p._id||x.id===p.id) ? { ...x, name } : x)); } catch (e) { alert("Rename failed"); }
                      }}
                      className="rounded-lg border border-slate-700/80 p-1.5 text-slate-300 transition hover:border-amber-500/70 hover:bg-slate-900/60"
                      title="Rename"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete this project? This cannot be undone.")) return;
                        try { await ProjectService.deleteProject(p._id || p.id); setProjects(ps => ps.filter(x => (x._id||x.id) !== (p._id||p.id))); } catch (e) { alert("Delete failed"); }
                      }}
                      className="rounded-lg border border-slate-700/80 p-1.5 text-red-300 transition hover:border-red-500/70 hover:bg-slate-900/60"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Clone from URL modal */}
      <Modal
        open={cloneOpen}
        onClose={() => { if (!cloning) { setCloneOpen(false); setCloneUrl(""); setCloneName(""); setCloneError(""); } }}
        title="Clone from GitHub"
        footer={(
          <>
            <button
              className="rounded border border-slate-700/60 px-3 py-1.5 text-xs text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60"
              onClick={() => { if (!cloning) { setCloneOpen(false); setCloneUrl(""); setCloneName(""); setCloneError(""); } }}
              disabled={cloning}
            >
              Cancel
            </button>
            <button
              data-modal-primary="true"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-700/80 bg-amber-600/20 px-3 py-1.5 text-xs text-slate-100 hover:bg-amber-600/30 disabled:opacity-60"
              onClick={onClone}
              disabled={cloning}
            >
              {cloning ? "Cloning…" : "Clone"}
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <div className="text-sm text-slate-300">Paste a GitHub repository URL. We’ll create a workspace and link it to this repo. Example: <span className="text-slate-400">https://github.com/facebook/react</span></div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-500">Repository URL</label>
            <input
              autoFocus
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 shadow-inner outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-500">Workspace name</label>
            <input
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="My cloned project"
              className="w-full rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 shadow-inner outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          {cloneUrl && (
            <div className="text-xs text-slate-400">
              {parseGithub(cloneUrl) ? (
                <span>Detected repo: <span className="text-amber-300">{parseGithub(cloneUrl).owner}/{parseGithub(cloneUrl).repo}</span></span>
              ) : (
                <span>Enter a valid GitHub URL</span>
              )}
            </div>
          )}
          {cloneError && <div className="text-xs text-rose-400">{cloneError}</div>}
        </div>
      </Modal>
    </main>
  );
};

export default Dashboard;
