import { tool } from "@openai/agents";

import { getLatestBusinessMetrics } from "../services/business-metrics.service.js";
import { requireToolContext } from "./tool-context.js";

export const getBusinessMetricsTool = tool({
  name: "get_business_metrics",

  description:
    "Retrieve the latest real business metrics from the CRM database, including revenue, active clients, potential leads, emails sent, responses, and conversion rate. Never invent business statistics.",

  parameters: {},

  async execute(_, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    const metrics = await getLatestBusinessMetrics();

    if (!metrics) {
      return {
        success: false,
        error: "No business metrics are available.",
      };
    }

    return {
      success: true,
      metrics,
    };
  },
});