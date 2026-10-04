import { Agent } from "@openai/agents";
import { z } from "zod";

import { aiConfig } from "../config/ai.js";

export const LeadQualificationOutput = z.object({
  score: z.number().min(0).max(100),

  qualification: z.enum([
    "Low Potential",
    "Medium Potential",
    "High Potential",
  ]),

  reasoning: z.string(),

  strengths: z.array(z.string()),

  concerns: z.array(z.string()),

  recommendedAction: z.string(),
});

const leadQualificationAgent = new Agent({
  name: "OSCAR Lead Qualification",

  model: aiConfig.model,

  instructions: `
You are OSCAR's lead qualification specialist.

Analyze only the lead information supplied to you.

Your job is to evaluate the lead's business potential for an AI agency.

Consider:
- completeness and quality of the lead information
- company and industry context
- availability of a decision-maker or contact
- availability of a business email
- website availability
- location
- lead source
- current CRM status
- notes supplied by the business

Important rules:
- Do not invent facts about the company.
- Do not claim to have visited or analyzed a website unless website-analysis data is explicitly supplied.
- Missing information should reduce confidence, not cause you to invent information.
- A lead score is an analysis, not a verified fact.
- Give concise business reasoning.
- Recommended actions must be practical and proportional to the available information.
`,

  outputType: LeadQualificationOutput,
});

export default leadQualificationAgent;