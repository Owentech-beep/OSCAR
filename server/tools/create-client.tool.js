import { tool } from "@openai/agents";
import { z } from "zod";

import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const createClientTool = tool({
  name: "create_client",

  description:
    "Prepare creation of a new client in OSCAR's CRM. Never create the client immediately. Explicit user confirmation is required.",

  parameters: z.object({
    companyName: z.string().min(1).max(200),

    contactName: z.string().max(200).optional(),

    email: z.string().email().optional(),

    phone: z.string().max(100).optional(),

    website: z.string().max(500).optional(),

    industry: z.string().max(200).optional(),

    location: z.string().max(300).optional(),

    status: z
      .enum(["Active", "Inactive", "Onboarding", "Completed"])
      .default("Active"),

    notes: z.string().max(5000).optional(),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const confirmation = createConfirmation({
      userId: auth.userId,

      action: "create_client",

      description: `Create client "${input.companyName}"?`,

      payload: {
        companyName: input.companyName,
        contactName: input.contactName || "",
        email: input.email || "",
        phone: input.phone || "",
        website: input.website || "",
        industry: input.industry || "",
        location: input.location || "",
        status: input.status,
        notes: input.notes || "",
        assignedTo: auth.userId,
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
          companyName: input.companyName,
          contactName: input.contactName || "",
          email: input.email || "",
          status: input.status,
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
