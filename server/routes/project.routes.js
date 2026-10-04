import express from "express";

import {
  createProjectController,
  getProjectsController,
  getProjectController,
  updateProjectController,
  deleteProjectController,
} from "../controllers/project.controller.js";

import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

router.get("/", getProjectsController);

router.get("/:id", getProjectController);

router.post("/", createProjectController);

router.patch("/:id", updateProjectController);

router.delete("/:id", deleteProjectController);

export default router;
