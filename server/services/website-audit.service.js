import Lead from "../models/Lead.js";
import WebsiteAudit from "../models/WebsiteAudit.js";
import { fetchWebsiteContent } from "./website-analysis.service.js";
import websiteAnalysisAgent from "../agents/website-analysis.agent.js";
import { run } from "@openai/agents";
import { env } from "../config/env.js";
import { aiConfig } from "../config/ai.js";

export async function createWebsiteAudit(leadId) {
  const lead = await Lead.findById(leadId).lean();

  if (!lead) {
    return null;
  }

  if (!lead.website) {
    const error = new Error("This lead does not have a website.");
    error.statusCode = 400;
    throw error;
  }

  const website = await fetchWebsiteContent(lead.website);

  const audit = await WebsiteAudit.create({
    lead: lead._id,
    url: website.url,
    status: website.status,
    title: website.title,
    content: website.text,
  });

  if (!env.OPENAI_API_KEY) {
    const error = new Error(
      "OSCAR AI is not configured. Website content was collected, but AI analysis requires OPENAI_API_KEY."
    );

    error.statusCode = 503;
    error.auditId = audit._id.toString();

    throw error;
  }

  const analysisInput = JSON.stringify({
    url: website.url,
    title: website.title,
    content: website.text,
  });

  const result = await run(
    websiteAnalysisAgent,
    analysisInput
  );

  audit.analysis = result.finalOutput;
  audit.analyzedAt = new Date();
  audit.model = aiConfig.model;

  await audit.save();

  return audit;
}

export async function getWebsiteAudit(leadId) {
  return WebsiteAudit.findOne({
    lead: leadId,
  }).sort({ createdAt: -1 });
}