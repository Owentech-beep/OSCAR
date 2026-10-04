import { tool } from "@openai/agents";
import { z } from "zod";

import { requireToolContext } from "./tool-context.js";
import { getProjects } from "../services/project.service.js";

export const getProjectsTool = tool({
  name: "get_projects",

  description:
    "Retrieve real projects from OSCAR's project management system. Use this when the user asks about projects, active projects, project records, or project status.",

  parameters: z.object({
    search: z
      .string()
      .optional()
      .describe(
        "Search by project name or description."
      ),

    status: z
      .enum([
        "Planning",
        "Active",
        "On Hold",
        "Completed",
        "Cancelled",
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

    client: z
      .string()
      .optional()
      .describe("Filter projects by client ID."),

    page: z.number().int().min(1).default(1),

    limit: z.number().int().min(1).max(100).default(20),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    try {
      const result = await getProjects({
        page: input.page,
        limit: input.limit,
        search: input.search || "",
        status: input.status || "",
        priority: input.priority || "",
        client: input.client || "",
      });

      return {
        success: true,

        data: {
          projects: result.projects.map((project) => ({
            id: project._id.toString(),

            name: project.name,

            description: project.description || "",

            client: project.client
              ? {
                  id: project.client._id.toString(),
                  companyName: project.client.companyName,
                  contactName:
                    project.client.contactName || "",
                }
              : null,

            status: project.status,

            priority: project.priority,

            startDate: project.startDate || null,

            dueDate: project.dueDate || null,

            budget: project.budget ?? 0,

            notes: project.notes || "",
          })),

          pagination: result.pagination,
        },
      };
    } catch (error) {
      console.error("get_projects tool error:", error);

      return {
        success: false,
        error: "Unable to retrieve projects.",
      };
    }
  },
});