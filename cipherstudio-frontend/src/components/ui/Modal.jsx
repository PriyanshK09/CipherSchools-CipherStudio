import { useEffect } from "react";
import ReactDOM from "react-dom";

const Modal = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        const primary = document.querySelector('[data-modal-primary="true"]');
        if (primary) primary.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm sm:backdrop-blur" onClick={onClose} />
      <div className="relative w-[480px] max-w-[92vw] rounded-xl border border-slate-700/80 bg-slate-950/95 p-5 shadow-2xl">
        {title && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {title}
          </div>
        )}
        <div>{children}</div>
        {footer && <div className="mt-4 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
  if (typeof document !== "undefined" && document.body) {
    return ReactDOM.createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default Modal;
