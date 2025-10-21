import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addNodeToParent,
  createFileNode,
  createFolderNode,
  deleteNodeById,
  ensureDefaultReactTemplate,
  findNodeById,
  normalizeTree,
  renameNodeById,
  serializeProjectState,
  setActiveFlagOnFiles,
  treeToSandpackFiles,
  updateNodeById,
  hydrateProjectState,
  filesListToTree,
  treeToFlatArray,
  filesMapToTree,
  updateNodeByPath,
  normalizeTreePaths,
  normalizePathValue,
  moveNode,
  moveNodeWithinSiblings,
  moveNodeToParentFolder,
  findParentOfNode
} from "../utils/treeUtils";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";
import { useAuth } from "./AuthContext.jsx";
import ProjectService from "../services/ProjectService.js";
import { getExampleProjectById } from "../data/exampleProjects.js";

const ProjectContext = createContext(null);

// Storage key will be derived per-workspace: cipherstudio.project.<workspaceId>
const LAST_WORKSPACE_KEY = "cipherstudio.lastWorkspaceId";
const DEFAULT_PROJECT_NAME = "Untitled CipherStudio Project";

const buildDefaultState = () => {
  const tree = normalizeTreePaths(ensureDefaultReactTemplate());
  const defaultActive = tree[0]?.children?.[0]?.id ?? null;
  return {
    projectId: null,
    projectName: DEFAULT_PROJECT_NAME,
    tree,
    activeFileId: defaultActive,
    theme: "dark",
    editorFontSize: 13
  };
};

export const ProjectProvider = ({ children, workspaceId, exampleId }) => {
  // Derive storage key by workspace
  const storageKey = useMemo(() => {
    const key = `cipherstudio.project.${workspaceId || "default"}`;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId || "default");
      } catch {}
    }
    return key;
  }, [workspaceId]);

  // Initial state from localStorage (this runs once on mount)
  const storedState = hydrateProjectState(
    typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null
  );

  const initialState = storedState
    ? {
        projectId: storedState.projectId ?? null,
        projectName: storedState.projectName ?? DEFAULT_PROJECT_NAME,
        tree: normalizeTreePaths(normalizeTree(storedState.tree)) ?? normalizeTreePaths(ensureDefaultReactTemplate()),
        activeFileId: storedState.activeFileId ?? null,
        theme: storedState.theme || "dark",
        editorFontSize: storedState.editorFontSize || 13
      }
    : buildDefaultState();

  const [projectId, setProjectId] = useState(initialState.projectId);
  const [projectName, setProjectName] = useState(initialState.projectName);
  const [tree, setTree] = useState(initialState.tree);
  const [activeFileId, setActiveFileId] = useState(initialState.activeFileId);
  const [theme, setTheme] = useState(initialState.theme || "dark");
  const [editorFontSize, setEditorFontSize] = useState(initialState.editorFontSize || 13);
  const { user, isAuthenticated, logout } = useAuth();
  const [isRemoteHydrated, setIsRemoteHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExampleMode, setIsExampleMode] = useState(false);
  // History for undo/redo of tree structure changes
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  const pushHistory = useCallback((prevTree, prevActiveId) => {
    setHistoryPast((stack) => {
      const next = [...stack, { tree: prevTree, activeFileId: prevActiveId }];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
    setHistoryFuture([]);
  }, []);

  const activeFile = useMemo(() => findNodeById(tree, activeFileId), [tree, activeFileId]);

  const sandpackFiles = useMemo(() => {
    const map = treeToSandpackFiles(tree);
    const activePath = activeFile ? `/${activeFile.path}` : undefined;
    return setActiveFlagOnFiles(map, activePath);
  }, [tree, activeFile]);

  // Persist state per-workspace
  useDebouncedEffect(
    () => {
      if (typeof window === "undefined") return;
      const payload = {
        projectId,
        projectName,
        tree,
        activeFileId,
        theme,
        editorFontSize
      };
      try {
        window.localStorage.setItem(storageKey, serializeProjectState(payload));
        window.localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId || "default");
      } catch {}
    },
    [projectId, projectName, tree, activeFileId, theme, editorFontSize, storageKey, workspaceId],
    700
  );

  // Rehydrate when workspaceId changes at runtime
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    const next = hydrateProjectState(raw);
    if (next && next.tree) {
      setProjectId(next.projectId ?? null);
      setProjectName(next.projectName ?? DEFAULT_PROJECT_NAME);
      setTree(normalizeTreePaths(normalizeTree(next.tree)));
      setActiveFileId(next.activeFileId ?? null);
      setTheme(next.theme || "dark");
      setEditorFontSize(next.editorFontSize || 13);
    } else {
      const defaults = buildDefaultState();
      setProjectId(defaults.projectId);
      setProjectName(defaults.projectName);
      setTree(defaults.tree);
      setActiveFileId(defaults.activeFileId);
      setTheme("dark");
      setEditorFontSize(13);
    }
  }, [storageKey]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const defaults = buildDefaultState();
    setProjectId(defaults.projectId);
    setProjectName(defaults.projectName);
    setTree(defaults.tree);
    setActiveFileId(defaults.activeFileId);
    setIsRemoteHydrated(false);
    setIsSyncing(false);
  }, [isAuthenticated]);

  // When an example is requested via URL, import it and skip remote bootstrap
  useEffect(() => {
    if (!exampleId) return;
    const ex = getExampleProjectById(exampleId);
    if (!ex) return;
    importExampleProject(ex);
    setProjectId(null);
    setProjectName(ex.name || DEFAULT_PROJECT_NAME);
    setIsRemoteHydrated(true);
    setIsSyncing(false);
    setIsExampleMode(true);
  }, [exampleId]);

  useDebouncedEffect(
    () => {
      if (!isAuthenticated || !projectId || !isRemoteHydrated) {
        return;
      }
      const payload = {
        name: projectName?.trim() || DEFAULT_PROJECT_NAME,
        files: treeToFlatArray(tree)
      };
      setIsSyncing(true);
      return ProjectService.updateProject(projectId, payload)
        .catch((error) => {
          if (error?.response?.status === 401) {
            logout();
            resetProject();
            return;
          }
          console.error("Failed to sync project", error);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    },
    [isAuthenticated, projectId, projectName, tree, isRemoteHydrated],
    700
  );

  const createFile = (parentId, name, content = "") => {
    let newId = null;
    setTree((current) => {
      const prev = current;
      const parent = parentId ? findNodeById(current, parentId) : null;
      const node = createFileNode({ name, parentPath: parent?.path, content });
      newId = node.id;
      const nextTree = parent ? addNodeToParent(current, parentId, node) : [...current, node];
      if (nextTree !== prev) pushHistory(prev, activeFileId);
      return nextTree;
    });
    if (newId) setActiveFileId(newId);
  };

  const createFolder = (parentId, name) => {
    setTree((current) => {
      const prev = current;
      const parent = parentId ? findNodeById(current, parentId) : null;
      const node = createFolderNode({ name, parentPath: parent?.path });
      const nextTree = parent ? addNodeToParent(current, parentId, node) : [...current, node];
      if (nextTree !== prev) pushHistory(prev, activeFileId);
      return nextTree;
    });
  };

  const renameNode = (nodeId, newName) => {
    setTree((current) => {
      const prev = current;
      const next = renameNodeById(current, nodeId, newName);
      if (next !== prev) pushHistory(prev, activeFileId);
      return next;
    });
  };

  function findFirstFileId(nodes) {
    for (const node of nodes) {
      if (node.type === "file") {
        return node.id;
      }
      if (node.type === "folder" && node.children) {
        const nested = findFirstFileId(node.children);
        if (nested) {
          return nested;
        }
      }
    }
    return null;
  }

  const deleteNode = (nodeId) => {
    setTree((current) => {
      const prev = current;
      const nextTree = deleteNodeById(current, nodeId);
      if (nextTree !== prev) pushHistory(prev, activeFileId);
      if (activeFileId === nodeId) {
        setActiveFileId(findFirstFileId(nextTree));
      }
      return nextTree;
    });
  };

  // Ensure a folder path exists under a starting parent and return the final folder id
  const ensureFolderPath = useCallback((startParentId, segments) => {
    if (!Array.isArray(segments) || segments.length === 0) {
      return startParentId || null;
    }
    let workingTree = tree;
    let parentId = startParentId || null;
    let parentPath = null;
    // compute parent path
    if (parentId) {
      const parentNode = findNodeById(workingTree, parentId);
      parentPath = parentNode?.path || null;
    }
    segments.forEach((seg) => {
      const parentNode = parentId ? findNodeById(workingTree, parentId) : null;
      const siblings = parentNode ? parentNode.children ?? [] : workingTree;
      let child = siblings.find((n) => n.type === "folder" && n.name === seg);
      if (!child) {
        const node = createFolderNode({ name: seg, parentPath: parentNode?.path });
        workingTree = parentNode ? addNodeToParent(workingTree, parentId, node) : [...workingTree, node];
        child = node;
      }
      parentId = child.id;
      parentPath = child.path;
    });
    if (workingTree !== tree) {
      const prev = tree;
      setTree(workingTree);
      pushHistory(prev, activeFileId);
    }
    return parentId;
  }, [tree, pushHistory, activeFileId]);

  const updateFileContent = (nodeId, content) => {
    setTree((current) => updateNodeById(current, nodeId, (node) => ({ ...node, content })));
  };

  const updateFileContentByPath = useCallback((path, content) => {
    const normalizedPath = normalizePathValue(path);
    if (!normalizedPath || normalizedPath === "/") {
      return;
    }

    setTree((current) => {
      let changed = false;
      const nextTree = updateNodeByPath(current, normalizedPath, (node) => {
        if (node.content === content) {
          return node;
        }
        changed = true;
        return {
          ...node,
          content
        };
      });

      return changed ? nextTree : current;
    });
  }, []);

  useEffect(() => {
    if (!activeFileId) {
      const first = findFirstFileId(tree);
      if (first) {
        setActiveFileId(first);
      }
    }
  }, [tree, activeFileId]);

  const loadProject = ({ id, name, tree: incomingTree, activeFilePath }, options = {}) => {
    const sanitizedTree = normalizeTreePaths(normalizeTree(incomingTree ?? ensureDefaultReactTemplate()));
    setProjectId(id ?? null);
    setProjectName(name ?? DEFAULT_PROJECT_NAME);
    setTree(sanitizedTree);
    if (activeFilePath) {
      const flattened = [];
      const collect = (nodes) => {
        nodes.forEach((node) => {
          if (node.type === "file") {
            flattened.push(node);
          }
          if (node.type === "folder" && node.children) {
            collect(node.children);
          }
        });
      };
      collect(sanitizedTree);
      const match = flattened.find((node) => node.path === activeFilePath);
      setActiveFileId(match?.id ?? sanitizedTree[0]?.children?.[0]?.id ?? null);
    } else {
      setActiveFileId(sanitizedTree[0]?.children?.[0]?.id ?? null);
    }
    if (options.markHydrated) {
      setIsRemoteHydrated(true);
      setIsSyncing(false);
    }
    setHistoryPast([]);
    setHistoryFuture([]);
  };

  // Move operations
  const moveNodeToFolder = (nodeId, destFolderId = null, positionIndex = null) => {
    setTree((current) => {
      const prev = current;
      const next = moveNode(current, nodeId, destFolderId, positionIndex);
      if (next !== prev) pushHistory(prev, activeFileId);
      return next;
    });
  };

  const moveNodeUp = (nodeId) => {
    setTree((current) => {
      const prev = current;
      const next = moveNodeWithinSiblings(current, nodeId, "up");
      if (next !== prev) pushHistory(prev, activeFileId);
      return next;
    });
  };

  const moveNodeDown = (nodeId) => {
    setTree((current) => {
      const prev = current;
      const next = moveNodeWithinSiblings(current, nodeId, "down");
      if (next !== prev) pushHistory(prev, activeFileId);
      return next;
    });
  };

  const moveNodeToParent = (nodeId) => {
    setTree((current) => {
      const prev = current;
      const next = moveNodeToParentFolder(current, nodeId);
      if (next !== prev) pushHistory(prev, activeFileId);
      return next;
    });
  };

  const undo = () => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const last = past[past.length - 1];
      setHistoryFuture((future) => [...future, { tree, activeFileId }]);
      setTree(last.tree);
      setActiveFileId(last.activeFileId);
      return past.slice(0, -1);
    });
  };

  const redo = () => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const next = future[future.length - 1];
      setHistoryPast((past) => [...past, { tree, activeFileId }]);
      setTree(next.tree);
      setActiveFileId(next.activeFileId);
      return future.slice(0, -1);
    });
  };

  const resetProject = () => {
    const defaults = buildDefaultState();
    setProjectId(defaults.projectId);
    setProjectName(defaults.projectName);
    setTree(defaults.tree);
    setActiveFileId(defaults.activeFileId);
    setTheme("dark");
    setEditorFontSize(13);
    setIsRemoteHydrated(false);
    setIsSyncing(false);
    setIsExampleMode(false);
    setHistoryPast([]);
    setHistoryFuture([]);
  };

  const importExampleProject = (example) => {
    if (!example?.files) {
      return;
    }

    const hydratedTree = normalizeTreePaths(normalizeTree(filesMapToTree(example.files)));
    setProjectName(example.name ?? DEFAULT_PROJECT_NAME);
    setTree(hydratedTree);
    setActiveFileId(findFirstFileId(hydratedTree));
    setIsRemoteHydrated(true);
  };

  const cloneExampleToProject = async (nameOverride) => {
    try {
      const desiredName = nameOverride?.trim?.() || `${projectName || DEFAULT_PROJECT_NAME}`;
      const created = await ProjectService.createProject({ name: desiredName });
      const newId = created?.project?._id || created?.project?.id;
      if (!newId) throw new Error("Failed to create project");
      await ProjectService.updateProject(newId, {
        name: desiredName,
        files: treeToFlatArray(tree)
      });
      setProjectId(newId);
      setIsExampleMode(false);
      setIsRemoteHydrated(true);
      setIsSyncing(false);
      return newId;
    } catch (e) {
      console.error("Clone example failed", e);
      throw e;
    }
  };

  useEffect(() => {
    if (exampleId) {
      // Skip remote hydration when working from an example
      return;
    }
    if (!isAuthenticated || !user?.id) {
      return;
    }

    setIsRemoteHydrated(false);
    let cancelled = false;

    const bootstrapProject = async () => {
      try {
        const projects = await ProjectService.fetchProjects(user.id);
        let projectSummary = Array.isArray(projects) ? projects[0] : null;
        if (!projectSummary) {
          const created = await ProjectService.createProject({ name: projectName?.trim() || DEFAULT_PROJECT_NAME });
          const newProject = created.project;
          const treeFromFiles = filesListToTree(created.files ?? []);
          if (!cancelled) {
            loadProject(
              {
                id: newProject?._id ?? newProject?.id ?? null,
                name: newProject?.name ?? projectName,
                tree: treeFromFiles
              },
              { markHydrated: true }
            );
            setIsSyncing(false);
          }
          return;
        }

        const summaryId = projectSummary._id ?? projectSummary.id ?? null;
        if (!summaryId) {
          console.warn("Unable to determine project id for user", user.id);
          return;
        }
        const details = await ProjectService.fetchProjectById(summaryId);
        const remoteTree = filesListToTree(details.files ?? []);
        if (!cancelled) {
          loadProject(
            {
              id: details.project?._id ?? details.project?.id ?? summaryId,
              name: details.project?.name ?? (projectName?.trim() || DEFAULT_PROJECT_NAME),
              tree: remoteTree
            },
            { markHydrated: true }
          );
          setIsSyncing(false);
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          if (!cancelled) {
            logout();
            resetProject();
          }
          return;
        }
        console.error("Failed to load remote project", error);
        if (!cancelled) {
          setIsRemoteHydrated(true);
          setIsSyncing(false);
        }
      }
    };

    bootstrapProject();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, exampleId]);

  const value = {
    workspaceId,
    projectId,
    setProjectId,
    projectName,
    setProjectName,
    tree,
    activeFileId,
    activeFile,
    sandpackFiles,
    setActiveFileId,
    theme,
    setTheme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    editorFontSize,
    setEditorFontSize,
    increaseFont: () => setEditorFontSize((n) => Math.min(24, n + 1)),
    decreaseFont: () => setEditorFontSize((n) => Math.max(10, n - 1)),
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    updateFileContent,
    updateFileContentByPath,
    moveNodeToFolder,
    moveNodeUp,
    moveNodeDown,
    moveNodeToParent,
    ensureFolderPath,
    undo,
    redo,
    resetProject,
    loadProject,
    importExampleProject,
    cloneExampleToProject,
    isRemoteHydrated,
    isSyncing,
    isExampleMode,
    getLastWorkspaceId: () => {
      if (typeof window === "undefined") return null;
      try {
        return window.localStorage.getItem(LAST_WORKSPACE_KEY);
      } catch {
        return null;
      }
    }
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
