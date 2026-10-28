import {
  getDashboardMetrics,
  getRevenueHistory,
  getRecentActivity,
} from "../services/dashboard.service.js";
import { env } from "../config/env.js";

export async function dashboardPage(req, res, next) {
  try {
    const [metrics, activities] = await Promise.all([
      getDashboardMetrics(),
      getRecentActivity(8),
    ]);

    return res.render("dashboard/index", {
      title: "Dashboard",
      user: req.session.user,
      metrics,
      activities,
      voiceConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
    });
  } catch (error) {
    return next(error);
  }
}

export async function dashboardMetricsApi(req, res, next) {
  try {
    const metrics = await getDashboardMetrics();
    const history = await getRevenueHistory();

    return res.json({
      success: true,
      data: {
        metrics,
        history,
      },
    });
  } catch (error) {
    return next(error);
  }
}