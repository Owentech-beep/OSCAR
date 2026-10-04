import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const deleteProjectTool = tool({
  name: "delete_project",

  description:
    "Prepare deletion of an existing project from OSCAR's agency CRM. Never delete the project immediately. Explicit user confirmation is required.",

  parameters: z.object({
    projectId: z.string().min(1),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const confirmation = createConfirmation({
      userId: auth.userId,
      action: "delete_project",
      description: `Delete project "${input.projectId}"? This action cannot be undone.`,
      payload: {
        projectId: input.projectId,
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
          projectId: input.projectId,
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
