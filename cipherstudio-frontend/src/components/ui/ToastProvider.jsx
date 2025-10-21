import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((payload) => {
    const id = crypto.randomUUID();
    const toast = {
      id,
      title: payload?.title || null,
      message: payload?.message || (typeof payload === 'string' ? payload : ''),
      variant: payload?.variant || 'info',
      ttl: payload?.ttl ?? 1800
    };
    setToasts((list) => [...list, toast]);
    if (toast.ttl > 0) {
      setTimeout(() => remove(id), toast.ttl);
    }
    return id;
  }, [remove]);

  const ctx = useMemo(() => ({ show, remove }), [show, remove]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const ToastViewport = ({ toasts, onDismiss }) => {
  const content = (
    <div className="pointer-events-none fixed bottom-16 right-5 z-[60] flex max-h-[50vh] w-[min(380px,95vw)] flex-col gap-2 overflow-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-xl backdrop-blur ${
            t.variant === 'success' ? 'border-emerald-700/60 bg-emerald-600/10 text-emerald-200' :
            t.variant === 'error' ? 'border-rose-700/60 bg-rose-700/10 text-rose-200' :
            t.variant === 'warn' ? 'border-amber-700/60 bg-amber-700/10 text-amber-200' :
            'border-slate-700/60 bg-slate-900/90 text-slate-200'
          }`}
        >
          {t.title && <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{t.title}</div>}
          <div className="text-sm">{t.message}</div>
          <div className="mt-1 flex justify-end">
            <button className="rounded border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60" onClick={() => onDismiss(t.id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
  if (typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(content, document.body);
  }
  return content;
};
