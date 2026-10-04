import express from "express";
import {
  chatWithOscar,
  confirmOscarAction,
} from "../controllers/oscar.controller.js";
import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

router.post("/chat", chatWithOscar);

export default router;
