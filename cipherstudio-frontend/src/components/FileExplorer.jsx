import { useEffect, useRef, useState, useMemo } from "react";
import { Folder, FileCode, MoreVertical, ChevronRight, ChevronDown, MoveUp, MoveDown, CornerUpLeft, ArrowRight, Check, X, Copy, FilePlus, FolderPlus, Upload, Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import { useProject } from "../context/ProjectContext.jsx";
import NameDialog from "./ui/NameDialog.jsx";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import Modal from "./ui/Modal.jsx";
import { useToast } from "./ui/ToastProvider.jsx";

const FileExplorer = () => {
  const { show } = useToast();
  const {
    workspaceId,
    projectId,
    tree,
    activeFileId,
    setActiveFileId,
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    moveNodeToFolder,
    moveNodeUp,
    moveNodeDown,
    moveNodeToParent,
    ensureFolderPath,
    undo,
    redo
  } = useProject();

  const expandedStorageKey = useMemo(
    () => `cipherstudio.expanded.${workspaceId || "default"}.${projectId || "local"}`,
    [workspaceId, projectId]
  );

  const [expanded, setExpanded] = useState(() => new Set());
  const [menuTarget, setMenuTarget] = useState(null);
  const containerRef = useRef(null);
  const hasInitializedExpansion = useRef(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [invalidDrop, setInvalidDrop] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showPickerFor, setShowPickerFor] = useState(null); // nodeId for which to open folder picker
  const [nameDialog, setNameDialog] = useState({ open: false, mode: null, parentId: null, nodeId: null, initial: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, nodeId: null, name: "" });
  const [showUpload, setShowUpload] = useState(false);

  const findNodeInTree = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === "folder" && node.children) {
        const match = findNodeInTree(node.children, id);
        if (match) return match;
      }
    }
    return null;
  };

  const findParentInTree = (nodes, id, parent = null) => {
    for (const node of nodes) {
      if (node.id === id) return parent;
      if (node.type === "folder" && node.children) {
        const match = findParentInTree(node.children, id, node);
        if (match) return match;
      }
    }
    return null;
  };

  useEffect(() => {
    const handleClickAway = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setMenuTarget(null);
      }
    };
    window.addEventListener("mousedown", handleClickAway);
    return () => window.removeEventListener("mousedown", handleClickAway);
  }, []);

  useEffect(() => {
    // Rehydrate expanded state for this workspace/project
    hasInitializedExpansion.current = false;
    try {
      const raw = window.localStorage.getItem(expandedStorageKey);
      if (raw) {
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) setExpanded(new Set(ids));
        else setExpanded(new Set());
      } else {
        setExpanded(new Set());
      }
    } catch {
      setExpanded(new Set());
    }
  }, [expandedStorageKey]);

  useEffect(() => {
    // Prune expanded ids that no longer exist and persist updates
    const ids = new Set(expanded);
    const existing = new Set();
    const collect = (nodes) => {
      nodes.forEach((n) => {
        if (n.type === "folder") {
          existing.add(n.id);
          if (n.children) collect(n.children);
        }
      });
    };
    collect(tree);
    let changed = false;
    Array.from(ids).forEach((id) => {
      if (!existing.has(id)) {
        ids.delete(id);
        changed = true;
      }
    });
    if (changed) setExpanded(ids);
    // Persist
    try {
      window.localStorage.setItem(expandedStorageKey, JSON.stringify(Array.from(ids)));
    } catch {}
    hasInitializedExpansion.current = true;
  }, [tree, expanded, expandedStorageKey]);

  const toggleExpanded = (id) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(expandedStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const openCreateDialog = (parentId, type) => {
    setNameDialog({ open: true, mode: type === "file" ? "create-file" : "create-folder", parentId, nodeId: null, initial: "" });
  };

  const openRenameDialog = (nodeId, currentName) => {
    setNameDialog({ open: true, mode: "rename", parentId: null, nodeId, initial: currentName || "" });
  };

  const openDeleteDialog = (nodeId, name) => {
    setConfirmDialog({ open: true, nodeId, name });
  };

  const duplicateNode = (nodeId) => {
    const target = findNodeInTree(tree, nodeId);
    if (!target) return;
    const parentNode = findParentInTree(tree, nodeId);
    const siblings = parentNode ? parentNode.children ?? [] : tree;
    const base = target.name.replace(/( copy)( \d+)?$/i, "");
    let candidate = `${base} copy` + (target.type === "file" && target.name.includes(".") ? "" : "");
    const extMatch = target.type === "file" ? target.name.match(/\.([^.]+)$/) : null;
    const ext = extMatch ? `.${extMatch[1]}` : "";
    const exists = (n) => siblings.some((s) => s.name.toLowerCase() === n.toLowerCase());
    let i = 2;
    let name = target.type === "file" ? `${base} copy${ext}` : `${base} copy`;
    while (exists(name)) {
      name = target.type === "file" ? `${base} copy ${i}${ext}` : `${base} copy ${i}`;
      i += 1;
      if (i > 200) break;
    }
    if (target.type === "file") {
      createFile(parentNode?.id ?? null, name, target.content || "");
    } else {
      // simple duplicate as empty folder for now
      createFolder(parentNode?.id ?? null, name);
    }
  };

  const setActive = (node) => {
    if (node.type === "file") {
      setActiveFileId(node.id);
    } else {
      toggleExpanded(node.id);
    }
  };

  const onDragStart = (event, node) => {
    event.stopPropagation();
    setDraggingId(node.id);
    event.dataTransfer.setData("text/plain", node.id);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event, node) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverId(node.id);
  };

  const onDrop = (event, targetNode) => {
    event.preventDefault();
    event.stopPropagation();
    const dragged = draggingId || event.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverId(null);
    setInvalidDrop(false);
    if (!dragged || dragged === targetNode.id) return;
    // If dropping on a folder, move into it; if on a file, move into its parent folder
    const destId = targetNode.type === "folder" ? targetNode.id : findParentInTree(tree, targetNode.id)?.id ?? null;
    if (destId === dragged) return;
    // Multi-select: if dragged is in selection, move all selected; else move single dragged
    const itemsToMove = selectedIds.has(dragged) ? Array.from(selectedIds) : [dragged];
    itemsToMove.forEach((id) => moveNodeToFolder(id, destId, null));
    if (destId) {
      // ensure destination is expanded
      setExpanded((s) => new Set(s).add(destId));
    }
  };

  const onDragEnter = (e, node) => {
    e.preventDefault();
    setDragOverId(node.id);
  };
  const onDragLeave = (e, node) => {
    e.preventDefault();
    setDragOverId((id) => (id === node.id ? null : id));
    setInvalidDrop(false);
  };

  const isValidDropTarget = (sourceId, targetNode) => {
    if (!sourceId) return true;
    // cannot drop onto itself
    if (sourceId === targetNode.id) return false;
    // cannot drop into a descendant of source
    if (targetNode.type === "folder") {
      // simple detection: if target path starts with source path
      const findNode = (nodes, id) => {
        for (const n of nodes) {
          if (n.id === id) return n;
          if (n.children) {
            const m = findNode(n.children, id);
            if (m) return m;
          }
        }
        return null;
      };
      const src = findNode(tree, sourceId);
      if (src && src.type === "folder" && targetNode.path.startsWith(src.path)) return false;
    }
    return true;
  };

  const renderNodes = (nodes, depth = 0) => {
    return nodes.map((node) => {
      const isFolder = node.type === "folder";
      const isExpanded = isFolder ? expanded.has(node.id) : false;
      const isActive = node.id === activeFileId;
      const isSelected = selectedIds.has(node.id);
      const isDragOver = dragOverId === node.id;
      const ext = !isFolder && node.name.includes('.') ? node.name.split('.').pop().toLowerCase() : '';
      const isImage = ["png","jpg","jpeg","gif","webp","svg"].includes(ext);
      const isPdf = ext === "pdf";
      const isFont = ["ttf","otf","woff","woff2"].includes(ext);
      return (
        <div key={node.id} style={{ paddingLeft: depth * 14 }}
             draggable
             onDragStart={(e) => onDragStart(e, node)}
             onDragOver={(e) => onDragOver(e, node)}
             onDragEnter={(e) => onDragEnter(e, node)}
             onDragLeave={(e) => onDragLeave(e, node)}
             onDrop={(e) => onDrop(e, node)}>
          <div
            className={`group flex items-center justify-between rounded-lg px-2 py-2 text-sm transition ${
              isActive
                ? "border border-amber-500/40 bg-amber-500/10 text-amber-100 shadow-inner"
                : `border ${isSelected ? "border-amber-700/70 bg-amber-900/20" : "border-transparent"} text-slate-300 hover:border-slate-700 hover:bg-slate-900/60`}
              ${isDragOver ? (isValidDropTarget(draggingId, node) ? "ring-1 ring-emerald-500/50" : "ring-1 ring-red-500/50 cursor-not-allowed") : ""}
            }`}
            onClick={() => setActive(node)}
            onMouseDown={(e) => {
              if (e.ctrlKey || e.metaKey) {
                // toggle selection
                setSelectedIds((s) => {
                  const next = new Set(s);
                  if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
                  return next;
                });
                e.stopPropagation();
              } else if (e.shiftKey) {
                // range select within current sibling list
                e.preventDefault();
                const siblings = nodes;
                const ids = siblings.map((n) => n.id);
                const last = Array.from(selectedIds).slice(-1)[0] ?? node.id;
                const a = ids.indexOf(last);
                const b = ids.indexOf(node.id);
                if (a !== -1 && b !== -1) {
                  const [start, end] = a < b ? [a, b] : [b, a];
                  const range = ids.slice(start, end + 1);
                  setSelectedIds(new Set(range));
                } else {
                  setSelectedIds(new Set([node.id]));
                }
              } else {
                // single select
                setSelectedIds(new Set([node.id]));
              }
            }}
          >
            <div className="flex items-center gap-2">
              {isFolder ? (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded px-1 py-[2px] text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-200"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpanded(node.id);
                  }}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={14} />
                </button>
              ) : isImage ? (
                <ImageIcon size={14} className="text-slate-400" />
              ) : isPdf ? (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-rose-600/20 text-rose-300 text-[9px] font-bold">PDF</span>
              ) : isFont ? (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-600/20 text-emerald-300 text-[9px] font-bold">F</span>
              ) : (
                <FileCode size={14} />
              )}
              <span className={`truncate ${isActive ? "text-amber-100" : "text-slate-200"}`}>{node.name}</span>
            </div>
            <div className="relative">
              <button
                type="button"
                className="rounded p-1 text-slate-400 transition hover:bg-slate-800/90 hover:text-slate-100"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuTarget((current) => (current === node.id ? null : node.id));
                }}
              >
                <MoreVertical size={14} />
              </button>
              {menuTarget === node.id && (
                <div className="absolute -right-1 z-40 mt-1 w-56 origin-top-right rounded-xl border border-slate-800/70 bg-slate-950/95 p-2 shadow-2xl transform">
                  {isFolder && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-900/60"
                      onClick={() => {
                        openCreateDialog(node.id, "file");
                        setMenuTarget(null);
                        setExpanded((s) => new Set(s).add(node.id));
                      }}
                    >
                      <FilePlus size={14} /> New File
                    </button>
                  )}
                  {isFolder && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-900/60"
                      onClick={() => {
                        openCreateDialog(node.id, "folder");
                        setMenuTarget(null);
                        setExpanded((s) => new Set(s).add(node.id));
                      }}
                    >
                      <FolderPlus size={14} /> New Folder
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-900/60"
                    onClick={() => {
                      openRenameDialog(node.id, node.name);
                      setMenuTarget(null);
                    }}
                  >
                    <Pencil size={14} /> Rename
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-900/60"
                    onClick={() => {
                      const ids = selectedIds.size > 0 && selectedIds.has(node.id) ? Array.from(selectedIds) : [node.id];
                      ids.forEach((id) => duplicateNode(id));
                      show({ message: ids.length > 1 ? `Duplicated ${ids.length} items` : `Duplicated ${node.name}`, variant: 'success', ttl: 1400 });
                      setMenuTarget(null);
                    }}
                  >
                    <Copy size={14} /> Duplicate
                  </button>
                  <div className="my-1 border-t border-slate-700/60" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-900/60"
                    onClick={() => {
                      const ids = selectedIds.size > 0 && selectedIds.has(node.id) ? Array.from(selectedIds) : [node.id];
                      ids.forEach((id) => moveNodeUp(id));
                      setMenuTarget(null);
                    }}
                  >
                    <MoveUp size={14} /> Move Up
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-900/60"
                    onClick={() => {
                      const ids = selectedIds.size > 0 && selectedIds.has(node.id) ? Array.from(selectedIds) : [node.id];
                      ids.forEach((id) => moveNodeDown(id));
                      setMenuTarget(null);
                    }}
                  >
                    <MoveDown size={14} /> Move Down
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-900/60"
                    onClick={() => {
                      const ids = selectedIds.size > 0 && selectedIds.has(node.id) ? Array.from(selectedIds) : [node.id];
                      ids.forEach((id) => moveNodeToParent(id));
                      setMenuTarget(null);
                    }}
                  >
                    <CornerUpLeft size={14} /> Move To Parent
                  </button>
                  {isFolder && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-900/60"
                      onClick={() => {
                        setShowPickerFor(node.id);
                      }}
                    >
                      <ArrowRight size={14} /> Move Into...
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-400 transition hover:bg-red-900/40"
                    onClick={() => {
                      openDeleteDialog(node.id, node.name);
                      setMenuTarget(null);
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          {isFolder && node.children && isExpanded && (
            <div className="space-y-1">{renderNodes(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  const FolderPicker = ({ onClose, originNodeId }) => {
    const [query, setQuery] = useState("");
    const [choiceId, setChoiceId] = useState(null);
    const folders = useMemo(() => {
      const list = [];
      const walk = (nodes) => {
        nodes.forEach((n) => {
          if (n.type === "folder") {
            list.push(n);
            if (n.children) walk(n.children);
          }
        });
      };
      walk(tree);
      return list.filter((f) => f.id !== originNodeId);
    }, [tree, originNodeId]);
    const filtered = folders.filter((f) => f.path.toLowerCase().includes(query.toLowerCase()));
    return (
      <Modal open={true} onClose={onClose} title="Move Into Folder">
        <div>
          <input
            autoFocus
            className="mb-2 w-full rounded-lg border border-slate-700/80 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            placeholder="Search folder path..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-56 overflow-auto rounded-lg border border-slate-800/60">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">No folders match.</div>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.id}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-slate-200 hover:bg-slate-800/60 ${choiceId === f.id ? "bg-amber-900/20" : ""}`}
                  onClick={() => setChoiceId(f.id)}
                >
                  <span className="truncate text-sm">/{f.path}</span>
                  {choiceId === f.id && <Check size={14} className="text-amber-400" />}
                </button>
              ))
            )}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800/60" onClick={onClose}>
              <X size={14} />
            </button>
            <button
              disabled={!choiceId}
              className="rounded-lg border border-amber-700/80 bg-amber-600/20 px-3 py-1.5 text-xs text-slate-100 enabled:hover:bg-amber-600/30 disabled:opacity-40"
              onClick={() => {
                const ids = selectedIds.size > 0 && selectedIds.has(originNodeId) ? Array.from(selectedIds) : [originNodeId];
                ids.forEach((id) => moveNodeToFolder(id, choiceId, null));
                setExpanded((s) => new Set(s).add(choiceId));
                onClose();
              }}
            >
              Move
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  const UploadDialog = ({ onClose }) => {
    const [query, setQuery] = useState("");
    const [destId, setDestId] = useState(null);
    const [files, setFiles] = useState([]); // File[]
    const [isDragging, setIsDragging] = useState(false);

    const folders = useMemo(() => {
      const list = [{ id: null, path: "", name: "(root)", type: "folder" }];
      const walk = (nodes) => {
        nodes.forEach((n) => {
          if (n.type === "folder") {
            list.push(n);
            if (n.children) walk(n.children);
          }
        });
      };
      walk(tree);
      return list;
    }, [tree]);

    const filteredFolders = folders.filter((f) => (f.path || "").toLowerCase().includes(query.toLowerCase()) || (f.name || "").toLowerCase().includes(query.toLowerCase()));

    const onPick = (evt) => {
      const picked = Array.from(evt.target.files || []);
      if (picked.length) setFiles((cur) => [...cur, ...picked]);
    };

    const onDropFiles = (evt) => {
      evt.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(evt.dataTransfer?.files || []);
      if (dropped.length) setFiles((cur) => [...cur, ...dropped]);
    };

    const onDragOver = (evt) => {
      evt.preventDefault();
      setIsDragging(true);
    };
    const onDragLeave = () => setIsDragging(false);

    const isTextLike = (file) => {
      const name = (file?.name || "").toLowerCase();
      const type = file?.type || "";
      if (type.startsWith("text/")) return true;
      const textTypes = [
        "application/json",
        "application/javascript",
        "application/typescript",
        "application/xml",
        "image/svg+xml"
      ];
      if (textTypes.includes(type)) return true;
      const textExt = ["js","jsx","ts","tsx","json","css","scss","less","html","htm","md","txt","svg","xml","yml","yaml","cjs","mjs"];
      const ext = name.split(".").pop();
      return textExt.includes(ext);
    };

    const readFileContent = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(String(reader.result || ""));
        if (isTextLike(file)) {
          reader.readAsText(file);
        } else {
          // binary-safe: store as data URL base64
          reader.readAsDataURL(file);
        }
      });
    };

    const uniqueName = (siblings, baseName) => {
      const has = (n) => siblings.some((s) => s.name.toLowerCase() === n.toLowerCase());
      if (!has(baseName)) return baseName;
      const dot = baseName.lastIndexOf(".");
      const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
      const ext = dot > 0 ? baseName.slice(dot) : "";
      let i = 1;
      let candidate = `${stem} (${i})${ext}`;
      while (has(candidate) && i < 500) {
        i += 1;
        candidate = `${stem} (${i})${ext}`;
      }
      return candidate;
    };

    const startUpload = async () => {
      for (const file of files) {
        const relativePath = file.webkitRelativePath || file.name;
        const parts = relativePath.split("/");
        const onlyFile = parts.pop();
        let targetFolderId = destId || null;
        if (parts.length > 0) {
          // create nested folders under destId
          targetFolderId = ensureFolderPath(destId || null, parts.filter(Boolean));
        }
        const parentNode = targetFolderId ? findNodeInTree(tree, targetFolderId) : null;
        const siblings = parentNode ? parentNode.children ?? [] : tree;
        const content = await readFileContent(file);
        const safeName = uniqueName(siblings, onlyFile);
        createFile(targetFolderId, safeName, content);
      }
      onClose();
    };

    return (
      <Modal open={true} onClose={onClose} title="Upload Files">
        <div className="space-y-3">
          <div className="text-xs text-slate-400">Destination folder</div>
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-lg border border-slate-700/80 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              placeholder="Search folder..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-36 overflow-auto rounded-lg border border-slate-800/60">
            {filteredFolders.map((f) => (
              <button
                key={f.id ?? "root"}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-slate-200 hover:bg-slate-800/60 ${destId === f.id ? "bg-amber-900/20" : ""}`}
                onClick={() => setDestId(f.id ?? null)}
              >
                <span className="truncate text-sm">{f.id ? `/${f.path}` : "/ (root)"}</span>
                {destId === f.id && <Check size={14} className="text-amber-400" />}
              </button>
            ))}
          </div>

          <div
            onDrop={onDropFiles}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-slate-300 transition ${isDragging ? "border-amber-600/70 bg-amber-950/40" : "border-slate-700/70 bg-slate-900/50"}`}
            onClick={() => document.getElementById("upload-input")?.click()}
          >
            <div className={`rounded-full p-3 ${isDragging ? "bg-amber-600/20" : "bg-slate-800/40"}`}>
              <Upload size={22} className={isDragging ? "text-amber-300" : "text-slate-400"} />
            </div>
            <div className="text-sm">
              Drag & drop files or folders here
            </div>
            <div className="text-xs text-slate-400">or use the buttons below</div>
            <div className="mt-2 flex items-center gap-2">
              <button className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs hover:border-amber-500/70 hover:bg-slate-900/60" onClick={(e) => { e.stopPropagation(); document.getElementById("upload-input")?.click(); }}>Select files</button>
              <button className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs hover:border-amber-500/70 hover:bg-slate-900/60" onClick={(e) => { e.stopPropagation(); document.getElementById("upload-dir")?.click(); }}>Select folder</button>
            </div>
            <input id="upload-input" type="file" multiple className="hidden" onChange={onPick} />
            <input id="upload-dir" type="file" webkitdirectory="" directory="" className="hidden" onChange={onPick} />
          </div>
          {files.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg border border-slate-800/60">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm text-slate-300">
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-slate-500">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800/60" onClick={onClose}>
              <X size={14} />
            </button>
            <button
              data-modal-primary="true"
              disabled={files.length === 0}
              className="rounded-lg border border-amber-700/80 bg-amber-600/20 px-3 py-1.5 text-xs text-slate-100 enabled:hover:bg-amber-600/30 disabled:opacity-40"
              onClick={startUpload}
            >
              Upload {files.length > 0 ? `(${files.length})` : ""}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <aside
      ref={containerRef}
      className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-sm shadow-inner overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Explorer</div>
        <div className="inline-flex items-center gap-1">
          <button
            title="New File"
            className="rounded-lg border border-slate-800/70 p-2 text-xs text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60"
            onClick={() => setNameDialog({ open: true, mode: "create-file", parentId: null, nodeId: null, initial: "index.js" })}
          >
            <FilePlus size={14} />
          </button>
          <button
            title="New Folder"
            className="rounded-lg border border-slate-800/70 p-2 text-xs text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60"
            onClick={() => setNameDialog({ open: true, mode: "create-folder", parentId: null, nodeId: null, initial: "components" })}
          >
            <FolderPlus size={14} />
          </button>
          <button
            title="Upload Files"
            className="rounded-lg border border-slate-800/70 p-2 text-xs text-slate-300 hover:border-amber-500/70 hover:bg-slate-900/60"
            onClick={() => setShowUpload(true)}
          >
            <Upload size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 py-2 text-xs text-slate-300">
        {tree.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700/70 px-4 py-6 text-center text-slate-500">
            No files yet. Use the actions above to start building.
          </p>
        ) : (
          renderNodes(tree)
        )}
      </div>
      {showPickerFor && (
        <FolderPicker onClose={() => setShowPickerFor(null)} originNodeId={showPickerFor} />)
      }
      {showUpload && <UploadDialog onClose={() => setShowUpload(false)} />}
      <NameDialog
        open={nameDialog.open}
        title={nameDialog.mode === "rename" ? "Rename Item" : nameDialog.mode === "create-file" ? "New File" : "New Folder"}
        label="Name"
        initial={nameDialog.initial}
        placeholder={nameDialog.mode === "create-file" ? "index.js" : "components"}
        validate={(val) => {
          if (/[\\/:*?"<>|]/.test(val)) return "Name contains invalid characters.";
          const siblings = nameDialog.mode?.startsWith("create")
            ? (nameDialog.parentId ? findNodeInTree(tree, nameDialog.parentId)?.children ?? [] : tree)
            : (() => {
                const parent = findParentInTree(tree, nameDialog.nodeId);
                return parent ? parent.children ?? [] : tree;
              })();
          const duplicate = siblings.some((s) => s.name.toLowerCase() === val.toLowerCase() && s.id !== nameDialog.nodeId);
          if (duplicate) return "An item with this name already exists here.";
          return null;
        }}
        onCancel={() => setNameDialog({ open: false, mode: null, parentId: null, nodeId: null, initial: "" })}
        onSubmit={(val) => {
          const mode = nameDialog.mode;
          if (mode === "rename") {
            renameNode(nameDialog.nodeId, val);
          } else if (mode === "create-file") {
            createFile(nameDialog.parentId, val, "");
          } else if (mode === "create-folder") {
            createFolder(nameDialog.parentId, val);
          }
          setNameDialog({ open: false, mode: null, parentId: null, nodeId: null, initial: "" });
        }}
      />
      <ConfirmDialog
        open={confirmDialog.open}
        title="Delete Item"
        message={`Delete ${confirmDialog.name}? This cannot be undone.`}
        destructive
        confirmText="Delete"
        onCancel={() => setConfirmDialog({ open: false, nodeId: null, name: "" })}
        onConfirm={() => {
          deleteNode(confirmDialog.nodeId);
          setConfirmDialog({ open: false, nodeId: null, name: "" });
        }}
      />
    </aside>
  );
};

export default FileExplorer;
