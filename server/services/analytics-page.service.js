import Invoice from "../models/Invoice.js";
import Lead from "../models/Lead.js";
import Client from "../models/Client.js";
import Email from "../models/Email.js";

export async function getAnalyticsOverview() {
  const [
    invoices,
    leadStages,
    emailStatuses,
    totalClients,
    activeClients,
    inboundEmails,
  ] = await Promise.all([
    Invoice.aggregate([
      {
        $group: {
          _id: {
            currency: "$currency",
            status: "$status",
          },
          count: { $sum: 1 },
          amount: { $sum: "$total" },
        },
      },
      { $sort: { "_id.currency": 1, "_id.status": 1 } },
    ]),

    Lead.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ]),

    Email.aggregate([
      { $match: { direction: "outbound" } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ]),

    Client.countDocuments({}),
    Client.countDocuments({ status: "Active" }),
    Email.countDocuments({ direction: "inbound" }),
  ]);

  const totalLeads = leadStages.reduce((sum, row) => sum + row.count, 0);
  const wonLeads = leadStages.find((row) => row._id === "Won")?.count || 0;
  const totalInvoices = invoices.reduce((sum, row) => sum + row.count, 0);

  return {
    generatedAt: new Date(),
    totalClients,
    activeClients,
    inboundEmails,
    totalLeads,
    wonLeads,
    totalInvoices,
    wonShare: totalLeads ? (wonLeads / totalLeads) * 100 : null,
    invoices: invoices.map((row) => ({
      currency: row._id.currency || "Unknown",
      status: row._id.status || "Unknown",
      count: row.count,
      amount: row.amount,
    })),
    leadStages: leadStages.map((row) => ({
      status: row._id || "Unknown",
      count: row.count,
    })),
    emailStatuses: emailStatuses.map((row) => ({
      status: row._id || "Unknown",
      count: row.count,
    })),
  };
}