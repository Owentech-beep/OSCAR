import express from "express";

import {
  createLeadController,
  getLeadsController,
  getLeadController,
  updateLeadController,
  deleteLeadController,
  analyzeLeadController,
  getLeadAnalysisController,
} from "../controllers/lead.controller.js";

import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

router.get("/", getLeadsController);
router.post("/:id/analyze", analyzeLeadController);
router.get("/:id/analysis", getLeadAnalysisController);
router.get("/:id", getLeadController);
router.post("/", createLeadController);
router.patch("/:id", updateLeadController);
router.delete("/:id", deleteLeadController);


export default router;