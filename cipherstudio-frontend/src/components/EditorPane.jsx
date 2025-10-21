import { useEffect, useRef, useState, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { useProject } from "../context/ProjectContext.jsx";
import { useToast } from "./ui/ToastProvider.jsx";
import CollabClient from "../collab/CollabClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const EditorPane = () => {
  const {
    projectId,
    activeFile,
    updateFileContent,
    theme,
    editorFontSize,
    isExampleMode,
    cloneExampleToProject
  } = useProject();
  const { user } = useAuth();
  const { show } = useToast();
  
  const editorRef = useRef(null);
  const valueRef = useRef("");
  const collabRef = useRef(null);
  const isRemoteApplyingRef = useRef(false);
  const monacoRef = useRef(null);
  const decorationsRef = useRef({}); // userId -> decorationIds
  const changeTimerRef = useRef(null);
  const searchDecoRef = useRef([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCase, setSearchCase] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const exampleWarnedRef = useRef(false);

  const searchRegex = useMemo(() => {
    if (!searchQuery) return null;
    try {
      const esc = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(esc, searchCase ? "g" : "gi");
    } catch { return null; }
  }, [searchQuery, searchCase]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Define an amber-accented theme for dark mode and apply it
    try {
      monaco.editor.defineTheme("cipher-amber-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.selectionBackground": "#f59e0b55",
          "editor.selectionHighlightBackground": "#f59e0b33",
          "editor.wordHighlightBackground": "#f59e0b22",
          "editor.findMatchBackground": "#f59e0b66",
          "editor.findMatchHighlightBackground": "#f59e0b33",
          "editorCursor.foreground": "#fbbf24",
          "editorBracketMatch.border": "#f59e0b88",
          "editor.lineHighlightBackground": "#ffffff08",
          "editorLineNumber.activeForeground": "#fbbf24"
        }
      });
      if ((theme || "dark") === "dark") {
        monaco.editor.setTheme("cipher-amber-dark");
      }
    } catch {}
    editor.focus();
    // Read-only example intercept: show helper toast when typing is attempted
    if (isExampleMode) {
      try {
        editor.updateOptions({ readOnly: true });
        editor.onKeyDown((e) => {
          if (!exampleWarnedRef.current) {
            exampleWarnedRef.current = true;
            show({ message: "This example is read-only. Clone to edit.", variant: "warn", ttl: 2200 });
          }
          e.preventDefault();
          e.stopPropagation();
        });
      } catch {}
    }
    // Initialize collaboration client when editor mounts
    try {
      // Disconnect any previous connection (e.g., when switching files)
      try { collabRef.current?.disconnect(); } catch {}
      const room = `project:${projectId || "local"}:file:${activeFile?.path || activeFile?.name || "root"}`;
      collabRef.current = new CollabClient({ room, user: { id: user?.id || user?._id || user?.email || "anon" } }).connect()
        .onContentApply(({ patch }) => {
          if (typeof patch === "string" && editor.getModel()) {
            isRemoteApplyingRef.current = true;
            const fullRange = editor.getModel().getFullModelRange();
            editor.executeEdits("remote", [{ range: fullRange, text: patch }]);
            // Update context so Preview and other panels react to remote changes
            try { updateFileContent(activeFile.id, patch); } catch {}
            isRemoteApplyingRef.current = false;
          }
        })
        .onCursorUpdate(({ userId, position }) => {
          // Render remote cursor as a decoration
          if (!monacoRef.current || !editor.getModel()) return;
          const monacoIns = monacoRef.current;
          const range = new monacoIns.Range(position.lineNumber || 1, position.column || 1, position.lineNumber || 1, position.column || 1);
          const opts = {
            range,
            options: {
              className: "remote-cursor",
              after: {
                content: "",
                inlineClassName: "remote-caret"
              }
            }
          };
          const prev = decorationsRef.current[userId] || [];
          const next = editor.deltaDecorations(prev, [opts]);
          decorationsRef.current[userId] = next;
        });

      // Broadcast cursor changes
      editor.onDidChangeCursorPosition((e) => {
        try {
          const pos = e.position;
          collabRef.current?.sendCursor({ lineNumber: pos.lineNumber, column: pos.column });
        } catch {}
      });

      // Broadcast content changes with light debounce, skip if remote applying
      editor.onDidChangeModelContent(() => {
        if (isRemoteApplyingRef.current) return;
        if (isExampleMode) {
          // Block edits in example mode at the model level as an extra safety
          try { editor.undo(); } catch {}
          if (!exampleWarnedRef.current) {
            exampleWarnedRef.current = true;
            show({ message: "This example is read-only. Use Clone to edit.", variant: "warn", ttl: 2200 });
          }
          return;
        }
        const value = editor.getValue();
        valueRef.current = value;
        if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
        changeTimerRef.current = setTimeout(() => {
          try { collabRef.current?.sendPatch(valueRef.current); } catch {}
          // Persist to context (triggers autosave) without duplicate loops
          updateFileContent(activeFile.id, valueRef.current);
        }, 150);
      });
    } catch {}
  };

  // Disconnect socket on component unmount to avoid ghost listeners
  useEffect(() => {
    return () => {
      try { collabRef.current?.disconnect(); } catch {}
      collabRef.current = null;
    };
  }, []);

  // Keep Monaco theme in sync with app theme
  useEffect(() => {
    const monaco = monacoRef.current;
    try {
      if (monaco) {
        if (theme === "dark") {
          monaco.editor?.setTheme?.("cipher-amber-dark");
        } else {
          monaco.editor?.setTheme?.("vs");
        }
      }
    } catch {}
  }, [theme]);

  const handleChange = () => { /* handled via onDidChangeModelContent to distinguish remote vs local */ };

  // Listen for reveal events from SearchPanel
  useEffect(() => {
    const onReveal = (e) => {
      try {
        const { path, line, column, length } = e.detail || {};
        if (!editorRef.current || !editorRef.current.getModel()) return;
        // Move cursor and reveal range
        const ed = editorRef.current;
        const monaco = monacoRef.current;
        if (!monaco) return;
        const pos = { lineNumber: line || 1, column: column || 1 };
        ed.setPosition(pos);
        ed.revealPositionInCenter(pos);
        // Temporary highlight range
        const range = new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, (pos.column || 1) + (length || 1));
        const deco = ed.deltaDecorations([], [{ range, options: { inlineClassName: "editor-search-hit" } }]);
        setTimeout(() => { try { ed.deltaDecorations(deco, []); } catch {} }, 800);
      } catch {}
    };
    window.addEventListener("cipherstudio:reveal", onReveal);
    return () => window.removeEventListener("cipherstudio:reveal", onReveal);
  }, []);

  // Open/close search with Ctrl+F
  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === "f") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => {
          try { document.getElementById("editor-search-input")?.focus(); } catch {}
        }, 10);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Apply search highlights when query changes
  useEffect(() => {
    if (!editorRef.current || !editorRef.current.getModel()) return;
    const ed = editorRef.current;
    try { ed.deltaDecorations(searchDecoRef.current, []); } catch {}
    if (!searchRegex) return;
    const model = ed.getModel();
    const full = model.getValue();
    const matches = [...full.matchAll(new RegExp(searchRegex.source, searchRegex.flags.replace("g", "") + "g"))];
    const ranges = matches.map((m) => {
      const idx = m.index || 0;
      const start = model.getPositionAt(idx);
      const end = model.getPositionAt(idx + (m[0]?.length || 1));
      return { range: new (monacoRef.current || window.monaco).Range(start.lineNumber, start.column, end.lineNumber, end.column) };
    });
    searchDecoRef.current = ed.deltaDecorations([], ranges.map(r => ({ range: r.range, options: { inlineClassName: "editor-search-hit" } })));
    setSearchIndex(0);
  }, [searchRegex, activeFile?.id]);

  const gotoMatch = (dir) => {
    if (!editorRef.current || !editorRef.current.getModel() || !searchRegex) return;
    const ed = editorRef.current;
    const model = ed.getModel();
    const full = model.getValue();
    const matches = [...full.matchAll(new RegExp(searchRegex.source, searchRegex.flags.replace("g", "") + "g"))];
    if (matches.length === 0) return;
    let next = searchIndex + (dir === "next" ? 1 : -1);
    if (next < 0) next = matches.length - 1;
    if (next >= matches.length) next = 0;
    const m = matches[next];
    const idx = m.index || 0;
    const start = model.getPositionAt(idx);
    const end = model.getPositionAt(idx + (m[0]?.length || 1));
    ed.setSelection({ startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column });
    ed.revealRangeInCenter({ startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column });
    setSearchIndex(next);
  };

  const getLanguage = (filename) => {
    if (!filename) return "javascript";
    const ext = filename.split(".").pop()?.toLowerCase();
    const langMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      css: "css",
      html: "html",
      md: "markdown"
    };
    return langMap[ext] || "javascript";
  };

  if (!activeFile) {
    return (
      <section className="flex flex-1 items-center justify-center border-r border-slate-800/60 bg-slate-950/60">
        <div className="rounded-lg border border-dashed border-slate-700/70 px-6 py-8 text-center text-sm text-slate-400">
          Select or create a file to start editing.
        </div>
      </section>
    );
  }

  // Render non-code previews (images, pdf)
  const ext = activeFile.name.split('.').pop()?.toLowerCase();
  const isImage = ["png","jpg","jpeg","gif","webp","svg"].includes(ext);
  const isPdf = ext === "pdf";

  if (isImage || isPdf) {
    return (
      <section className="flex h-full flex-1 flex-col border-r border-slate-800/60 bg-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-2.5 text-xs">
          <span className="truncate text-slate-300 font-medium">{activeFile.path}</span>
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {isImage ? "IMAGE" : "PDF"}
          </span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {isImage ? (
            <div className="flex h-full w-full items-start justify-center">
              <img
                src={activeFile.content}
                alt={activeFile.name}
                className="max-h-full rounded-lg border border-slate-800/60 bg-slate-900/60"
              />
            </div>
          ) : (
            <iframe
              title={activeFile.name}
              className="h-full w-full rounded-lg border border-slate-800/60 bg-white"
              src={activeFile.content}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-1 flex-col border-r border-slate-800/60 bg-slate-950/60">
      <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-2.5 text-xs">
        <span className="truncate text-slate-300 font-medium">{activeFile.path}</span>
        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          {getLanguage(activeFile.name)}
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {isExampleMode && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-amber-600/60 bg-amber-600/15 px-3 py-1 text-[11px] font-medium text-amber-200 shadow">
            Read-only example • <button className="underline hover:text-amber-100" onClick={async () => {
              try { await cloneExampleToProject(); show({ message: 'Cloned to your workspace. You can now edit.', variant: 'success', ttl: 2000 }); } catch { show({ message: 'Clone failed', variant: 'error', ttl: 2200 }); }
            }}>Clone to edit</button>
          </div>
        )}
        {searchOpen && (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-200 shadow-lg">
            <input
              id="editor-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find... (Esc to close)"
              className="w-44 bg-transparent outline-none placeholder-slate-500"
            />
            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={searchCase} onChange={(e)=>setSearchCase(e.target.checked)} />Aa</label>
            <div className="ml-1 flex items-center gap-1">
              <button className="rounded px-2 py-1 hover:bg-slate-800/70" onClick={() => gotoMatch("prev")}>Prev</button>
              <button className="rounded px-2 py-1 hover:bg-slate-800/70" onClick={() => gotoMatch("next")}>Next</button>
            </div>
          </div>
        )}
        <Editor
          key={activeFile.id}
          height="100%"
          language={getLanguage(activeFile.name)}
          value={activeFile.content || ""}
          theme={theme === "dark" ? "vs-dark" : "light"}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            fontSize: editorFontSize,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            lineNumbers: "on",
            renderWhitespace: "selection",
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            fontLigatures: true,
            cursorBlinking: "smooth",
            smoothScrolling: true,
            contextmenu: true,
            formatOnPaste: true,
            formatOnType: true
          }}
        />
      </div>
    </section>
  );
};

export default EditorPane;
