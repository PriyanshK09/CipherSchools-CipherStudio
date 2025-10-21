import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Copy, ExternalLink, Layers } from "lucide-react";
import exampleProjects, { getExampleProjectById } from "../data/exampleProjects.js";

const DemoWorkspace = () => {
  const { exampleId } = useParams();
  const example = getExampleProjectById(exampleId);
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState("/src/App.jsx");

  if (!example) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-2xl border border-slate-800/70 bg-slate-950/80 px-8 py-10 text-center shadow-[0_35px_70px_-40px_rgba(56,189,248,0.45)]">
          <Layers size={48} className="text-sky-400" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-100">Template not found</h1>
            <p className="text-sm text-slate-400">
              The demo workspace you are looking for no longer exists. Explore the gallery to view current examples.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700/80 px-4 py-2 transition hover:border-sky-500/70 hover:bg-slate-900/60"
            >
              <ArrowLeft size={16} /> Back to home
            </Link>
            <Link
              to="/demo/analytics-dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              Explore demos
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/demo/${example.id}` : `/demo/${example.id}`;

  const handleCopyShare = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Failed to copy share link", error);
    }
  };

  const otherExamples = exampleProjects.filter((item) => item.id !== example.id);
  
  const getLanguage = (filename) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const langMap = { js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", json: "json", css: "css", html: "html" };
    return langMap[ext] || "javascript";
  };

  const fileList = Object.keys(example.files || {});
  const currentFileContent = example.files?.[activeFile] || "";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pt-12">
        <header className="flex flex-col gap-6 rounded-2xl border border-slate-800/70 bg-slate-950/80 px-8 py-7 shadow-[0_35px_70px_-40px_rgba(56,189,248,0.45)] backdrop-blur">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300">
              Demo Workspace
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-slate-100">{example.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{example.description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              {example.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyShare}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-sky-500/70 hover:text-sky-200"
              >
                <Copy size={14} /> {copied ? "Link copied" : "Copy share link"}
              </button>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                <ExternalLink size={14} /> Start editing
              </Link>
            </div>
          </div>
        </header>

        <div className="h-[72vh] min-h-[480px] overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/90 backdrop-blur">
          <div className="flex h-full">
            <div className="w-48 border-r border-slate-800/70 bg-slate-950/80 overflow-auto">
              <div className="p-3 border-b border-slate-800/70">
                <span className="text-xs uppercase tracking-wider text-slate-500">Files</span>
              </div>
              {fileList.map((file) => (
                <button
                  key={file}
                  onClick={() => setActiveFile(file)}
                  className={`w-full text-left px-3 py-2 text-sm transition ${
                    activeFile === file
                      ? "bg-sky-500/10 text-sky-300 border-l-2 border-sky-500"
                      : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-300"
                  }`}
                >
                  {file.split("/").pop()}
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col">
              <div className="border-b border-slate-800/70 px-4 py-2 bg-slate-950/70">
                <span className="text-xs text-slate-400">{activeFile}</span>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getLanguage(activeFile)}
                  value={currentFileContent}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {otherExamples.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-100">More templates to explore</h2>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-sky-300 transition hover:text-sky-200"
              >
                Back to landing
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {otherExamples.map((item) => (
                <Link
                  key={item.id}
                  to={`/demo/${item.id}`}
                  className="group flex flex-col gap-3 rounded-xl border border-slate-800/70 bg-slate-950/70 px-4 py-5 transition hover:border-sky-500/40 hover:bg-slate-900/70"
                >
                  <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{item.id}</span>
                  <span className="text-base font-semibold text-slate-100">{item.name}</span>
                  <span className="text-sm text-slate-400">{item.tagline}</span>
                  <span className="text-xs text-sky-300 group-hover:text-sky-200">View demo →</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default DemoWorkspace;
