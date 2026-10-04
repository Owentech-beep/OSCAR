import { tool } from "@openai/agents";
import { z } from "zod";
import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const createProjectTool = tool({
  name: "create_project",

  description:
    "Prepare creation of a new project in OSCAR's agency CRM. Never create the project immediately. Explicit user confirmation is required.",

  parameters: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    client: z.string().min(1),
    status: z
      .enum(["Planning", "Active", "On Hold", "Completed", "Cancelled"])
      .default("Planning"),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
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

    const confirmation = createConfirmation({
      userId: auth.userId,
      action: "create_project",
      description: `Create project "${input.name}"?`,
      payload: {
        name: input.name,
        description: input.description || "",
        client: input.client,
        status: input.status,
        priority: input.priority,
        startDate: input.startDate || undefined,
        dueDate: input.dueDate || undefined,
        budget: input.budget,
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
          project: input.name,
          client: input.client,
          status: input.status,
          priority: input.priority,
          budget: input.budget,
        },

        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
