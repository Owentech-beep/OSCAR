import { tool } from "@openai/agents";
import { z } from "zod";
import { createConfirmation } from "../services/confirmation.service.js";

export const updateLeadTool = tool({
  name: "update_lead",

  description:
    "Prepare changes to an existing CRM lead. This action requires user confirmation before the changes are actually saved.",

  parameters: z.object({
    leadId: z.string().min(1),

    companyName: z.string().min(1).max(200).optional(),
    contactName: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    website: z.string().max(500).optional(),
    industry: z.string().max(100).optional(),
    location: z.string().max(200).optional(),
    source: z.string().max(100).optional(),

    status: z
      .enum([
        "New",
        "Researching",
        "Qualified",
        "Contacted",
        "Interested",
        "Meeting",
        "Proposal",
        "Won",
        "Lost",
        "No Response",
      ])
      .optional(),

    leadScore: z.number().min(0).max(100).optional(),
    notes: z.string().max(5000).optional(),
  }),

  async execute({ leadId, ...updates }, runContext) {
    const { userId } = runContext.context;

    if (!userId) {
      return {
        success: false,
        error: "Authenticated user context is missing.",
      };
    }

    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(cleanedUpdates).length === 0) {
      return {
        success: false,
        error: "No lead changes were provided.",
      };
    }

    const confirmation = createConfirmation({
      userId,
      action: "update_lead",
      description: `Update CRM lead ${leadId}.`,
      payload: {
        leadId,
        ...cleanedUpdates,
      },
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