import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plus, FolderPlus, Save, Users, Keyboard, Maximize2, Minimize2 } from "lucide-react";
import { useProject } from "../context/ProjectContext.jsx";
import ProjectService from "../services/ProjectService.js";
import FileExplorer from "./FileExplorer.jsx";
import EditorPane from "./EditorPane.jsx";
import Preview from "./Preview.jsx";
import StatusBar from "./StatusBar.jsx";
import ActivityBar from "./ActivityBar.jsx";
import CommandPalette from "./CommandPalette.jsx";
import GlobalSearch from "./GlobalSearch.jsx";
import CollaboratorsModal from "./CollaboratorsModal.jsx";
import NameDialog from "./ui/NameDialog.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import SearchPanel from "./SearchPanel.jsx";
import SourceControlPanel from "./SourceControlPanel.jsx";
import ShortcutsDialog from "./ShortcutDialog.jsx";
import { IDESkeleton } from "./ui/Skeleton.jsx";

const IDE = () => {
  const {
    projectId,
    projectName,
    setProjectName,
    tree,
    createFile,
    createFolder,
    isRemoteHydrated,
    isSyncing,
    theme
  } = useProject();
  const [toast, setToast] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [nameDialog, setNameDialog] = useState({ open: false, mode: null, initial: "" });
  const [activeSide, setActiveSide] = useState("explorer");
  
  const [showPalette, setShowPalette] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(timeout);
  }, [toast]);

  // Fullscreen sync with browser events
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Unified IDE hotkeys
  useEffect(() => {
    const handler = (event) => {
      const key = event.key.toLowerCase();
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const meta = isMac ? event.metaKey : event.ctrlKey;
      const shift = event.shiftKey;
      const alt = event.altKey;
      const target = event.target;
      const tag = (target?.tagName || '').toLowerCase();
      const isFormField = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      const inMonaco = typeof target?.closest === 'function' ? !!target.closest('.monaco-editor') : false;

      // Command Palette
      if (meta && !shift && key === "p") {
        event.preventDefault();
        setShowPalette(true);
        return;
      }
      // Fullscreen Preview (Ctrl/Cmd+Shift+P)
      if (meta && shift && key === "p") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("ide:preview-fullscreen"));
        return;
      }
      // Toggle Fullscreen (Ctrl/Cmd+Shift+Enter)
      if (meta && shift && (key === "enter" || event.code === 'Enter')) {
        event.preventDefault();
        const root = document.querySelector('.ide-surface');
        if (!document.fullscreenElement) {
          root?.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.();
        }
        return;
      }

      // Global Search overlay
      if (meta && shift && key === "f") {
        event.preventDefault();
        setShowSearch(true);
        return;
      }

      // Save / Save As
      if (meta && !shift && key === "s") {
        event.preventDefault();
        // Trigger the same logic as Save button
        (async () => {
          try {
            if (!projectId) {
              setToast("Saved locally");
              return;
            }
            await ProjectService.updateProject(projectId, { name: projectName?.trim() || "Untitled", files: [] });
            setLastSavedAt(new Date());
            setToast("Project saved");
          } catch (e) {
            console.error(e);
            setToast("Save failed");
          }
        })();
        return;
      }
      if (meta && shift && key === "s") {
        event.preventDefault();
        setNameDialog({ open: true, mode: "save-as", initial: projectName });
        return;
      }

      // New file / folder
      if (meta && !shift && key === "n") {
        event.preventDefault();
        setNameDialog({ open: true, mode: "create-file", initial: "index.js" });
        return;
      }
      if (meta && shift && key === "n") {
        event.preventDefault();
        setNameDialog({ open: true, mode: "create-folder", initial: "components" });
        return;
      }

      // Side panel quick switches
      if (meta && !shift && key === "b") {
        event.preventDefault();
        setActiveSide("explorer");
        return;
      }
      if (meta && !shift && ["1","2","3","4"].includes(event.key)) {
        event.preventDefault();
        const map = { "1": "explorer", "2": "search", "3": "scm", "4": "settings" };
        setActiveSide(map[event.key]);
        return;
      }

      // Preview controls
      if (meta && !shift && key === "r") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("ide:preview-refresh"));
        return;
      }
      if (meta && !shift && key === "j") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("ide:console-toggle"));
        return;
      }
      if (!meta && !shift && alt && key === "a") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("ide:assets-toggle"));
        return;
      }

      // Shortcuts cheatsheet
      if (meta && (key === "/" || key === "?" || event.code === 'Slash')) {
        if (inMonaco || isFormField) return; // don't override editor/comment or typing
        event.preventDefault();
        setShowShortcuts(true);
        return;
      }
    };
    window.addEventListener("keydown", handler, { capture: true, passive: false });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [projectId, projectName]);

  

  const statusBadge = isRemoteHydrated && !isSyncing
    ? {
        icon: <CheckCircle2 size={14} className="text-emerald-400" />,
        label: "Changes synced",
        tone: "bg-emerald-500/10 text-emerald-300"
      }
    : {
        icon: <Loader2 size={14} className="animate-spin text-amber-300" />,
        label: isRemoteHydrated ? "Syncing..." : "Preparing workspace...",
        tone: "bg-amber-500/10 text-amber-200"
      };

  

  if (!isRemoteHydrated) {
    return <IDESkeleton theme={theme} fullscreen={isFullscreen} />;
  }

  return (
    <div className={`ide-surface relative flex ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${theme === "light" ? "theme-light" : ""}`}>
      <header className="flex items-center justify-between gap-6 border-b border-slate-800/60 bg-slate-950/80 px-6 py-3 backdrop-blur-sm whitespace-nowrap">
        {/* Left: Project name */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Project Name</span>
          <input
            className="w-full max-w-xl rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm font-medium text-slate-100 shadow-inner outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Name your project"
            aria-label="Project name"
          />
        </div>
        {/* Right: Toolbar (aligned to input height) */}
        <div className="flex flex-none items-center gap-3 text-xs text-slate-300">
          {/* Actions group (left side of toolbar) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700/80 px-3 text-xs text-slate-200 transition hover:border-amber-500/70 hover:bg-slate-900/60"
              onClick={() => setShowCollaborators(true)}
              title="Manage collaborators"
              aria-label="Manage collaborators"
            >
              <Users size={14} /> <span className="hidden sm:inline">Collaborators</span>
            </button>
            <div className="h-6 w-px bg-slate-700/60" />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-700/80 bg-amber-600/20 px-3 text-xs text-slate-100 transition hover:bg-amber-600/30"
              onClick={async () => {
                try {
                  if (!projectId) {
                    setToast("Saved locally");
                    return;
                  }
                  await ProjectService.updateProject(projectId, { name: projectName?.trim() || "Untitled", files: [] });
                  setLastSavedAt(new Date());
                  setToast("Project saved");
                } catch (e) {
                  console.error(e);
                  setToast("Save failed");
                }
              }}
              title="Save project"
              aria-label="Save project"
            >
              <Save size={14} /> <span className="hidden sm:inline">Save</span>
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700/80 px-3 text-xs text-slate-200 transition hover:border-amber-500/70 hover:bg-slate-900/60"
              onClick={() => setNameDialog({ open: true, mode: "save-as", initial: projectName })}
              title="Save as new project"
              aria-label="Save as new project"
            >
              <span className="hidden sm:inline">Save As</span>
            </button>
            <div className="h-6 w-px bg-slate-700/60" />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700/80 px-3 text-xs text-slate-200 transition hover:border-amber-500/70 hover:bg-slate-900/60"
              onClick={() => setNameDialog({ open: true, mode: "create-file", initial: "index.js" })}
              title="New file"
              aria-label="New file"
            >
              <Plus size={14} /> <span className="hidden sm:inline">File</span>
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700/80 px-3 text-xs text-slate-200 transition hover:border-amber-500/70 hover:bg-slate-900/60"
              onClick={() => setNameDialog({ open: true, mode: "create-folder", initial: "components" })}
              title="New folder"
              aria-label="New folder"
            >
              <FolderPlus size={14} /> <span className="hidden sm:inline">Folder</span>
            </button>
          </div>
          {/* Fullscreen toggle */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900/60 text-slate-200 transition hover:border-amber-500/70 hover:bg-slate-900/80"
            title="Toggle fullscreen (Ctrl/Cmd + Shift + Enter)"
            aria-label="Toggle fullscreen"
            onClick={() => {
              const root = document.querySelector('.ide-surface');
              if (!document.fullscreenElement) {
                root?.requestFullscreen?.().catch(() => {});
              } else {
                document.exitFullscreen?.();
              }
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Shortcuts helper icon */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900/60 text-slate-200 transition hover:border-amber-500/70 hover:bg-slate-900/80"
            title="Keyboard shortcuts (Ctrl/Cmd + /)"
            aria-label="Open keyboard shortcuts"
            onClick={() => setShowShortcuts(true)}
          >
            <Keyboard size={15} />
          </button>

          {/* Status indicator (extreme right, icon-only with tooltip) */}
          <div className="relative group ml-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/60 text-slate-200 transition hover:border-amber-500/70 hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              title={statusBadge.label}
              aria-label={statusBadge.label}
              aria-describedby="ide-status-tooltip"
            >
              {statusBadge.icon}
            </button>
            <div
              id="ide-status-tooltip"
              role="tooltip"
              className="pointer-events-none absolute right-0 top-[110%] z-40 w-max max-w-xs scale-95 rounded-md border border-slate-700/80 bg-slate-900/95 px-2 py-1 text-[11px] text-slate-200 opacity-0 shadow-xl transition
                         group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100"
            >
              {statusBadge.label}
              {lastSavedAt && (
                <span className="ml-2 text-slate-400">• {new Date(lastSavedAt).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex h-full overflow-hidden pb-12">
        <ActivityBar active={activeSide} onChange={setActiveSide} />
        {activeSide === "explorer" && <FileExplorer />}
        {activeSide === "search" && <SearchPanel />}
        {activeSide === "scm" && <SourceControlPanel />}
        {activeSide === "settings" && <SettingsPanel />}
        <EditorPane />
        <Preview />
      </div>
      
      <StatusBar syncing={!isRemoteHydrated || isSyncing} lastSavedAt={lastSavedAt} />
      <NameDialog
        open={nameDialog.open}
        title={nameDialog.mode === "save-as" ? "Save As" : nameDialog.mode === "create-file" ? "New File" : "New Folder"}
        label={nameDialog.mode === "save-as" ? "Project name" : "Name"}
        initial={nameDialog.initial}
        placeholder={nameDialog.mode === "create-file" ? "index.js" : nameDialog.mode === "create-folder" ? "components" : projectName}
        validate={(val) => {
          if (nameDialog.mode === "save-as") return null;
          if (/[\\/:*?"<>|]/.test(val)) return "Name contains invalid characters.";
          return null;
        }}
        onCancel={() => setNameDialog({ open: false, mode: null, initial: "" })}
        onSubmit={async (val) => {
          if (nameDialog.mode === "create-file") {
            createFile(null, val, "");
          } else if (nameDialog.mode === "create-folder") {
            createFolder(null, val);
          } else if (nameDialog.mode === "save-as") {
            try {
              const created = await ProjectService.createProject({ name: val });
              const newId = created?.project?._id || created?.project?.id;
              if (newId) {
                await ProjectService.updateProject(newId, { name: val, files: [] });
                setLastSavedAt(new Date());
                setToast("Saved as new project");
              }
            } catch (e) {
              console.error(e);
              setToast("Save As failed");
            }
          }
          setNameDialog({ open: false, mode: null, initial: "" });
        }}
      />
      {showPalette && (
        <CommandPalette onClose={() => setShowPalette(false)} />
      )}
      {showSearch && (
        <GlobalSearch onClose={() => setShowSearch(false)} />
      )}
      {showShortcuts && (
        <ShortcutsDialog onClose={() => setShowShortcuts(false)} />
      )}
      
      {toast && (
        <div className="pointer-events-none absolute bottom-6 right-6 flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 shadow-xl">
          <Save size={16} className="text-amber-400" />
          {toast}
        </div>
      )}
      {showCollaborators && (
        <CollaboratorsModal onClose={() => setShowCollaborators(false)} />
      )}
    </div>
  );
};

export default IDE;
