import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const updateProjectTool = tool({
  name: "update_project",

  description:
    "Prepare an update to an existing project in OSCAR's agency CRM. Never update the project immediately. Explicit user confirmation is required.",

  parameters: z.object({
    projectId: z.string().min(1),

    name: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    client: z.string().min(1).optional(),

    status: z
      .enum(["Planning", "Active", "On Hold", "Completed", "Cancelled"])
      .optional(),

    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),

    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    budget: z.number().min(0).optional(),
    notes: z.string().max(5000).optional(),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const updates = {};

    for (const [key, value] of Object.entries(input)) {
      if (key !== "projectId" && value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: "At least one project field must be provided for update.",
      };
    }

    const confirmation = createConfirmation({
      userId: auth.userId,

      action: "update_project",

      description: `Update project "${input.projectId}"?`,

      payload: {
        projectId: input.projectId,
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
          projectId: input.projectId,
          changes: updates,
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
