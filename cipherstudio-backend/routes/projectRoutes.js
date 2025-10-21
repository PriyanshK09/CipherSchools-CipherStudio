import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectsForUser,
  updateProject,
  addCollaborator,
  removeCollaborator,
  listCollaborators
} from "../controllers/projectController.js";
import { cloneFromGithub } from "../controllers/projectController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.post("/", createProject);
router.post("/clone", cloneFromGithub);
router.get("/user/:userId", (req, res, next) => {
  if (req.params.userId !== String(req.userId)) {
    return res.status(403).json({ message: "Cannot access projects for another user" });
  }
  return getProjectsForUser(req, res, next);
});
router.get("/:id", getProjectById);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);
router.get("/:id/collaborators", listCollaborators);
router.post("/:id/collaborators", addCollaborator);
router.delete("/:id/collaborators/:userId", removeCollaborator);

export default router;
