import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { getLeads } from "../services/lead.service.js";

export const getLeadsTool = tool({
  name: "get_leads",

  description:
    "Retrieve leads from the CRM. Use this when OSCAR needs real lead data, lead counts, or an overview of the current sales pipeline.",

  parameters: z.object({
    page: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe("Page number to retrieve"),

    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Maximum number of leads to return"),

    status: z.string().optional().describe("Filter leads by CRM status"),

    search: z
      .string()
      .optional()
      .describe("Search company, contact, email, or industry"),
  }),

  async execute({ page, limit, status, search }, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    const result = await getLeads({
      page,
      limit,
      status: status || "",
      search: search || "",
      sort: "newest",
    });

    return {
      success: true,

      leads: result.leads.map((lead) => ({
        id: lead._id.toString(),
        companyName: lead.companyName,
        contactName: lead.contactName,
        email: lead.email,
        industry: lead.industry,
        location: lead.location,
        status: lead.status,
        leadScore: lead.leadScore,
        lastContact: lead.lastContact,
        nextFollowUp: lead.nextFollowUp,
      })),

      pagination: result.pagination,
    };
  },
});
