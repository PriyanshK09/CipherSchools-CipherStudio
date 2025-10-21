import { useEffect, useMemo, useState } from "react";
import { useProject } from "../context/ProjectContext.jsx";

const flattenFiles = (nodes, acc = []) => {
  nodes.forEach((node) => {
    if (node.type === "file") acc.push(node);
    if (node.type === "folder" && node.children) flattenFiles(node.children, acc);
  });
  return acc;
};

const GlobalSearch = ({ onClose }) => {
  const { tree, setActiveFileId } = useProject();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const files = useMemo(() => flattenFiles(tree), [tree]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const file of files) {
      const content = (file.content || "").toLowerCase();
      const name = (file.name || "").toLowerCase();
      if (content.includes(q) || name.includes(q)) {
        out.push({ file, preview: file.content.slice(0, 140).replace(/\n/g, " ") });
      }
    }
    return out.slice(0, 100);
  }, [query, files]);

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-slate-950/70 backdrop-blur-sm p-8">
      <div className="w-[min(880px,100%)] overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/95 shadow-2xl">
        <div className="border-b border-slate-800/70 p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files and content… (Ctrl+Shift+F to open)"
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>
        <div className="max-h-[60vh] overflow-auto divide-y divide-slate-800/70">
          {results.map(({ file, preview }) => (
            <button
              key={file.id}
              onClick={() => { setActiveFileId(file.id); onClose?.(); }}
              className="block w-full px-4 py-3 text-left hover:bg-slate-900/70"
            >
              <div className="text-amber-300 text-sm">{file.path}</div>
              <div className="text-slate-300 text-sm line-clamp-2">{preview}</div>
            </button>
          ))}
          {query && results.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-500">No results</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
