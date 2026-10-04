import { tool } from "@openai/agents";
import { z } from "zod";
import { generateLeadEmail } from "../services/email-generation.service.js";
import { requireToolContext } from "./tool-context.js";

export const generateEmailTool = tool({
  name: "generate_email",

  description:
    "Generate a personalized outreach email for a CRM lead using available lead information and saved website intelligence. This only creates email content and never sends an email.",

  parameters: z.object({
    leadId: z.string().min(1).describe("The MongoDB ID of the lead."),

    objective: z
      .string()
      .max(1000)
      .optional()
      .describe("The objective or purpose of the outreach email."),
  }),

  async execute({ leadId, objective }, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    try {
      const email = await generateLeadEmail(leadId, objective);

      if (!email) {
        return {
          success: false,
          error: "Lead not found.",
        };
      }

      return {
        success: true,
        email,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Email generation failed.",
      };
    }
  },
});
