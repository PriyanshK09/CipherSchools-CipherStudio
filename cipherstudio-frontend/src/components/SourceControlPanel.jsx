import { GitBranch, RefreshCw, UploadCloud } from "lucide-react";

const SourceControlPanel = () => {
  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800/60 bg-slate-950/80">
      <div className="border-b border-slate-800/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">Source Control</div>
      <div className="flex-1 space-y-3 p-4 text-sm text-slate-300">
        <div className="rounded-lg border border-dashed border-slate-700/70 p-3 text-slate-400">
          No repository initialized.
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs hover:border-amber-500/70 hover:bg-slate-900/60">
            <GitBranch size={14} className="inline-block mr-1" /> Init Repo
          </button>
          <button className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs hover:border-amber-500/70 hover:bg-slate-900/60">
            <RefreshCw size={14} className="inline-block mr-1" /> Refresh
          </button>
        </div>
        <div className="text-xs text-slate-500">Git integration is a placeholder for now. We can wire this to a backend or local FS API later.</div>
      </div>
    </aside>
  );
};

export default SourceControlPanel;
