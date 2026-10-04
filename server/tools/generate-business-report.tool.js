import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { generateBusinessReport } from "../services/analytics.service.js";

export const generateBusinessReportTool = tool({
  name: "generate_business_report",

  description:
    "Generate a business performance report using real OSCAR business metrics. Never invent missing statistics.",

  parameters: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    try {
      const report = await generateBusinessReport({
        from: input.from,
        to: input.to,
      });

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});