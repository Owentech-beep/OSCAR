import Lead from "../models/Lead.js";
import LeadAnalysis from "../models/LeadAnalysis.js";

import { run } from "@openai/agents";
import leadQualificationAgent from "../agents/lead-qualification.agent.js";
import { env } from "../config/env.js";
import { aiConfig } from "../config/ai.js";

export const getLeadAnalysis = async (leadId) => {
  const analysis = await LeadAnalysis.findOne({
    lead: leadId,
  }).populate("lead");

  return analysis;
};

export const getLeadForAnalysis = async (leadId) => {
  const lead = await Lead.findById(leadId).lean();

  if (!lead) {
    return null;
  }

  return {
    id: lead._id.toString(),
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    industry: lead.industry,
    location: lead.location,
    source: lead.source,
    status: lead.status,
    leadScore: lead.leadScore,
    notes: lead.notes,
  };
};

export const analyzeLead = async (leadId) => {
  const lead = await getLeadForAnalysis(leadId);

  if (!lead) {
    return null;
  }

  if (!env.OPENAI_API_KEY) {
    const error = new Error(
      "OSCAR AI is not configured. Please add OPENAI_API_KEY.",
    );
    error.statusCode = 503;
    throw error;
  }

  const result = await run(leadQualificationAgent, JSON.stringify(lead));

  const analysis = await LeadAnalysis.findOneAndUpdate(
    { lead: leadId },
    {
      lead: leadId,
      score: result.finalOutput.score,
      qualification: result.finalOutput.qualification,
      reasoning: result.finalOutput.reasoning,
      strengths: result.finalOutput.strengths,
      concerns: result.finalOutput.concerns,
      recommendedAction: result.finalOutput.recommendedAction,
      analyzedAt: new Date(),
     model: aiConfig.model,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  );

  return analysis;
};
