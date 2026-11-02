import express from "express";
import {
  getConfirmationController,
  confirmActionController,
  cancelActionController,
} from "../controllers/confirmation.controller.js";

import { requireApiAuth } from "../middleware/auth.js";
import { requireCurrentOscarAccount } from "../middleware/oscar-auth.js";

const router = express.Router();

router.use(requireApiAuth);
router.use(requireCurrentOscarAccount);

router.get("/:id", getConfirmationController);

router.post("/:id/confirm", confirmActionController);

router.post("/:id/cancel", cancelActionController);

export default router;
