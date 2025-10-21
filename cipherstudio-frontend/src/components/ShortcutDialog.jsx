import { useEffect, useMemo, useState } from "react";

const Key = ({ children }) => (
  <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/80 px-1.5 py-0.5 text-[11px] text-slate-200 shadow-inner">
    {children}
  </kbd>
);

const Combo = ({ keys }) => (
  <span className="flex flex-wrap items-center gap-1">
    {keys.map((k, i) => (
      <span key={i} className="inline-flex items-center gap-1">
        {Array.isArray(k) ? (
          <span className="inline-flex items-center gap-1">
            {k.map((alt, j) => (
              <Key key={j}>{alt}</Key>
            ))}
          </span>
        ) : (
          <Key>{k}</Key>
        )}
        {i < keys.length - 1 && <span className="text-slate-500">+</span>}
      </span>
    ))}
  </span>
);

const Row = ({ combo, desc }) => (
  <div className="flex items-center justify-between rounded-md border border-slate-800/60 bg-slate-950/60 px-3 py-2 text-sm">
    <span className="text-slate-200">{desc}</span>
    <Combo keys={combo} />
  </div>
);

const ShortcutDialog = ({ onClose }) => {
  const [q, setQ] = useState("");
  const list = useMemo(() => ([
    { desc: "Command Palette", combo: [["Ctrl", "Cmd"], "P"] },
    { desc: "Global Search", combo: [["Ctrl", "Cmd"], "Shift", "F"] },
    { desc: "Save", combo: [["Ctrl", "Cmd"], "S"] },
    { desc: "Save As", combo: [["Ctrl", "Cmd"], "Shift", "S"] },
    { desc: "New File", combo: [["Ctrl", "Cmd"], "N"] },
    { desc: "New Folder", combo: [["Ctrl", "Cmd"], "Shift", "N"] },
    { desc: "Explorer Panel", combo: [["Ctrl", "Cmd"], "1"] },
    { desc: "Explorer Panel (alt)", combo: [["Ctrl", "Cmd"], "B"] },
    { desc: "Search Panel", combo: [["Ctrl", "Cmd"], "2"] },
    { desc: "Source Control Panel", combo: [["Ctrl", "Cmd"], "3"] },
    { desc: "Settings Panel", combo: [["Ctrl", "Cmd"], "4"] },
    { desc: "Refresh Preview", combo: [["Ctrl", "Cmd"], "R"] },
    { desc: "Open Fullscreen Preview", combo: [["Ctrl", "Cmd"], "Shift", "P"] },
    { desc: "Toggle Console", combo: [["Ctrl", "Cmd"], "J"] },
    { desc: "Toggle Assets", combo: ["Alt", "A"] },
    { desc: "Toggle Fullscreen", combo: [["Ctrl", "Cmd"], "Shift", "Enter"] },
    { desc: "Show Shortcuts", combo: [["Ctrl", "Cmd"], "/"] },
  ]), []);

  const filtered = list.filter((i) => i.desc.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="kbd-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[min(900px,100%)] max-h-[85vh] overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/95 text-slate-200 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-800/70 bg-slate-950/95 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 id="kbd-title" className="text-lg font-semibold">Keyboard Shortcuts</h2>
            <button className="rounded border border-slate-700/60 px-2 py-1 text-xs hover:border-amber-500/70 hover:bg-slate-900/60" onClick={onClose}>Close</button>
          </div>
          <div className="mt-3">
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter shortcuts..."
              className="w-full rounded-md border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-500/70"
              aria-label="Filter shortcuts"
            />
          </div>
        </div>
        <div className="max-h-[calc(85vh-110px)] overflow-auto p-5 pt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((i) => (
              <Row key={i.desc} desc={i.desc} combo={i.combo} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="mt-6 rounded-md border border-slate-800/60 bg-slate-950/60 px-3 py-6 text-center text-sm text-slate-400">No shortcuts match your search.</div>
          )}
          <p className="mt-4 text-xs text-slate-400">Tips: Use Ctrl or Cmd depending on your OS. Press Esc to close.</p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutDialog;
