import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { getLeads } from "../services/lead.service.js";

export const searchLeadsTool = tool({
  name: "search_leads",

  description:
    "Search the CRM for leads by company name, contact name, email, or industry. Use this when OSCAR needs to find specific leads.",

  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe("The company, contact, email, or industry to search for"),

    status: z.string().optional().describe("Optional CRM status filter"),
  }),

  async execute({ query, status }, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    const result = await getLeads({
      page: 1,
      limit: 20,
      search: query,
      status: status || "",
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

      total: result.pagination.total,
    };
  },
});
