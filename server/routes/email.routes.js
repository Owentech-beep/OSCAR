import express from "express";

import {
  getEmailsController,
  getEmailController,
  getLeadEmailsController,
} from "../controllers/email.controller.js";

import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

router.get("/", getEmailsController);

router.get("/lead/:leadId", getLeadEmailsController);

router.get("/:id", getEmailController);

export default router;
