import { X, Trash2, Check } from "lucide-react";
import Modal from "./Modal.jsx";

const ConfirmDialog = ({ open, title = "Confirm", message, confirmText = "Confirm", destructive = false, onCancel, onConfirm }) => {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="text-sm text-slate-200 leading-relaxed">{message}</div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800/60 whitespace-nowrap" onClick={onCancel}>
          <X size={14} />
        </button>
        <button
          data-modal-primary="true"
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap ${destructive ? "border border-rose-700/80 bg-rose-700/20 text-rose-100 hover:bg-rose-700/30" : "border border-amber-700/80 bg-amber-600/20 text-slate-100 hover:bg-amber-600/30"}`}
          onClick={onConfirm}
        >
          {destructive ? <Trash2 size={14} /> : <Check size={14} />} {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
