import { useEffect, useMemo, useState } from "react";
import { useProject } from "../context/ProjectContext.jsx";
import { Sparkles, Plus, FolderPlus, Sun, Moon, Text, Maximize2 } from "lucide-react";
import NameDialog from "./ui/NameDialog.jsx";

const CommandPalette = ({ onClose }) => {
  const {
    createFile,
    createFolder,
    importExampleProject,
    toggleTheme,
    increaseFont,
    decreaseFont
  } = useProject();
  const [query, setQuery] = useState("");
  const [nameDialog, setNameDialog] = useState({ open: false, mode: null, initial: "" });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commands = useMemo(() => [
    { id: "new-file", label: "New File", icon: <Plus size={14} />, run: () => {
      setNameDialog({ open: true, mode: "file", initial: "index.js" });
    } },
    { id: "new-folder", label: "New Folder", icon: <FolderPlus size={14} />, run: () => {
      setNameDialog({ open: true, mode: "folder", initial: "components" });
    } },
    { id: "toggle-theme", label: "Toggle Theme", icon: <Sun size={14} />, run: () => { toggleTheme(); onClose?.(); } },
    { id: "font-increase", label: "Increase Font Size", icon: <Text size={14} />, run: () => { increaseFont(); onClose?.(); } },
    { id: "font-decrease", label: "Decrease Font Size", icon: <Text size={14} />, run: () => { decreaseFont(); onClose?.(); } },
    { id: "preview-fullscreen", label: "Open Fullscreen Preview (Ctrl/Cmd+Shift+P)", icon: <Maximize2 size={14} />, run: () => {
      window.dispatchEvent(new CustomEvent("ide:preview-fullscreen"));
      onClose?.();
    } },
    { id: "browse-templates", label: "Browse Templates", icon: <Sparkles size={14} />, run: () => {
      // let IDE header button handle; here we can dispatch a custom event
      document.dispatchEvent(new CustomEvent("cipherstudio:open-examples"));
      onClose?.();
    } },
  ], [createFile, createFolder, toggleTheme, increaseFont, decreaseFont, onClose]);

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/70 p-4 sm:p-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cmdp-title">
      <div className="w-[min(860px,100%)] overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/95 shadow-2xl">
        <div className="sticky top-0 border-b border-slate-800/70 bg-slate-950/95 p-3">
          <h2 id="cmdp-title" className="sr-only">Command Palette</h2>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="w-full rounded-md border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/60"
          />
        </div>
        <div className="max-h-[70vh] overflow-auto py-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={cmd.run}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-slate-200 hover:bg-slate-900/70"
              >
                <span className="text-slate-400">{cmd.icon}</span>
                {cmd.label}
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-500">No commands</div>
          )}
        </div>
      </div>
      <NameDialog
        open={nameDialog.open}
        title={nameDialog.mode === "file" ? "New File" : "New Folder"}
        label="Name"
        initial={nameDialog.initial}
        onCancel={() => setNameDialog({ open: false, mode: null, initial: "" })}
        onSubmit={(val) => {
          if (nameDialog.mode === "file") createFile(null, val, "");
          else if (nameDialog.mode === "folder") createFolder(null, val);
          setNameDialog({ open: false, mode: null, initial: "" });
          onClose?.();
        }}
      />
    </div>
  );
};

export default CommandPalette;
