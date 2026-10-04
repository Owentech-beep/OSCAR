import { tool } from "@openai/agents";
import { z } from "zod";
import { createConfirmation } from "../services/confirmation.service.js";

export const deleteLeadTool = tool({
  name: "delete_lead",

  description:
    "Prepare deletion of an existing CRM lead. This is a destructive action and requires explicit user confirmation before deletion.",

  parameters: z.object({
    leadId: z
      .string()
      .min(1)
      .describe("The MongoDB ID of the lead to delete"),
  }),

  async execute({ leadId }, runContext) {
    const { userId } = runContext.context;

    if (!userId) {
      return {
        success: false,
        error: "Authenticated user context is missing.",
      };
    }

    const confirmation = createConfirmation({
      userId,
      action: "delete_lead",
      description: `Permanently delete lead ${leadId} from the CRM.`,
      payload: {
        leadId,
      },
    });

    return {
      success: true,
      requiresConfirmation: true,
      destructive: true,

      confirmation: {
        confirmationId: confirmation.confirmationId,
        action: confirmation.action,
        description: confirmation.description,
        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
