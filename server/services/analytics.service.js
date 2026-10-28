import { BusinessMetric } from "../models/BusinessMetric.js";
import Lead from "../models/Lead.js";
import Client from "../models/Client.js";
import Email from "../models/Email.js";

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

export async function generateBusinessReport({ from, to } = {}) {
  const revenue = await getRevenue({
    from,
    to,
  });

  const emailFilter = {
    status: "sent",
  };

  const responseFilter = {
    direction: "inbound",
  };

  if (from || to) {
    const dateFilter = {};

    if (from) {
      dateFilter.$gte = new Date(from);
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }

    emailFilter.sentAt = dateFilter;
    responseFilter.createdAt = dateFilter;
  }

  const [
    activeClients,
    potentialLeads,
    emailsSent,
    responses,
    latestMetric,
  ] = await Promise.all([
    Client.countDocuments({
      status: "Active",
    }),

    Lead.countDocuments({
      status: {
        $nin: ["Won", "Lost"],
      },
    }),

    Email.countDocuments(emailFilter),

    Email.countDocuments(responseFilter),

    BusinessMetric.findOne()
      .sort({ date: -1 })
      .select("conversionRate date")
      .lean(),
  ]);

  return {
    period: {
      from: from || null,
      to: to || null,
    },

    revenue,

    metrics: {
      activeClients,
      potentialLeads,
      emailsSent,
      responses,
      conversionRate: latestMetric?.conversionRate ?? 0,
      conversionRateAsOf: latestMetric?.date ?? null,
    },

    dataAvailable:
      revenue.dataPoints.length > 0 ||
      activeClients > 0 ||
      potentialLeads > 0 ||
      emailsSent > 0 ||
      responses > 0 ||
      Boolean(latestMetric),
  };
}

export async function getEmailStatistics({ from, to } = {}) {
  const filter = {};

  if (from || to) {
    const dateFilter = {};

    if (from) {
      dateFilter.$gte = new Date(from);
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }

    filter.createdAt = dateFilter;
  }

  const [
    total,
    drafts,
    scheduled,
    sent,
    failed,
    inbound,
  ] = await Promise.all([
    Email.countDocuments(filter),

    Email.countDocuments({
      ...filter,
      status: "draft",
    }),

    Email.countDocuments({
      ...filter,
      status: "scheduled",
    }),

    Email.countDocuments({
      ...filter,
      status: "sent",
    }),

    Email.countDocuments({
      ...filter,
      status: "failed",
    }),

    Email.countDocuments({
      ...filter,
      direction: "inbound",
    }),
  ]);

  return {
    period: {
      from: from || null,
      to: to || null,
    },
    totals: {
      total,
      drafts,
      scheduled,
      sent,
      failed,
      inbound,
    },
  };
}