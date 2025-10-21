const randomId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const DEFAULT_PACKAGE_TEMPLATE = {
  name: "cipherstudio-sandbox",
  version: "0.0.1",
  private: true,
  main: "src/main.jsx",
  dependencies: {
    react: "^18.2.0",
    "react-dom": "^18.2.0"
  }
};

export const defaultPackageJson = JSON.stringify(DEFAULT_PACKAGE_TEMPLATE, null, 2);

const DEFAULT_INDEX_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CipherStudio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

export const defaultIndexHtml = DEFAULT_INDEX_HTML_TEMPLATE;

export const normalizePathValue = (rawPath) => {
  if (typeof rawPath !== "string") {
    return rawPath;
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return "";
  }

  const hasLeadingSlash = trimmed.startsWith("/");
  const segments = trimmed.split("/");
  const normalizedSegments = [];

  for (const segment of segments) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      normalizedSegments.pop();
      continue;
    }

    normalizedSegments.push(segment);
  }

  if (normalizedSegments.length === 0) {
    return hasLeadingSlash ? "/" : "";
  }

  return normalizedSegments.join("/");
};

export const normalizeTreePaths = (nodes = []) => {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes.map((node) => {
    const normalizedPath = typeof node.path === "string" ? normalizePathValue(node.path) : node.path;
    const nextNode = {
      ...node,
      path: normalizedPath
    };

    if (node.type === "folder" && Array.isArray(node.children)) {
      nextNode.children = normalizeTreePaths(node.children);
    }

    return nextNode;
  });
};

export const createFileNode = ({ name, parentPath = "", content = "" }) => {
  const safeParent = parentPath ? `${parentPath}/` : "";
  return {
    id: randomId(),
    name,
    type: "file",
    path: `${safeParent}${name}`.replace(/\/+/g, "/"),
    content
  };
};

export const createFolderNode = ({ name, parentPath = "" }) => {
  const safeParent = parentPath ? `${parentPath}/` : "";
  return {
    id: randomId(),
    name,
    type: "folder",
    path: `${safeParent}${name}`.replace(/\/+/g, "/"),
    children: []
  };
};

export const traverseTree = (nodes, visit) => {
  nodes.forEach((node) => {
    visit(node);
    if (node.type === "folder" && node.children) {
      traverseTree(node.children, visit);
    }
  });
};

export const treeToFlatArray = (nodes) => {
  const flat = [];
  traverseTree(nodes, (node) => {
    flat.push({
      name: node.name,
      path: node.path,
      type: node.type,
      content: node.type === "file" ? node.content ?? "" : undefined
    });
  });
  return flat;
};

const cloneTree = (nodes) => nodes.map((node) => ({
  ...node,
  children: node.children ? cloneTree(node.children) : undefined
}));

export const updateNodeById = (nodes, nodeId, updater) => {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node);
    }
    if (node.type === "folder" && node.children) {
      return {
        ...node,
        children: updateNodeById(node.children, nodeId, updater)
      };
    }
    return node;
  });
};

export const deleteNodeById = (nodes, nodeId) => {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => {
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          children: deleteNodeById(node.children, nodeId)
        };
      }
      return node;
    });
};

export const findNodeById = (nodes, nodeId) => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.type === "folder" && node.children) {
      const match = findNodeById(node.children, nodeId);
      if (match) {
        return match;
      }
    }
  }
  return null;
};

export const findParentOfNode = (nodes, nodeId) => {
  for (const node of nodes) {
    if (node.type === "folder" && node.children) {
      if (node.children.some((child) => child.id === nodeId)) {
        return node;
      }
      const nested = findParentOfNode(node.children, nodeId);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
};

// Utility: remove a node by id and return it, along with the updated tree
export const extractAndRemoveNodeById = (nodes, nodeId) => {
  let extracted = null;
  const walk = (list) =>
    list
      .filter((n) => {
        if (n.id === nodeId) {
          extracted = n;
          return false; // remove it
        }
        return true;
      })
      .map((n) =>
        n.type === "folder" && n.children
          ? { ...n, children: walk(n.children) }
          : n
      );
  const next = walk(nodes);
  return { node: extracted, tree: next };
};

// Utility: rebase paths for a node subtree to live under newParentPath
export const rebaseNodePaths = (node, newParentPath = "") => {
  const safeParent = newParentPath ? `${newParentPath}/` : "";
  const newPath = `${safeParent}${node.name}`.replace(/\/+/g, "/");
  if (node.type === "folder" && node.children) {
    return {
      ...node,
      path: newPath,
      children: node.children.map((child) => rebaseNodePaths(child, newPath))
    };
  }
  return { ...node, path: newPath };
};

// Utility: insert node into a folder (or root when parentId is null)
export const insertNodeIntoParent = (nodes, parentId, node, index = null) => {
  if (!parentId) {
    const arr = [...nodes];
    if (index == null || index < 0 || index > arr.length) {
      arr.push(node);
    } else {
      arr.splice(index, 0, node);
    }
    return arr;
  }
  return nodes.map((n) => {
    if (n.id === parentId && n.type === "folder") {
      const children = Array.isArray(n.children) ? [...n.children] : [];
      if (index == null || index < 0 || index > children.length) {
        children.push(node);
      } else {
        children.splice(index, 0, node);
      }
      return { ...n, children };
    }
    if (n.type === "folder" && n.children) {
      return { ...n, children: insertNodeIntoParent(n.children, parentId, node, index) };
    }
    return n;
  });
};

// Helper: find a node by id and return also its parent and index
export const findNodeWithParent = (nodes, nodeId, parent = null) => {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.id === nodeId) {
      return { node, parent, index: i };
    }
    if (node.type === "folder" && node.children) {
      const found = findNodeWithParent(node.children, nodeId, { node: parent ? parent.node ?? parent : null, list: nodes });
      // The above is tricky; better to pass the actual parent node reference
    }
  }
  return null;
};

// Utility: check if potentialDescendantId is inside ancestorId subtree
export const isDescendantId = (nodes, ancestorId, potentialDescendantId) => {
  const ancestor = findNodeById(nodes, ancestorId);
  if (!ancestor || ancestor.type !== "folder") return false;
  let found = false;
  traverseTree(ancestor.children || [], (n) => {
    if (n.id === potentialDescendantId) found = true;
  });
  return found;
};

const uniqueNameInSiblings = (siblings, baseName) => {
  const existing = new Set(
    siblings.map((s) => s.name.toLowerCase())
  );
  if (!existing.has(baseName.toLowerCase())) return baseName;
  let i = 1;
  while (existing.has(`${baseName} (${i})`.toLowerCase())) i += 1;
  return `${baseName} (${i})`;
};

// Move a node into a destination folder (or root when destFolderId is null)
export const moveNode = (nodes, nodeId, destFolderId = null, positionIndex = null) => {
  if (destFolderId === nodeId) return nodes;
  if (destFolderId && isDescendantId(nodes, nodeId, destFolderId)) {
    // Prevent moving folder into its own descendant
    return nodes;
  }

  const { node: extracted, tree: without } = extractAndRemoveNodeById(nodes, nodeId);
  if (!extracted) return nodes; // not found

  const destParent = destFolderId ? findNodeById(without, destFolderId) : null;
  const destPath = destParent ? destParent.path : "";

  // Ensure unique name in destination siblings
  const siblings = destParent ? (destParent.children || []) : without;
  const newName = uniqueNameInSiblings(siblings, extracted.name);
  const renamed = newName !== extracted.name ? { ...extracted, name: newName } : extracted;
  const rebased = rebaseNodePaths(renamed, destPath);

  return insertNodeIntoParent(without, destFolderId, rebased, positionIndex);
};

// Reorder node within its siblings
export const moveNodeWithinSiblings = (nodes, nodeId, direction = "up") => {
  const helper = (list) => {
    let changed = false;
    const idx = list.findIndex((n) => n.id === nodeId);
    if (idx !== -1) {
      const targetIndex = direction === "up" ? idx - 1 : idx + 1;
      if (targetIndex >= 0 && targetIndex < list.length) {
        const arr = [...list];
        const [item] = arr.splice(idx, 1);
        arr.splice(targetIndex, 0, item);
        return { list: arr, changed: true };
      }
      return { list, changed: false };
    }
    return {
      list: list.map((n) => {
        if (n.type === "folder" && n.children) {
          const result = helper(n.children);
          if (result.changed) {
            changed = true;
            return { ...n, children: result.list };
          }
        }
        return n;
      }),
      changed
    };
  };
  const result = helper(nodes);
  return result.changed ? result.list : nodes;
};

export const moveNodeToParentFolder = (nodes, nodeId) => {
  // Move the node to its parent's parent (or root if no grandparent)
  const parent = findParentOfNode(nodes, nodeId);
  if (!parent) {
    // already at root
    return nodes;
  }
  const grandParent = findParentOfNode(nodes, parent.id);
  const destFolderId = grandParent ? grandParent.id : null;
  return moveNode(nodes, nodeId, destFolderId, null);
};

export const renameNodeById = (nodes, nodeId, newName) => {
  const applyRename = (node, parentPath = "") => {
    const updatedPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.id === nodeId) {
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          name: newName,
          path: newPath,
          children: node.children.map((child) => applyRename(child, newPath))
        };
      }
      return {
        ...node,
        name: newName,
        path: newPath
      };
    }
    if (node.type === "folder" && node.children) {
      return {
        ...node,
        path: updatedPath,
        children: node.children.map((child) => applyRename(child, updatedPath))
      };
    }
    return {
      ...node,
      path: updatedPath
    };
  };

  return nodes.map((node) => applyRename(node));
};

export const addNodeToParent = (nodes, parentId, newNode) => {
  if (!parentId) {
    return [...nodes, newNode];
  }
  return nodes.map((node) => {
    if (node.id === parentId && node.type === "folder") {
      const childWithPath = newNode.type === "folder"
        ? { ...newNode, path: `${node.path}/${newNode.name}`.replace(/\/+/g, "/") }
        : { ...newNode, path: `${node.path}/${newNode.name}`.replace(/\/+/g, "/") };
      const updatedChildren = node.children ? [...node.children, childWithPath] : [childWithPath];
      return {
        ...node,
        children: updatedChildren
      };
    }
    if (node.type === "folder" && node.children) {
      return {
        ...node,
        children: addNodeToParent(node.children, parentId, newNode)
      };
    }
    return node;
  });
};

export const treeToSandpackFiles = (nodes) => {
  const files = {};
  traverseTree(nodes, (node) => {
    if (node.type === "file") {
      const normalizedPath = node.path.startsWith("/") ? node.path : `/${node.path}`;
      let code = node.content ?? "";

      if (node.name === "package.json") {
        try {
          if (!code || typeof code !== "string") {
            throw new Error("Invalid package.json content");
          }
          JSON.parse(code);
        } catch (error) {
          console.warn("Invalid package.json detected. Reverting to default.", error);
          code = defaultPackageJson;
        }
      }

      files[normalizedPath] = {
        code,
        active: false
      };
    }
  });

  if (!files["/package.json"]) {
    files["/package.json"] = {
      code: defaultPackageJson,
      active: false
    };
  }

  if (!files["/index.html"]) {
    files["/index.html"] = {
      code: defaultIndexHtml,
      active: false
    };
  }
  return files;
};

export const ensureDefaultReactTemplate = () => {
  const srcFolder = createFolderNode({ name: "src" });
  const appFile = createFileNode({
    name: "App.jsx",
    parentPath: srcFolder.path,
    content: `export default function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a', 
      color: '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          CipherStudio
        </h1>
        <p style={{ color: '#94a3b8' }}>
          Start editing src/App.jsx to build your project.
        </p>
      </div>
    </div>
  );
}`
  });
  const cssFile = createFileNode({
    name: "index.css",
    parentPath: srcFolder.path,
    content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #020617;
  color: #e2e8f0;
}`
  });
  const packageFile = createFileNode({
    name: "package.json",
    content: defaultPackageJson
  });

  const indexFile = createFileNode({
    name: "index.html",
    content: defaultIndexHtml
  });

  return [
    {
      ...srcFolder,
      children: [appFile, cssFile]
    },
    indexFile,
    packageFile
  ];
};

export const setActiveFlagOnFiles = (filesMap, activePath) => {
  return Object.fromEntries(
    Object.entries(filesMap).map(([path, descriptor]) => [
      path,
      {
        ...descriptor,
        active: path === activePath
      }
    ])
  );
};

export const serializeProjectState = (state) => JSON.stringify(state);

export const hydrateProjectState = (value) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse stored project state", error);
    return null;
  }
};

export const normalizeTree = (nodes) => cloneTree(nodes ?? []);

export const filesListToTree = (files = []) => {
  const byPath = new Map();
  const roots = [];

  const sorted = [...files].sort((a, b) => {
    const depthA = a.path.split("/").length;
    const depthB = b.path.split("/").length;
    return depthA - depthB;
  });

  sorted.forEach((entry) => {
    const node = {
      id: entry._id ?? entry.id ?? randomId(),
      name: entry.name,
      type: entry.type,
      path: entry.path,
      content: entry.type === "file" ? entry.content ?? "" : undefined
    };
    if (entry.type === "folder") {
      node.children = [];
    }
    const parentPath = entry.path.includes("/") ? entry.path.split("/").slice(0, -1).join("/") : "";
    if (parentPath) {
      const parentNode = byPath.get(parentPath);
      if (parentNode && parentNode.children) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
    byPath.set(entry.path, node);
  });

  return roots;
};

export const findNodeByPath = (nodes, targetPath) => {
  if (!Array.isArray(nodes)) {
    return null;
  }
  const normalizedTarget = normalizePathValue(targetPath);
  if (!normalizedTarget) {
    return null;
  }
  for (const node of nodes) {
    const nodePath = normalizePathValue(node.path);
    if (nodePath === normalizedTarget) {
      return node;
    }
    if (node.type === "folder" && node.children) {
      const match = findNodeByPath(node.children, normalizedTarget);
      if (match) {
        return match;
      }
    }
  }
  return null;
};

export const updateNodeByPath = (nodes, targetPath, updater) => {
  if (!Array.isArray(nodes)) {
    return nodes;
  }
  const normalizedTarget = normalizePathValue(targetPath);
  if (!normalizedTarget || typeof updater !== "function") {
    return nodes;
  }

  let mutated = false;

  const walk = (currentNodes) => {
    let updatedChildren = currentNodes;
    const nextNodes = currentNodes.map((node) => {
      const nodePath = normalizePathValue(node.path);
      if (nodePath === normalizedTarget) {
        mutated = true;
        return updater(node);
      }
      if (node.type === "folder" && node.children) {
        const childResult = walk(node.children);
        if (childResult !== node.children) {
          mutated = true;
          return {
            ...node,
            children: childResult
          };
        }
      }
      return node;
    });

    if (mutated) {
      updatedChildren = nextNodes;
    }
    return updatedChildren;
  };

  const result = walk(nodes);
  return mutated ? result : nodes;
};

export const filesMapToTree = (filesMap = {}) => {
  if (!filesMap || typeof filesMap !== "object") {
    return ensureDefaultReactTemplate();
  }

  const folderPaths = new Set();
  const entries = [];
  let hasIndexHtml = false;

  Object.entries(filesMap).forEach(([rawPath, content]) => {
    if (!rawPath) return;
    const normalized = normalizePathValue(rawPath);
    if (!normalized || normalized === "/") return;

    const segments = normalized.split("/");
    if (segments.length === 1 && segments[0] === "index.html") {
      hasIndexHtml = true;
    }
    if (segments.length > 1) {
      for (let index = 1; index < segments.length; index += 1) {
        folderPaths.add(segments.slice(0, index).join("/"));
      }
    }

    entries.push({
      name: segments[segments.length - 1],
      path: normalized,
      type: "file",
      content
    });
  });

  folderPaths.forEach((path) => {
    entries.push({
      name: path.split("/").pop(),
      path,
      type: "folder"
    });
  });

  if (!hasIndexHtml) {
    entries.push({
      name: "index.html",
      path: "index.html",
      type: "file",
      content: defaultIndexHtml
    });
  }

  return filesListToTree(entries);
};
