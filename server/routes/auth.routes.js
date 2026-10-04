import { Router } from "express";
import {
  showLogin,
  login,
  logout
} from "../controllers/auth.controller.js";
import { authRateLimit } from "../middleware/security.js";

const router = Router();

router.get("/login", showLogin);
router.post("/login", authRateLimit, login);
router.post("/logout", logout);

export default router;
