import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const deleteClientTool = tool({
  name: "delete_client",

  description:
    "Prepare deletion of an existing client from OSCAR's CRM. Never delete the client immediately. Explicit user confirmation is required.",

  parameters: z.object({
    clientId: z.string().min(1),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const confirmation = createConfirmation({
      userId: auth.userId,
      action: "delete_client",
      description: `Delete client "${input.clientId}"? This action cannot be undone.`,
      payload: {
        clientId: input.clientId,
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
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
