import Lead from "../models/Lead.js";
import { getWebsiteAudit } from "./website-audit.service.js";
import { createEmailDraft } from "./email.service.js";
import { run } from "@openai/agents";
import emailGenerationAgent from "../agents/email-generation.agent.js";
import { env } from "../config/env.js";
import { aiConfig } from "../config/ai.js";

export async function generateLeadEmail(leadId, objective) {
  const lead = await Lead.findById(leadId).lean();

  if (!lead) {
    return null;
  }

  if (!lead.email) {
    const error = new Error(
      "This lead does not have an email address."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!env.OPENAI_API_KEY) {
    const error = new Error(
      "OSCAR AI is not configured. Please add OPENAI_API_KEY."
    );

    error.statusCode = 503;
    throw error;
  }

  const websiteAudit = await getWebsiteAudit(leadId);

  const outreachObjective =
    objective ||
    "Start a professional business conversation with this lead.";

  const input = JSON.stringify({
    lead: {
      companyName: lead.companyName,
      contactName: lead.contactName,
      email: lead.email,
      industry: lead.industry,
      location: lead.location,
      notes: lead.notes,
      status: lead.status,
      leadScore: lead.leadScore,
    },

    websiteAnalysis: websiteAudit?.analysis ?? null,

    objective: outreachObjective,
  });

  const result = await run(
    emailGenerationAgent,
    input
  );

  const draft = await createEmailDraft({
    leadId: lead._id,
    to: lead.email,
    subject: result.finalOutput.subject,
    body: result.finalOutput.body,
    metadata: {
      generatedBy: "OSCAR",
      model: aiConfig.model,
      objective: outreachObjective,
    },
  });

  return {
    id: draft._id.toString(),
    leadId: lead._id.toString(),
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
    status: draft.status,
    generatedAt: draft.createdAt,
    model: aiConfig.model,
  };
}