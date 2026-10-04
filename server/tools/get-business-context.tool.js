import { tool } from "@openai/agents";
import { z } from "zod";
import { getOscarBusinessContext } from "../services/oscar-context.service.js";
import { requireToolContext } from "./tool-context.js";

export const getBusinessContextTool = tool({
  name: "get_business_context",

  description:
    "Retrieve a concise snapshot of the agency's current business state, including real CRM lead totals, lead pipeline status, and available business metrics. Use this when OSCAR needs an overall business overview. Never invent missing metrics.",

  parameters: z.object({}),

  async execute(_, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    const business = await getOscarBusinessContext();

    return {
      success: true,
      business,
    };
  },
});