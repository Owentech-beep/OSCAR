import { tool } from "@openai/agents";
import { z } from "zod";
import { getWebsiteAudit } from "../services/website-audit.service.js";
import { requireToolContext } from "./tool-context.js";

export const getWebsiteAuditTool = tool({
  name: "get_website_audit",

  description:
    "Retrieve the most recent saved website audit for a CRM lead. Use this when OSCAR needs existing website intelligence instead of performing a new analysis.",

  parameters: z.object({
    leadId: z
      .string()
      .min(1)
      .describe("The MongoDB ID of the lead."),
  }),

  async execute({ leadId }, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    const audit = await getWebsiteAudit(leadId);

    if (!audit) {
      return {
        success: false,
        error: "No website audit exists for this lead.",
      };
    }

    return {
      success: true,
      audit: {
        id: audit._id.toString(),
        leadId: audit.lead.toString(),
        url: audit.url,
        status: audit.status,
        title: audit.title,
        analysis: audit.analysis ?? null,
        analyzedAt: audit.analyzedAt ?? null,
        model: audit.model ?? null,
      },
    };
  },
});