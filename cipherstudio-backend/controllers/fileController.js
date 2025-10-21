import File from "../models/File.js";
import Project from "../models/Project.js";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const assertProjectOwnership = async (projectId, userId) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) {
    const error = new Error("Project not found or access denied");
    error.statusCode = 404;
    throw error;
  }
  return project;
};

const updateDescendantPaths = async (parentId, parentPath) => {
  const children = await File.find({ parentId });
  await Promise.all(
    children.map(async (child) => {
      const newPath = `${parentPath}/${child.name}`;
      child.path = newPath;
      await child.save();
      if (child.type === "folder") {
        await updateDescendantPaths(child._id, newPath);
      }
    })
  );
};

export const createFileEntry = async (req, res, next) => {
  try {
    const { projectId, parentId, name, type, content } = req.body;
    if (!projectId || !name || !type) {
      return res.status(400).json({ message: "projectId, name, and type are required" });
    }

    if (!["file", "folder"].includes(type)) {
      return res.status(400).json({ message: "type must be 'file' or 'folder'" });
    }

    await assertProjectOwnership(projectId, req.userId);

    let parent = null;
    if (parentId) {
      parent = await File.findOne({ _id: parentId, projectId });
      if (!parent) {
        return res.status(404).json({ message: "Parent not found" });
      }
      if (parent.type !== "folder") {
        return res.status(400).json({ message: "Cannot create children under a file" });
      }
    }

    const path = parent ? `${parent.path}/${name}` : name;

    const file = await File.create({
      projectId,
      parentId: parent ? parent._id : null,
      name,
      type,
      path,
      content: type === "file" ? content ?? "" : ""
    });

    res.status(201).json(file);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      next(error);
    }
  }
};

export const updateFileEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, content } = req.body;

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await assertProjectOwnership(file.projectId, req.userId);

    if (name && name !== file.name) {
      let parentPath = "";
      if (file.parentId) {
        const parent = await File.findById(file.parentId);
        parentPath = parent.path;
      }
      const nextPath = parentPath ? `${parentPath}/${name}` : name;
      file.name = name;
      file.path = nextPath;
      if (file.type === "folder") {
        await updateDescendantPaths(file._id, nextPath);
      }
    }

    if (typeof content === "string") {
      if (file.type !== "file") {
        return res.status(400).json({ message: "Folders do not support content" });
      }
      file.content = content;
    }

    await file.save();
    res.json(file);
  } catch (error) {
    next(error);
  }
};

export const deleteFileEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await assertProjectOwnership(file.projectId, req.userId);

    const regex = new RegExp(`^${escapeRegExp(file.path)}`);
    await File.deleteMany({ projectId: file.projectId, path: regex });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
