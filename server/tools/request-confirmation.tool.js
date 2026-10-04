import { tool } from "@openai/agents";
import { z } from "zod";
import { createConfirmation } from "../services/confirmation.service.js";

export const requestConfirmationTool = tool({
  name: "request_confirmation",
  description:
    "Create a confirmation request before executing a sensitive or destructive action. Never execute the action directly.",

  parameters: z.object({
    action: z.string().min(1),
    description: z.string().min(1),
    payload: z.record(z.any()).default({}),
  }),

  async execute({ action, description, payload }, runContext) {
    const { userId } = runContext.context;

    if (!userId) {
      return {
        success: false,
        error: "Authenticated user context is missing.",
      };
    }

    const confirmation = createConfirmation({
      userId,
      action,
      description,
      payload,
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