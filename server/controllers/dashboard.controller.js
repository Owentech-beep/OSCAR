import {
  getDashboardMetrics,
  getRevenueHistory
} from "../services/dashboard.service.js";

export async function dashboardPage(req, res, next) {
  try {
    const metrics = await getDashboardMetrics();

    return res.render("dashboard/index", {
      title: "Dashboard",
      user: req.session.user,
      metrics
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
        history
      }
    });
  } catch (error) {
    return next(error);
  }
}
