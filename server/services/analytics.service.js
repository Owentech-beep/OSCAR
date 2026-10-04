import { BusinessMetric } from "../models/BusinessMetric.js";

export async function getRevenue({ from, to } = {}) {
  const filter = {};

  if (from || to) {
    filter.date = {};

    if (from) {
      filter.date.$gte = new Date(from);
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      filter.date.$lte = endDate;
    }
  }

  const metrics = await BusinessMetric.find(filter).sort({ date: 1 }).lean();

  const totalRevenue = metrics.reduce(
    (total, metric) => total + (metric.revenue || 0),
    0,
  );

  return {
    totalRevenue,
    currency: "ZAR",
    period: {
      from: from || null,
      to: to || null,
    },
    dataPoints: metrics.map((metric) => ({
      date: metric.date,
      revenue: metric.revenue || 0,
    })),
  };
}

export async function getBusinessMetrics({ from, to, limit = 30 } = {}) {
  const filter = {};

  if (from || to) {
    filter.date = {};

    if (from) {
      filter.date.$gte = new Date(from);
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      filter.date.$lte = endDate;
    }
  }

  const metrics = await BusinessMetric.find(filter)
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  return {
    count: metrics.length,
    metrics: metrics.map((metric) => ({
      id: metric._id,
      date: metric.date,
      revenue: metric.revenue || 0,
      activeClients: metric.activeClients || 0,
      potentialLeads: metric.potentialLeads || 0,
      emailsSent: metric.emailsSent || 0,
      responses: metric.responses || 0,
      conversionRate: metric.conversionRate || 0,
    })),
  };
}

export async function generateBusinessReport({
  from,
  to,
} = {}) {
  const metrics = await getBusinessMetrics({
    from,
    to,
    limit: 100,
  });

  const revenue = await getRevenue({
    from,
    to,
  });

  const totals = metrics.metrics.reduce(
    (acc, metric) => {
      acc.activeClients += metric.activeClients;
      acc.potentialLeads += metric.potentialLeads;
      acc.emailsSent += metric.emailsSent;
      acc.responses += metric.responses;

      return acc;
    },
    {
      activeClients: 0,
      potentialLeads: 0,
      emailsSent: 0,
      responses: 0,
    },
  );

  return {
    period: {
      from: from || null,
      to: to || null,
    },

    revenue,

    metrics,

    totals,

    dataAvailable: metrics.count > 0,
  };
}
