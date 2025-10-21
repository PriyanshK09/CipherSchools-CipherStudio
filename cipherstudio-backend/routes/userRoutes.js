import { Router } from "express";
import { loginUser, registerUser } from "../controllers/authController.js";

const router = Router();

router.post("/", registerUser);
router.post("/login", loginUser);

export default router;
