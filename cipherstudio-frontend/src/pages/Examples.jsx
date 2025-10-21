import { Link, useNavigate } from "react-router-dom";
import exampleProjects from "../data/exampleProjects.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Code2, Play, Tags } from "lucide-react";

const Examples = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const startExample = (id) => {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }
    const ws = crypto.randomUUID();
    navigate(`/workspace/${ws}/ide?example=${encodeURIComponent(id)}`);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Examples Gallery</h1>
            <p className="mt-1 text-sm text-slate-400">Start a mini project instantly in your browser IDE.</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-500/50 hover:bg-slate-900/80"
            title="Back to Home"
          >
            Home
          </Link>
        </header>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {exampleProjects.map((ex) => (
            <li key={ex.id} className="group relative overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/70 p-5 transition hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-[0_20px_40px_-20px_rgba(245,158,11,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-400/20 to-amber-500/5 opacity-0 transition group-hover:opacity-100" />
              <div className="relative z-[1] grid gap-3">
                <div className="inline-flex items-center gap-2 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                  <Code2 size={14} /> Mini Project
                </div>
                <h2 className="truncate text-lg font-semibold text-slate-100" title={ex.name}>{ex.name}</h2>
                <p className="line-clamp-3 text-sm text-slate-400">{ex.description || ex.tagline}</p>
                {Array.isArray(ex.tags) && ex.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <Tags size={12} className="text-slate-500" />
                    {ex.tags.map((t) => (
                      <span key={t} className="rounded-full border border-slate-700/70 px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => startExample(ex.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    <Play size={14} /> Start in IDE
                  </button>
                  <a
                    href={`https://github.com/PriyanshK09/CipherSchools-CipherStudio/tree/main/cipherstudio-frontend/src/data/exampleProjects.js#${ex.id}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                  >
                    View source
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};

export default Examples;
