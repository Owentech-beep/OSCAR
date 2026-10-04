import express from "express";

import {
  createClientController,
  getClientsController,
  getClientController,
  updateClientController,
  deleteClientController,
} from "../controllers/client.controller.js";

import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

router.get("/", getClientsController);

router.get("/:id", getClientController);

router.post("/", createClientController);

router.patch("/:id", updateClientController);

router.delete("/:id", deleteClientController);

export default router;
