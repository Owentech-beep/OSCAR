import { tool } from "@openai/agents";
import { z } from "zod";

import { requireToolContext } from "./tool-context.js";
import { getTasks } from "../services/task.service.js";

export const getTasksTool = tool({
  name: "get_tasks",

  description:
    "Retrieve real tasks from OSCAR's task management system. Use this when the user asks about tasks, outstanding work, task status, priorities, deadlines, or assigned work.",

  parameters: z.object({
    search: z
      .string()
      .optional()
      .describe("Search by task title or description."),

    status: z
      .enum([
        "Todo",
        "In Progress",
        "Review",
        "Completed",
        "Blocked",
      ])
      .optional(),

    priority: z
      .enum([
        "Low",
        "Medium",
        "High",
        "Urgent",
      ])
      .optional(),

    project: z
      .string()
      .optional()
      .describe("Filter tasks by project ID."),

    client: z
      .string()
      .optional()
      .describe("Filter tasks by client ID."),

    page: z.number().int().min(1).default(1),

    limit: z.number().int().min(1).max(100).default(20),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    try {
      const result = await getTasks({
        page: input.page,
        limit: input.limit,
        search: input.search || "",
        status: input.status || "",
        priority: input.priority || "",
        project: input.project || "",
        client: input.client || "",
      });

      return {
        success: true,

        data: {
          tasks: result.tasks.map((task) => ({
            id: task._id.toString(),

            title: task.title,

            description: task.description || "",

            project: task.project
              ? {
                  id: task.project._id.toString(),
                  name: task.project.name,
                }
              : null,

            client: task.client
              ? {
                  id: task.client._id.toString(),
                  companyName: task.client.companyName,
                }
              : null,

            status: task.status,

            priority: task.priority,

            assignedTo: task.assignedTo
              ? {
                  id: task.assignedTo._id.toString(),
                  name: task.assignedTo.name,
                }
              : null,

            dueDate: task.dueDate || null,

            completedAt: task.completedAt || null,

            notes: task.notes || "",
          })),

          pagination: result.pagination,
        },
      };
    } catch (error) {
      console.error("get_tasks tool error:", error);

      return {
        success: false,
        error: "Unable to retrieve tasks.",
      };
    }
  },
});