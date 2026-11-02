import express from "express";
import {
  chatWithOscar,
  confirmOscarAction,
  createOscarVoiceSession,
} from "../controllers/oscar.controller.js";
import { requireApiAuth } from "../middleware/auth.js";
import { requireCurrentOscarAccount } from "../middleware/oscar-auth.js";

const router = express.Router();

router.use(requireApiAuth);
router.use(requireCurrentOscarAccount);

router.post("/chat", chatWithOscar);
router.post("/confirm", confirmOscarAction);
router.post("/voice/session", createOscarVoiceSession);

export default router;
