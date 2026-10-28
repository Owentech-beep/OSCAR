import express from "express";
import {
  chatWithOscar,
  confirmOscarAction,
  createOscarVoiceSession,
} from "../controllers/oscar.controller.js";
import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

router.post("/chat", chatWithOscar);
router.post("/confirm", confirmOscarAction);
router.post("/voice/session", createOscarVoiceSession);

export default router;
