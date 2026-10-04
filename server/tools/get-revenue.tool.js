import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { getRevenue } from "../services/analytics.service.js";

export const getRevenueTool = tool({
  name: "get_revenue",

  description:
    "Retrieve real revenue data from OSCAR's business records. Never invent or estimate revenue when database data is unavailable.",

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
      const result = await getRevenue({
        from: input.from,
        to: input.to,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
