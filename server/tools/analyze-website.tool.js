import { tool } from "@openai/agents";
import { z } from "zod";
import { createWebsiteAudit } from "../services/website-audit.service.js";
import { requireToolContext } from "./tool-context.js";

export const analyzeWebsiteTool = tool({
  name: "analyze_website",

  description:
    "Analyze a CRM lead's public website and produce structured business intelligence including services, target audience, strengths, weaknesses, opportunities, and a recommended outreach approach.",

  parameters: z.object({
    leadId: z
      .string()
      .min(1)
      .describe("The MongoDB ID of the lead whose website should be analyzed."),
  }),

  async execute({ leadId }, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    try {
      const audit = await createWebsiteAudit(leadId);

      if (!audit) {
        return {
          success: false,
          error: "Lead not found.",
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
    } catch (error) {
      return {
        success: false,
        error: error.message || "Website analysis failed.",
        auditId: error.auditId ?? null,
      };
    }
  },
});