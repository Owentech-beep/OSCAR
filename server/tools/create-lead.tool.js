import { tool } from "@openai/agents";
import { z } from "zod";
import { createConfirmation } from "../services/confirmation.service.js";

export const createLeadTool = tool({
  name: "create_lead",

  description:
    "Prepare a new CRM lead for creation. This action requires user confirmation before the lead is actually saved.",

  parameters: z.object({
    companyName: z.string().min(1).max(200),
    contactName: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    website: z.string().max(500).optional(),
    industry: z.string().max(100).optional(),
    location: z.string().max(200).optional(),
    source: z.string().max(100).optional(),
    notes: z.string().max(5000).optional(),
  }),

  async execute(data, runContext) {
    const { userId } = runContext.context;

    if (!userId) {
      return {
        success: false,
        error: "Authenticated user context is missing.",
      };
    }

    const confirmation = createConfirmation({
      userId,
      action: "create_lead",
      description: `Create lead "${data.companyName}" in the CRM.`,
      payload: data,
    });

    return {
      success: true,
      requiresConfirmation: true,
      confirmation: {
        confirmationId: confirmation.confirmationId,
        action: confirmation.action,
        description: confirmation.description,
        expiresAt: confirmation.expiresAt,
      },
    };
  },
});