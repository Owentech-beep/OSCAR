import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const deleteTaskTool = tool({
  name: "delete_task",

  description:
    "Prepare deletion of an existing task from OSCAR's agency system. Never delete the task immediately. Explicit user confirmation is required.",

  parameters: z.object({
    taskId: z.string().min(1),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const confirmation = createConfirmation({
      userId: auth.userId,
      action: "delete_task",
      description: `Delete task "${input.taskId}"? This action cannot be undone.`,
      payload: {
        taskId: input.taskId,
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
          taskId: input.taskId,
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
