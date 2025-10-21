import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { createFileEntry, deleteFileEntry, updateFileEntry } from "../controllers/fileController.js";

const router = Router();

router.use(authenticate);

router.post("/", createFileEntry);
router.put("/:id", updateFileEntry);
router.delete("/:id", deleteFileEntry);

export default router;
