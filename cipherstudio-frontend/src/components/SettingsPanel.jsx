import { Minus, Plus, Sun, Moon, HardDrive } from "lucide-react";
import { useProject } from "../context/ProjectContext.jsx";

const SettingsPanel = () => {
  const { theme, toggleTheme, editorFontSize, increaseFont, decreaseFont, workspaceId } = useProject();
  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800/60 bg-slate-950/80">
      <div className="border-b border-slate-800/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">Settings</div>
      <div className="flex-1 space-y-4 p-4 text-sm text-slate-300">
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Theme</div>
          <button onClick={toggleTheme} className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 px-3 py-1.5 hover:border-amber-500/70 hover:bg-slate-900/60">
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} {theme}
          </button>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Editor font size</div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 px-2 py-1.5">
            <button onClick={decreaseFont} className="rounded px-2 py-1 hover:bg-slate-800/70"><Minus size={12} /></button>
            <span className="text-slate-200">{editorFontSize}px</span>
            <button onClick={increaseFont} className="rounded px-2 py-1 hover:bg-slate-800/70"><Plus size={12} /></button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-400">Workspace</div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 px-3 py-1.5 text-slate-300">
            <HardDrive size={14} /> {workspaceId || "default"}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SettingsPanel;
