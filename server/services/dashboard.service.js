import { BusinessMetric } from "../models/BusinessMetric.js";
import { User } from "../models/User.js";
import Lead from "../models/Lead.js";
import Email from "../models/Email.js";
import Client from "../models/Client.js";

export async function getDashboardMetrics() {
  const latest = await BusinessMetric.findOne().sort({ date: -1 }).lean();

  const [activeUsers, activeClients, potentialLeads, emailsSent, responses] =
    await Promise.all([
      User.countDocuments({ active: true }),

      Client.countDocuments({
        status: "Active",
      }),

      Lead.countDocuments({
        status: { $nin: ["Won", "Lost"] },
      }),

      Email.countDocuments({
        status: "sent",
      }),

      Email.countDocuments({
        direction: "inbound",
      }),
    ]);
  return {
    revenue: latest?.revenue ?? 0,

    activeClients,

    potentialLeads,

    emailsSent,

    responses,

    conversionRate: latest?.conversionRate ?? 0,

    activeUsers,

    asOf: latest?.date ?? null,
  };
}

export async function getRevenueHistory(days = 30) {
  const from = new Date();

  from.setDate(from.getDate() - days);

  return BusinessMetric.find({
    date: {
      $gte: from,
    },
  })
    .sort({ date: 1 })
    .select("date revenue")
    .lean();
}
