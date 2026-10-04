import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const createTaskTool = tool({
  name: "create_task",

  description:
    "Prepare creation of a new task in OSCAR's agency system. Never create the task immediately. Explicit user confirmation is required.",

  parameters: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    project: z.string().min(1),
    client: z.string().optional(),

    status: z
      .enum(["Todo", "In Progress", "Review", "Completed", "Blocked"])
      .default("Todo"),

    priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),

    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().max(5000).optional(),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const confirmation = createConfirmation({
      userId: auth.userId,
      action: "create_task",
      description: `Create task "${input.title}"?`,
      payload: {
        title: input.title,
        description: input.description || "",
        project: input.project,
        client: input.client || undefined,
        status: input.status,
        priority: input.priority,
        assignedTo: input.assignedTo || auth.userId,
        dueDate: input.dueDate || undefined,
        notes: input.notes || "",
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
          task: input.title,
          project: input.project,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate,
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
