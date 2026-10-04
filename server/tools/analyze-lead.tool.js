import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { analyzeLead } from "../services/lead-analysis.service.js";

export const analyzeLeadTool = tool({
  name: "analyze_lead",

  description:
    "Analyze a lead using OSCAR's AI lead qualification system. The analysis is saved and returned as structured business intelligence.",

  parameters: z.object({
    leadId: z.string().describe("The MongoDB ID of the lead to analyze"),
  }),

  async execute({ leadId }, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    const analysis = await analyzeLead(leadId);

    if (!analysis) {
      return {
        success: false,
        error: "Lead not found",
      };
    }

    return {
      success: true,

      analysis: {
        leadId: analysis.lead?._id?.toString() ?? analysis.lead?.toString(),
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
