import express from "express";

import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { assertCanPerformAction } from "../services/authorization.service.js";
import { getAnalyticsOverview } from "../services/analytics-page.service.js";

const router = express.Router();

router.get("/analytics", requireAuth, async (req, res, next) => {
  try {
    const actor = await User.findById(req.session.user.id)
      .select("role active")
      .lean();

    assertCanPerformAction(actor, "get_business_metrics");

    const analytics = await getAnalyticsOverview();

    return res.render("analytics/index", {
      title: "Analytics",
      analytics,
    });
  } catch (error) {
    next(error);
  }
});

export default router;