import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const updateClientTool = tool({
  name: "update_client",

  description:
    "Prepare an update to an existing client in OSCAR's CRM. Never update the client immediately. Explicit user confirmation is required.",

  parameters: z.object({
    clientId: z.string().min(1),

    companyName: z.string().min(1).max(200).optional(),
    contactName: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(100).optional(),
    website: z.string().max(500).optional(),
    industry: z.string().max(200).optional(),
    location: z.string().max(300).optional(),

    status: z
      .enum(["Active", "Inactive", "Onboarding", "Completed"])
      .optional(),

    notes: z.string().max(5000).optional(),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const updates = {};

    for (const [key, value] of Object.entries(input)) {
      if (key !== "clientId" && value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: "At least one client field must be provided for update.",
      };
    }

    const confirmation = createConfirmation({
      userId: auth.userId,

      action: "update_client",

      description: `Update client "${input.clientId}"?`,

      payload: {
        clientId: input.clientId,
        updates,
      },
    });

    return {
      success: true,
      requiresConfirmation: true,

      confirmation: {
        id: confirmation.confirmationId,
        action: confirmation.action,
        message: confirmation.description,

        details: {
          clientId: input.clientId,
          changes: updates,
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
