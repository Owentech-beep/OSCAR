import express from "express";

import {
  createTaskController,
  getTasksController,
  getTaskController,
  updateTaskController,
  deleteTaskController,
} from "../controllers/task.controller.js";

import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

router.get("/", getTasksController);

router.get("/:id", getTaskController);

router.post("/", createTaskController);

router.patch("/:id", updateTaskController);

router.delete("/:id", deleteTaskController);

export default router;
