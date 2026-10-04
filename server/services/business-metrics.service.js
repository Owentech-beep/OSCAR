import {BusinessMetric} from "../models/BusinessMetric.js";

export async function getLatestBusinessMetrics() {
  const metric = await BusinessMetric.findOne()
    .sort({ date: -1 })
    .lean();

  if (!metric) {
    return null;
  }

  return {
    date: metric.date,
    revenue: metric.revenue,
    activeClients: metric.activeClients,
    potentialLeads: metric.potentialLeads,
    emailsSent: metric.emailsSent,
    responses: metric.responses,
    conversionRate: metric.conversionRate,
  };
}