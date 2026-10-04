import { Router } from "express";
import {
  dashboardPage,
  dashboardMetricsApi
} from "../controllers/dashboard.controller.js";
import { requireApiAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, dashboardPage);
router.get("/api/dashboard/metrics", requireApiAuth, dashboardMetricsApi);

export default router;
