import express from "express";

import {
  getConfirmationController,
  confirmActionController,
  cancelActionController,
} from "../controllers/confirmation.controller.js";

import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

router.get("/:id", getConfirmationController);

router.post("/:id/confirm", confirmActionController);

router.post("/:id/cancel", cancelActionController);

export default router;
