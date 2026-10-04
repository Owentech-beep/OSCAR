import Lead from "../models/Lead.js";
import { getLatestBusinessMetrics } from "./business-metrics.service.js";

export async function getOscarBusinessContext() {
  const [metrics, leadCounts, totalLeads] = await Promise.all([
    getLatestBusinessMetrics(),

    Lead.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    Lead.countDocuments(),
  ]);

  const leadPipeline = {};

  for (const item of leadCounts) {
    leadPipeline[item._id] = item.count;
  }

  return {
    metrics,
    leads: {
      total: totalLeads,
      pipeline: leadPipeline,
    },
  };
}