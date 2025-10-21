import { useEffect, useMemo, useState } from "react";
import { useProject } from "../context/ProjectContext.jsx";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

const flattenFiles = (nodes, acc = []) => {
  nodes.forEach((node) => {
    if (node.type === "file") acc.push(node);
    if (node.type === "folder" && node.children) flattenFiles(node.children, acc);
  });
  return acc;
};

const highlight = (text, idx, len) => {
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + len);
  const after = text.slice(idx + len);
  return (
    <>
      {before}
      <mark className="rounded bg-amber-500/30 text-amber-100">{match}</mark>
      {after}
    </>
  );
};

const SearchPanel = () => {
  const { tree, activeFile, setActiveFileId } = useProject();
  const [query, setQuery] = useState("");
  const [flags, setFlags] = useState({ case: false, word: false, regex: false });
  const [scope, setScope] = useState("workspace"); // workspace | file (content mode only)
  const [mode, setMode] = useState("content"); // content | filename
  const [expanded, setExpanded] = useState(() => new Set());

  const files = useMemo(() => flattenFiles(tree), [tree]);

  const matcher = useMemo(() => {
    const q = query;
    if (!q) return null;
    try {
      const source = flags.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = flags.word ? `(^|[^A-Za-z0-9_])(${source})(?=$|[^A-Za-z0-9_])` : `(${source})`;
      return new RegExp(pattern, flags.case ? "g" : "gi");
    } catch {
      return null;
    }
  }, [query, flags]);

  const targetFiles = scope === "file" && activeFile ? [activeFile] : files;

  const contentResults = useMemo(() => {
    if (!matcher) return [];
    const out = [];
    for (const f of targetFiles) {
      const content = String(f.content || "");
      const lines = content.split(/\n/);
      const fileMatches = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        matcher.lastIndex = 0;
        const m = [...line.matchAll(matcher)];
        if (m.length) {
          m.forEach((mm) => {
            const index = mm.index ?? 0;
            const len = mm[2]?.length || mm[1]?.length || (mm[0]?.length ?? query.length);
            const left = Math.max(0, index - 24);
            const right = Math.min(line.length, index + len + 48);
            const preview = line.slice(left, right);
            const previewOffset = index - left;
            fileMatches.push({
              line: i + 1,
              index,
              len,
              preview,
              previewOffset
            });
          });
        }
      }
      if (fileMatches.length) {
        out.push({ file: f, matches: fileMatches });
      }
    }
    return out;
  }, [matcher, targetFiles, query]);

  // Fuzzy filename search
  const fuzzyMatch = useMemo(() => {
    return (q, text) => {
      if (!q) return null;
      const ql = q.toLowerCase();
      const tl = text.toLowerCase();
      let j = 0;
      let last = -2;
      let consecutive = 0;
      let score = 0;
      const idxs = [];
      for (let i = 0; i < ql.length; i++) {
        const ch = ql[i];
        const pos = tl.indexOf(ch, j);
        if (pos === -1) return null;
        idxs.push(pos);
        // base score
        score += 1;
        // consecutive bonus
        if (pos === last + 1) {
          consecutive += 1;
          score += 1 + Math.min(consecutive, 3); // mild ramp
        } else {
          consecutive = 0;
        }
        // word/segment start bonus
        const prev = tl[pos - 1];
        if (pos === 0 || prev === "/" || prev === "-" || prev === "_" || prev === " ") score += 3;
        // case match bonus
        if (text[pos] === q[i]) score += 0.5;
        j = pos + 1;
        last = pos;
      }
      // compactness bonus
      const span = idxs[idxs.length - 1] - idxs[0] + 1;
      const compact = q.length / span;
      score += compact * 4;
      return { score, idxs };
    };
  }, []);

  const filenameResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const out = [];
    for (const f of files) {
      const m = fuzzyMatch(q, f.path);
      if (m) out.push({ file: f, score: m.score, idxs: m.idxs });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 200);
  }, [files, query, fuzzyMatch]);

  useEffect(() => {
    // Expand groups by default when searching (content mode)
    if (mode === "content") {
      if (contentResults.length) {
        setExpanded(new Set(contentResults.map((r) => r.file.id)));
      } else {
        setExpanded(new Set());
      }
    }
  }, [mode, contentResults.length]);

  const reveal = (file, line, column, len) => {
    setActiveFileId(file.id);
    // allow editor to mount/switch before revealing
    setTimeout(() => {
      try {
        window.dispatchEvent(
          new CustomEvent("cipherstudio:reveal", {
            detail: { path: file.path, line, column, length: len }
          })
        );
      } catch {}
    }, 30);
  };

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800/60 bg-slate-950/80">
      <div className="border-b border-slate-800/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">Search</div>
      <div className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/90 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/60 px-2.5 py-2">
          <Search size={14} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent outline-none placeholder-slate-500"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-700/80 shrink-0">
            <button className={`px-2 py-1 whitespace-nowrap ${mode === "content" ? "bg-slate-800/50 text-slate-200" : "text-slate-400"}`} onClick={() => setMode("content")}>
              Content
            </button>
            <button className={`px-2 py-1 whitespace-nowrap ${mode === "filename" ? "bg-slate-800/50 text-slate-200" : "text-slate-400"}`} onClick={() => setMode("filename")}>
              Name
            </button>
          </div>
          {mode === "content" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 whitespace-nowrap hover:bg-slate-800/60"><input type="checkbox" checked={flags.case} onChange={(e) => setFlags((f) => ({ ...f, case: e.target.checked }))} />Aa</label>
              <label className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 whitespace-nowrap hover:bg-slate-800/60"><input type="checkbox" checked={flags.word} onChange={(e) => setFlags((f) => ({ ...f, word: e.target.checked }))} />Word</label>
              <label className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 whitespace-nowrap hover:bg-slate-800/60"><input type="checkbox" checked={flags.regex} onChange={(e) => setFlags((f) => ({ ...f, regex: e.target.checked }))} />.*</label>
            </div>
          )}
        </div>
        {mode === "content" && (
          <div className="mt-2 inline-flex overflow-hidden rounded-md border border-slate-700/80 text-[11px] text-slate-400 shrink-0">
            <button className={`px-2 py-1 ${scope === "workspace" ? "bg-slate-800/50 text-slate-200" : "text-slate-400"}`} onClick={() => setScope("workspace")}>Workspace</button>
            <button className={`px-2 py-1 ${scope === "file" ? "bg-slate-800/50 text-slate-200" : "text-slate-400"}`} onClick={() => setScope("file")}>File</button>
          </div>
        )}
        <div className="mt-2 text-[11px] text-slate-400">
          {!query && "Enter a query to search"}
          {query && mode === "content" && `${contentResults.reduce((n,r)=>n+r.matches.length,0)} results in ${contentResults.length} file(s)`}
          {query && mode === "filename" && `${filenameResults.length} file(s) match`}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 pb-3 pt-2">
        {mode === "content" && contentResults.map(({ file, matches }) => {
          const isOpen = expanded.has(file.id);
          return (
            <div key={file.id} className="mb-2 rounded-lg border border-slate-800/60 bg-slate-950/60">
              <button
                className="flex w-full min-w-0 items-center justify-between px-3 py-2 text-left text-slate-300 hover:bg-slate-900/60"
                onClick={() => setExpanded((s) => { const next = new Set(s); next.has(file.id) ? next.delete(file.id) : next.add(file.id); return next; })}
                title={`Open ${file.path}`}
              >
                <span className="truncate text-xs max-w-[75%]">/{file.path}</span>
                <span className="ml-2 inline-flex shrink-0 items-center gap-1 text-[10px] text-slate-400">{isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}{matches.length}</span>
              </button>
              {isOpen && (
                <div className="divide-y divide-slate-800/60">
                  {matches.map((m, i) => (
                    <button
                      key={`${file.id}-${i}-${m.line}-${m.index}`}
                      className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-900/60"
                      onClick={() => reveal(file, m.line, m.index + 1, m.len)}
                    >
                      <div className="text-slate-500">Line {m.line}</div>
                      <div className="truncate leading-snug">{highlight(m.preview, m.previewOffset, m.len)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {mode === "filename" && filenameResults.map(({ file, idxs, score }) => (
          <button
            key={file.id}
            className="mb-1 w-full rounded-lg border border-slate-800/60 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-900/60"
            onClick={() => reveal(file, 1, 1, 1)}
            title={`Open ${file.path}`}
          >
            <div className="truncate">
              {(() => {
                const text = `/${file.path}`;
                const marks = new Set(idxs.map(i => i + 1)); // account for leading '/'
                const parts = [];
                for (let i = 0; i < text.length; i++) {
                  if (marks.has(i)) {
                    parts.push(<mark key={i} className="rounded bg-amber-500/30 text-amber-100">{text[i]}</mark>);
                  } else {
                    parts.push(<span key={i}>{text[i]}</span>);
                  }
                }
                return parts;
              })()}
            </div>
          </button>
        ))}
        {!query && (
          <div className="px-3 pb-4 text-center text-xs text-slate-500">Start typing to search. Toggle between Workspace and File scope.</div>
        )}
        {query && mode === "content" && contentResults.length === 0 && (
          <div className="px-3 pb-4 text-center text-xs text-slate-500">No results found.</div>
        )}
        {query && mode === "filename" && filenameResults.length === 0 && (
          <div className="px-3 pb-4 text-center text-xs text-slate-500">No files match.</div>
        )}
      </div>
    </aside>
  );
};

export default SearchPanel;
