import { tool } from "@openai/agents";
import { z } from "zod";

import { requireToolContext } from "./tool-context.js";
import { getClients } from "../services/client.service.js";

export const getClientsTool = tool({
  name: "get_clients",

  description:
    "Retrieve real clients from OSCAR's CRM. Use this when the user asks about clients, active clients, client records, or the client list.",

  parameters: z.object({
    search: z
      .string()
      .optional()
      .describe(
        "Search by company name, contact name, email, or phone."
      ),

    status: z
      .enum([
        "Active",
        "Inactive",
        "Onboarding",
        "Completed",
      ])
      .optional(),

    page: z.number().int().min(1).default(1),

    limit: z.number().int().min(1).max(100).default(20),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    try {
      const result = await getClients({
        page: input.page,
        limit: input.limit,
        search: input.search || "",
        status: input.status || "",
      });

      return {
        success: true,

        data: {
          clients: result.clients.map((client) => ({
            id: client._id.toString(),
            companyName: client.companyName,
            contactName: client.contactName || "",
            email: client.email || "",
            phone: client.phone || "",
            website: client.website || "",
            industry: client.industry || "",
            location: client.location || "",
            status: client.status,
            notes: client.notes || "",
          })),

          pagination: result.pagination,
        },
      };
    } catch (error) {
      console.error("get_clients tool error:", error);

      return {
        success: false,
        error: "Unable to retrieve clients.",
      };
    }
  },
});