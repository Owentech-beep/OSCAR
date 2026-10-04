import express from "express";

import {
  createMeetingController,
  getMeetingsController,
  getMeetingController,
  updateMeetingController,
  deleteMeetingController,
} from "../controllers/meeting.controller.js";

import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

// All meeting API routes require authentication
router.use(requireApiAuth);

// GET /api/meetings
router.get("/", getMeetingsController);

// GET /api/meetings/:id
router.get("/:id", getMeetingController);

// POST /api/meetings
router.post("/", createMeetingController);

// PATCH /api/meetings/:id
router.patch("/:id", updateMeetingController);

// DELETE /api/meetings/:id
router.delete("/:id", deleteMeetingController);

export default router;
