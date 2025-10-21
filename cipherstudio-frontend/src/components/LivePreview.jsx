import { useEffect, useRef, useState } from "react";
import { SandpackPreview, SandpackConsole, useSandpack } from "@codesandbox/sandpack-react";
import { Monitor, RotateCw, Terminal } from "lucide-react";

const LivePreview = () => {
  const [showConsole, setShowConsole] = useState(true);
  const { sandpack } = useSandpack();
  const [isCompiling, setIsCompiling] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!sandpack || typeof sandpack.listen !== "function") return undefined;
    const unsub = sandpack.listen((message) => {
      if (message.type === "sandpack/bundle-start") {
        setIsCompiling(true);
      }
      if (message.type === "sandpack/bundle-ready" || message.type === "done") {
        // small delay for smoother UX
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setIsCompiling(false), 150);
      }
    });
    return () => {
      clearTimeout(timerRef.current);
      if (typeof unsub === "function") unsub();
    };
  }, [sandpack]);

  return (
    <section className="flex min-w-[320px] w-[38%] flex-col border-l border-slate-800/60 bg-slate-950/60 backdrop-blur-sm resize-x overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3 text-xs uppercase tracking-[0.2em] text-slate-400">
        <span className="flex items-center gap-2 text-slate-300">
          <Monitor size={14} /> Live Preview
        </span>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-slate-700/60 px-3 py-1.5 text-slate-300 transition hover:border-amber-500/60 hover:bg-slate-900/60"
            onClick={() => sandpack.runSandpack()}
          >
            <RotateCw size={14} /> Refresh
          </button>
          <button
            type="button"
            className={`flex items-center gap-1 rounded-lg border border-slate-700/60 px-3 py-1.5 transition ${
              showConsole
                ? "bg-slate-900/70 text-slate-200"
                : "text-slate-400 hover:border-amber-500/60 hover:text-slate-200"
            }`}
            onClick={() => setShowConsole((current) => !current)}
          >
            <Terminal size={14} /> Console
          </button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          className="h-full bg-slate-900"
        />
        {isCompiling && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/40">
            <div className="animate-pulse rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
              Compiling…
            </div>
          </div>
        )}
      </div>
      {showConsole && (
        <div className="h-48 border-t border-slate-800/60 bg-slate-950/80">
          <SandpackConsole className="h-full !bg-transparent" />
        </div>
      )}
    </section>
  );
};

export default LivePreview;
