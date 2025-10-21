import { Wifi, HardDrive, GitBranch, Sun, Moon, Minus, Plus } from "lucide-react";
import { useProject } from "../context/ProjectContext.jsx";

const StatusBar = ({ syncing, lastSavedAt }) => {
  const { theme, toggleTheme, increaseFont, decreaseFont, editorFontSize, workspaceId } = useProject();
  return (
    <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-slate-800/60 bg-slate-950/90 px-4 py-1.5 text-[11px] text-slate-400 backdrop-blur">
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1">
          <GitBranch size={12} /> main
        </span>
        <span className="inline-flex items-center gap-1">
          <HardDrive size={12} /> Workspace: {workspaceId || "default"}
        </span>
        {lastSavedAt && (
          <span className="inline-flex items-center gap-1">Last saved: {new Date(lastSavedAt).toLocaleTimeString()}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 ${syncing ? "text-amber-300" : "text-emerald-300"}`}>
          <Wifi size={12} /> {syncing ? "Syncing" : "Synced"}
        </span>
        <button onClick={toggleTheme} className="ml-4 inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-800/70">
          {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />} {theme}
        </button>
        <div className="ml-2 inline-flex items-center gap-1">
          <button onClick={decreaseFont} className="rounded px-2 py-1 hover:bg-slate-800/70"><Minus size={12} /></button>
          <span className="text-slate-300">{editorFontSize}px</span>
          <button onClick={increaseFont} className="rounded px-2 py-1 hover:bg-slate-800/70"><Plus size={12} /></button>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
