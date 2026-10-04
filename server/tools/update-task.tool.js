import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const updateTaskTool = tool({
  name: "update_task",

  description:
    "Prepare an update to an existing task in OSCAR's agency system. Never update the task immediately. Explicit user confirmation is required.",

  parameters: z.object({
    taskId: z.string().min(1),

    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    project: z.string().min(1).optional(),
    client: z.string().optional(),

    status: z
      .enum(["Todo", "In Progress", "Review", "Completed", "Blocked"])
      .optional(),

    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),

    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().max(5000).optional(),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const updates = {};

    for (const [key, value] of Object.entries(input)) {
      if (key !== "taskId" && value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: "At least one task field must be provided for update.",
      };
    }

    const confirmation = createConfirmation({
      userId: auth.userId,
      action: "update_task",
      description: `Update task "${input.taskId}"?`,
      payload: {
        taskId: input.taskId,
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
          taskId: input.taskId,
          changes: updates,
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
