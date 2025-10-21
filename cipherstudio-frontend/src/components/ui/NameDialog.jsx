import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import Modal from "./Modal.jsx";

const NameDialog = ({ open, title, label = "Name", initial = "", validate, onCancel, onSubmit, placeholder }) => {
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initial ?? "");
      setError("");
    }
  }, [open, initial]);

  const runSubmit = () => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }
    const issue = validate ? validate(trimmed) : null;
    if (issue) {
      setError(issue);
      return;
    }
    onSubmit?.(trimmed);
  };

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-slate-400">{label}</label>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        {error && <div className="mt-1 text-xs text-rose-400">{error}</div>}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800/60 whitespace-nowrap" onClick={onCancel}>
            <X size={14} />
          </button>
          <button data-modal-primary="true" className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-700/80 bg-amber-600/20 px-3 py-1.5 text-xs text-slate-100 hover:bg-amber-600/30 whitespace-nowrap" onClick={runSubmit}>
            <Check size={14} />
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default NameDialog;
