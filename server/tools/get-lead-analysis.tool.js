import { tool } from "@openai/agents";
import { z } from "zod";

import { getLeadAnalysis } from "../services/lead-analysis.service.js";
import { requireToolContext } from "./tool-context.js";

export const getLeadAnalysisTool = tool({
  name: "get_lead_analysis",

  description:
    "Retrieve an existing AI analysis for a CRM lead from the database. Use this when OSCAR needs the lead's qualification, score, reasoning, strengths, concerns, or recommended action.",

  parameters: z.object({
    leadId: z
      .string()
      .min(1)
      .describe("The MongoDB ID of the lead whose analysis should be retrieved"),
  }),

  async execute({ leadId }, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    const analysis = await getLeadAnalysis(leadId);

    if (!analysis) {
      return {
        success: false,
        error: "No analysis exists for this lead.",
      };
    }

    return {
      success: true,

      analysis: {
        leadId:
          analysis.lead?._id?.toString() ??
          analysis.lead?.toString(),

        score: analysis.score,
        qualification: analysis.qualification,
        reasoning: analysis.reasoning,
        strengths: analysis.strengths,
        concerns: analysis.concerns,
        recommendedAction: analysis.recommendedAction,
        analyzedAt: analysis.analyzedAt,
        model: analysis.model,
      },
    };
  },
});