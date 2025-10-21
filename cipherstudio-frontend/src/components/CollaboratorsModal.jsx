import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useProject } from "../context/ProjectContext.jsx";
import ProjectService from "../services/ProjectService.js";

const CollaboratorsModal = ({ onClose }) => {
  const { projectId } = useProject();
  const [list, setList] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await ProjectService.fetchCollaborators(projectId);
      setList(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Failed to load collaborators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [projectId]);

  const invite = async () => {
    if (!email.trim()) return;
    try {
      setLoading(true);
      await ProjectService.addCollaborator(projectId, { email: email.trim() });
      setEmail("");
      await refresh();
    } catch (e) {
      setError(e?.message || "Invite failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (userId) => {
    try {
      setLoading(true);
      await ProjectService.removeCollaborator(projectId, userId);
      await refresh();
    } catch (e) {
      setError(e?.message || "Remove failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800/70 bg-slate-950/90 p-4 text-slate-100">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Collaborators</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="mb-3 flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Invite by email"
            className="flex-1 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          <button
            onClick={invite}
            disabled={loading}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            Invite
          </button>
        </div>
        {error && <div className="mb-2 text-sm text-red-400">{error}</div>}
        <div className="max-h-64 overflow-auto rounded-lg border border-slate-800/60">
          {loading ? (
            <div className="p-3 text-sm text-slate-400">Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-3 text-sm text-slate-400">No collaborators yet.</div>
          ) : (
            <ul className="divide-y divide-slate-800/60">
              {list.map((u) => (
                <li key={u._id || u.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm">{u.name || u.email}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <button
                    onClick={() => remove(u._id || u.id)}
                    className="rounded-lg border border-slate-700/80 px-2 py-1 text-xs text-slate-300 transition hover:border-amber-500/70 hover:bg-slate-900/60"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 text-xs text-slate-500">Real-time collaboration (live cursors, presence) coming soon.</div>
      </div>
    </div>
  );
};

export default CollaboratorsModal;
