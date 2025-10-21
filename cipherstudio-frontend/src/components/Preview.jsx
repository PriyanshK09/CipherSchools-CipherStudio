import { useEffect, useRef, useState } from "react";
import { Monitor, RotateCw, Terminal, AlertCircle, ImageIcon, FileText, ExternalLink, Maximize2, X } from "lucide-react";
import { useProject } from "../context/ProjectContext.jsx";
import { useToast } from "./ui/ToastProvider.jsx";

const Preview = () => {
  const { tree } = useProject();
  const [showConsole, setShowConsole] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ log: true, warn: true, error: true });
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayUrl, setOverlayUrl] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAssets, setShowAssets] = useState(false);

  const generateHTML = () => {
    const files = {};
    const traverse = (nodes) => {
      nodes.forEach((node) => {
        if (node.type === "file") {
          files[node.path] = node.content || "";
        } else if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(tree);

    // Get file paths
    const jsFiles = Object.keys(files).filter(f => f.endsWith(".js") || f.endsWith(".jsx"));
    const cssFiles = Object.keys(files).filter(f => f.endsWith(".css"));
    
    // Gather App / main code
    let appCode = files["src/App.jsx"] || files["App.jsx"] || "";
    // Fallback to any main.jsx
    const mainJs = files["src/main.jsx"] || files["main.jsx"] || "";
    
    // Get CSS content
    const cssContent = cssFiles.map(f => files[f] || '').join('\n');
    
    // Pre-encode sources to safely inject into template (base64 to avoid quote collisions)
    const toBase64 = (s) => {
      try {
        return btoa(unescape(encodeURIComponent(s || "")));
      } catch (e) {
        return "";
      }
    };
    const appEncoded = toBase64(appCode || "");
    const mainEncoded = toBase64(mainJs || "");

    // Build complete HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>${cssContent}</style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script>
    // Suppress Babel standalone dev banner inside iframe
    (function(){
      var __origInfo = console.info; var __origWarn = console.warn;
      console.info = function(){
        try { if (String(arguments[0]||'').indexOf('in-browser Babel transformer') !== -1) return; } catch {}
        return __origInfo.apply(console, arguments);
      };
      console.warn = function(){
        try { if (String(arguments[0]||'').indexOf('in-browser Babel transformer') !== -1) return; } catch {}
        return __origWarn.apply(console, arguments);
      };
    })();
  </script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  
  <script>
    // Console capture
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    window.addEventListener('error', (e) => {
      window.parent.postMessage({ 
        type: 'console-error', 
        message: e.message, 
        stack: e.error?.stack 
      }, '*');
    });
    
    console.log = (...args) => {
      originalLog(...args);
      window.parent.postMessage({ 
        type: 'console-log', 
        args: args.map(a => String(a)) 
      }, '*');
    };
    
    console.error = (...args) => {
      originalError(...args);
      window.parent.postMessage({ 
        type: 'console-error', 
        args: args.map(a => String(a)) 
      }, '*');
    };
    
    console.warn = (...args) => {
      originalWarn(...args);
      window.parent.postMessage({ 
        type: 'console-warn', 
        args: args.map(a => String(a)) 
      }, '*');
    };
  </script>

  <script type="text/babel" data-type="module" data-presets="env,react">
    try {
      const decodeB64 = (b64) => {
        try { return decodeURIComponent(escape(atob(b64))); } catch { return ""; }
      };
      const appSrc = decodeB64('${appEncoded}');
      const mainSrc = decodeB64('${mainEncoded}');
      // Remove CSS imports (not supported here) before transpiling
      const stripCssImports = (src) => src ? src.replace(/^\s*import\s+['\"][^'\"]+\.css['\"];?\s*$/gm, '') : '';
      const transpileCJS = (src) => Babel.transform(src, { presets: [['env', { modules: 'commonjs' }], ['react', { runtime: 'classic' }]] }).code;

      const appCode = transpileCJS(stripCssImports(appSrc));
      const mainCode = transpileCJS(stripCssImports(mainSrc));

      // Minimal require shim mapping to globals
      const requireMap = {
        react: (function(r){ return { ...r, default: r }; })(window.React || {}),
        'react-dom': (function(d){ return { ...d, default: d }; })(window.ReactDOM || {}),
        'react-dom/client': (function(d){ return { ...d, default: d }; })(window.ReactDOM || {}),
        // Provide a basic jsx-runtime shim in case any code relies on automatic runtime
        'react/jsx-runtime': (function(R){
          const jsx = (type, props, key) => R.createElement(type, { ...(props || {}), key });
          const jsxs = jsx;
          const Fragment = R.Fragment;
          return { jsx, jsxs, Fragment, default: { jsx, jsxs, Fragment } };
        })(window.React || {}),
        'react/jsx-dev-runtime': (function(R){
          const jsxDEV = (type, props, key) => R.createElement(type, { ...(props || {}), key });
          const Fragment = R.Fragment;
          return { jsxDEV, Fragment, default: { jsxDEV, Fragment } };
        })(window.React || {})
      };
      function __require(name) {
        // Normalize specifier for simple resolution (avoid regex escaping pitfalls)
        const spec = String(name || '').split('\\\\').join('/');
        if (
          spec === './App' || spec === './App.jsx' ||
          spec === 'src/App.jsx' || spec === '/src/App.jsx' ||
          spec.endsWith('/App.jsx') || spec.endsWith('/App')
        ) {
          return appExports || {};
        }
        return requireMap[spec] || requireMap[name] || {};
      }

      function runCJS(code) {
        const exports = {};
        const module = { exports };
        (function(require, module, exports){
          eval(code);
        })(__require, module, exports);
        return module.exports || exports;
      }

      const appExports = runCJS(appCode);
      let App = appExports && (appExports.default || appExports.App || appExports);

      try { runCJS(mainCode); } catch (e) { console.warn('main execution error', e); }

      const rootElement = document.getElementById('root');
      if (rootElement) {
        const userMounted = (mainSrc && (mainSrc.indexOf('ReactDOM.createRoot(') !== -1 || mainSrc.indexOf('ReactDOM.render(') !== -1));
        if (!userMounted && typeof App !== 'undefined') {
          const isValidComponent = (C) => typeof C === 'function';
          if (!isValidComponent(App)) {
            console.error('App export is not a React component. Export a function component as default or named App.');
          } else {
            const root = ReactDOM.createRoot(rootElement);
            root.render(React.createElement(App));
          }
        }
      }
    } catch (err) {
      console.error(err);
      window.parent.postMessage({ type: 'console-error', args: [String(err?.message || err)] }, '*');
    }
  </script>
</body>
</html>`;

    return html;
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type) {
        const { type, args, message, stack } = event.data;
        const timestamp = new Date().toLocaleTimeString();
        
        if (type === "console-log") {
          setLogs(prev => [...prev, { type: "log", content: args.join(" "), timestamp }]);
        } else if (type === "console-error") {
          const errorMsg = args ? args.join(" ") : message;
          setLogs(prev => [...prev, { type: "error", content: errorMsg, timestamp, stack }]);
          setError(errorMsg);
        } else if (type === "console-warn") {
          setLogs(prev => [...prev, { type: "warn", content: args.join(" "), timestamp }]);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!iframeRef.current || tree.length === 0) return;
    
    try {
      const html = generateHTML();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      
      iframeRef.current.src = url;
      setError(null);

      return () => URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
      console.error("Preview generation error:", err);
    }
  }, [tree, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setError(null);
    setLogs([]);
  };

  const openInNewTab = () => {
    try {
      const html = generateHTML();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      // Do not revoke here; the new tab owns the URL's lifecycle
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("Failed to open preview in new tab", e);
      setError("Failed to open preview in new tab");
    }
  };

  const openFullscreenOverlay = () => {
    try {
      const html = generateHTML();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setOverlayUrl(url);
      setOverlayOpen(true);
    } catch (e) {
      console.error("Failed to open fullscreen preview", e);
      setError("Failed to open fullscreen preview");
    }
  };

  const closeOverlay = () => {
    setOverlayOpen(false);
    if (overlayUrl) {
      try { URL.revokeObjectURL(overlayUrl); } catch {}
    }
    setOverlayUrl(null);
  };

  // Close overlay on Escape
  useEffect(() => {
    if (!overlayOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeOverlay(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlayOpen]);

  // Respond to IDE global hotkeys dispatched as CustomEvents
  useEffect(() => {
    const onRefresh = () => handleRefresh();
    const onConsoleToggle = () => setShowConsole(v => !v);
    const onAssetsToggle = () => setShowAssets(v => !v);
    const onFullscreen = () => openFullscreenOverlay();
    window.addEventListener("ide:preview-refresh", onRefresh);
    window.addEventListener("ide:console-toggle", onConsoleToggle);
    window.addEventListener("ide:assets-toggle", onAssetsToggle);
    window.addEventListener("ide:preview-fullscreen", onFullscreen);
    return () => {
      window.removeEventListener("ide:preview-refresh", onRefresh);
      window.removeEventListener("ide:console-toggle", onConsoleToggle);
      window.removeEventListener("ide:assets-toggle", onAssetsToggle);
      window.removeEventListener("ide:preview-fullscreen", onFullscreen);
    };
  }, []);

  return (
    <section className="flex min-w-[320px] w-[38%] flex-col border-l border-slate-800/60 bg-slate-950/60">
      <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-2.5 text-xs whitespace-nowrap">
        <span className="flex items-center gap-2 text-slate-300 font-medium whitespace-nowrap">
          <Monitor size={14} /> Live Preview
        </span>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition ${showAssets ? "border-amber-500/60 bg-amber-500/10 text-amber-300" : "border-slate-700/60 text-slate-400 hover:border-amber-500/40 hover:text-slate-200"}`}
            onClick={() => setShowAssets(!showAssets)}
            title="Assets"
          >
            <ImageIcon size={13} /> Assets
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 px-3 py-1.5 text-slate-300 transition hover:border-amber-500/60 hover:bg-slate-900/60"
            onClick={openInNewTab}
            title="Open in new tab"
          >
            <ExternalLink size={14} /> New tab
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 px-3 py-1.5 text-slate-300 transition hover:border-amber-500/60 hover:bg-slate-900/60"
            onClick={openFullscreenOverlay}
            title="Fullscreen preview (Ctrl/Cmd + Shift + P)"
          >
            <Maximize2 size={14} /> Fullscreen
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded-lg border border-slate-700/60 p-2 text-slate-300 transition hover:border-amber-500/60 hover:bg-slate-900/60"
            onClick={handleRefresh}
            title="Refresh (Ctrl/Cmd + R)"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative bg-white">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          title="preview"
        />
        {showAssets && (
          <AssetsDrawer tree={tree} onClose={() => setShowAssets(false)} />
        )}
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Runtime Error</div>
              <div className="text-red-300/90 text-xs mt-1">{error}</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-slate-800/60 bg-slate-950/95">
        <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs whitespace-nowrap">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-2.5 py-1 text-slate-300">
            <Terminal size={12} /> Console
          </span>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="inline-flex items-center gap-1">
              <button
                className={`rounded-md border px-2 py-1 text-[11px] transition ${filter.log ? "border-amber-600/50 bg-amber-600/20 text-amber-300" : "border-slate-700/70 text-slate-400 hover:border-amber-500/40"}`}
                onClick={() => setFilter((f) => ({ ...f, log: !f.log }))}
                title="Toggle log"
              >
                log
              </button>
              <button
                className={`rounded-md border px-2 py-1 text-[11px] transition ${filter.warn ? "border-amber-600/50 bg-amber-600/20 text-amber-300" : "border-slate-700/70 text-slate-400 hover:border-amber-500/40"}`}
                onClick={() => setFilter((f) => ({ ...f, warn: !f.warn }))}
                title="Toggle warn"
              >
                warn
              </button>
              <button
                className={`rounded-md border px-2 py-1 text-[11px] transition ${filter.error ? "border-rose-600/50 bg-rose-600/20 text-rose-300" : "border-slate-700/70 text-slate-400 hover:border-rose-500/40"}`}
                onClick={() => setFilter((f) => ({ ...f, error: !f.error }))}
                title="Toggle error"
              >
                error
              </button>
            </div>
            <button
              type="button"
              className="rounded-md border border-slate-700/60 px-2 py-1 text-[11px] text-slate-300 transition hover:border-amber-500/60 hover:bg-slate-900/60"
              onClick={() => setLogs([])}
              title="Clear console"
            >
              Clear
            </button>
            <button
              type="button"
              className={`rounded-md border px-2 py-1 text-[11px] transition ${showConsole ? "border-emerald-600/50 bg-emerald-600/20 text-emerald-300" : "border-slate-700/70 text-slate-400 hover:border-emerald-500/40"}`}
              onClick={() => setShowConsole((v) => !v)}
              title="Toggle console"
            >
              {showConsole ? "On" : "Off"}
            </button>
          </div>
        </div>
        <div className={`${showConsole ? "h-48" : "h-0"} overflow-hidden transition-[height] duration-200`}>
          <div className="h-48 overflow-auto px-3 py-2 text-xs font-mono">
            {logs.length === 0 && (
              <div className="text-slate-500 italic">Console output will appear here...</div>
            )}
            {logs.filter((l) => filter[l.type]).map((log, idx) => (
              <div
                key={idx}
                className={`py-1 border-b border-slate-800/30 ${
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "warn"
                    ? "text-yellow-400"
                    : "text-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="mr-2 text-[10px] text-slate-500">{log.timestamp}</span>
                    <button className="mr-2 text-[10px] underline" onClick={() => setExpanded((e) => ({ ...e, [idx]: !e[idx] }))}>
                      {expanded[idx] ? "collapse" : "expand"}
                    </button>
                    {log.content}
                    {expanded[idx] && log.stack && (
                      <pre className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400">{log.stack}</pre>
                    )}
                  </div>
                  <button
                    className="ml-2 shrink-0 rounded border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60"
                    onClick={() => navigator.clipboard?.writeText(`${log.timestamp} ${log.content}${log.stack ? "\n" + log.stack : ""}`)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overlayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-[96vw] max-w-[1400px] h-[88vh] rounded-xl border border-slate-800/70 bg-slate-950 shadow-2xl">
            <div className="absolute right-3 top-3 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 hover:border-amber-500/70 hover:bg-slate-900/80"
                onClick={() => { openInNewTab(); }}
                title="Open in new tab"
              >
                <ExternalLink size={13} /> New tab
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/70 text-slate-200 hover:border-amber-500/70 hover:bg-slate-900/80"
                onClick={closeOverlay}
                title="Close (Esc)"
              >
                <X size={14} />
              </button>
            </div>
            <iframe
              className="h-full w-full rounded-xl"
              src={overlayUrl || undefined}
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              title="fullscreen-preview"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default Preview;

const AssetsDrawer = ({ tree, onClose }) => {
  const { show } = useToast();
  const list = [];
  const walk = (nodes) => {
    nodes.forEach((n) => {
      if (n.type === 'file') list.push(n);
      if (n.children) walk(n.children);
    });
  };
  walk(tree);
  const isImage = (name) => /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  const isFont = (name) => /\.(ttf|otf|woff2?)$/i.test(name);
  const assets = list.filter((f) => isImage(f.name) || isFont(f.name));
  const copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); show({ message: `${label} copied`, variant: 'success', ttl: 1200 }); } catch { show({ message: 'Copy failed', variant: 'error', ttl: 1400 }); }
  };
  const assetUrl = (f) => {
    // For now, the content is inline; generate a pseudo path usable inside this IDE environment
    // Consumers can paste data URLs directly.
    return f.content || "";
  };
  return (
    <div className="absolute right-3 top-3 z-20 w-64 rounded-xl border border-slate-800/70 bg-slate-950/95 p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
        <span>Assets</span>
        <button className="rounded px-2 py-0.5 text-slate-400 hover:bg-slate-800/60 hover:text-slate-100" onClick={onClose}>Close</button>
      </div>
      <div className="max-h-72 overflow-auto space-y-1">
        {assets.length === 0 ? (
          <div className="p-2 text-sm text-slate-400">No image or font assets.</div>
        ) : (
          assets.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-900/60">
              {isImage(f.name) ? (
                <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded ring-1 ring-slate-700/70">
                  {f.content?.startsWith('data:') ? <img src={f.content} alt="thumb" className="h-6 w-6 object-cover" /> : <ImageIcon size={16} className="text-slate-400" />}
                </span>
              ) : (
                <FileText size={16} className="text-slate-400" />
              )}
              <div className="flex-1 truncate text-sm text-slate-200" title={`/${f.path}`}>{f.name}</div>
              <div className="flex items-center gap-1">
                <a
                  className="rounded border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60"
                  href={f.content}
                  download={f.name}
                  onClick={(e) => e.stopPropagation()}
                >
                  Open
                </a>
                <button
                  className="rounded border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60"
                  title="Copy <img>"
                  onClick={(e) => { e.stopPropagation(); copy(`<img src=\"${assetUrl(f)}\" alt=\"${f.name}\">`, '<img>'); }}
                >
                  img
                </button>
                <button
                  className="rounded border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60"
                  title="Copy CSS url()"
                  onClick={(e) => { e.stopPropagation(); copy(`url('${assetUrl(f)}')`, 'url()'); }}
                >
                  url
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
