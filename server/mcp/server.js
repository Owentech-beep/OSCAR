import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { authorizeMcpTool } from "./tool-authorization.js";
import { getOscarBusinessContext } from "../services/oscar-context.service.js";
import { createConfirmation } from "../services/confirmation.service.js";
import { getActionPolicy } from "../services/action-policy.service.js";
import {
  getBusinessMetrics,
  getRevenue,
  generateBusinessReport,
} from "../services/analytics.service.js";
import { getClients } from "../services/client.service.js";
import { getLeads } from "../services/lead.service.js";
import { getProjects } from "../services/project.service.js";
import { getTasks } from "../services/task.service.js";
import { getMeetings } from "../services/meeting.service.js";
import {
  getConfirmation,
  consumeConfirmation,
} from "../services/confirmation.service.js";
import { executeConfirmedAction } from "../services/confirmed-action.service.js";

function success(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          data,
        }),
      },
    ],
  };
}

function failure(error) {
  console.error("MCP tool error:", error);

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: false,
          error: error.message || "Tool execution failed.",
        }),
      },
    ],
  };
}

export function createMcpServer(principal) {
  const server = new McpServer({
    name: "OSCAR MCP",
    version: "1.0.0",
  });

  if (!principal) {
    throw new Error("MCP principal is required.");
  }

  function authorize(action) {
    authorizeMcpTool(principal, action);
  }

  server.tool(
    "get_business_context",
    "Get OSCAR's current business context from real database data.",
    {},
    async () => {
      try {
        authorize("get_business_context");

        const business = await getOscarBusinessContext();

        return success(business);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_business_metrics",
    "Get stored business metrics.",
    {
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ from, to, limit }) => {
      try {
        authorize("get_business_metrics");

        const data = await getBusinessMetrics({ from, to, limit });
        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_revenue",
    "Get revenue data for a selected period.",
    {
      from: z.string().optional(),
      to: z.string().optional(),
    },
    async ({ from, to }) => {
      try {
        authorize("get_revenue");
        const data = await getRevenue({ from, to });
        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "generate_business_report",
    "Generate a business report using real database data.",
    {
      from: z.string().optional(),
      to: z.string().optional(),
    },
    async ({ from, to }) => {
      try {
        authorize("generate_business_report");
        const data = await generateBusinessReport({ from, to });
        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_clients",
    "Get clients from the OSCAR CRM.",
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      status: z
        .enum(["Active", "Inactive", "Onboarding", "Completed"])
        .optional(),
    },
    async ({ page, limit, search, status }) => {
      try {
        authorize("get_clients");
        const data = await getClients({
          page,
          limit,
          search,
          status,
        });

        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_leads",
    "Get leads from the OSCAR CRM.",
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      sort: z.enum(["newest", "oldest", "score-high", "score-low"]).optional(),
    },
    async ({ page, limit, search, status, sort }) => {
      try {
        authorize("get_leads");
        const data = await getLeads({
          page,
          limit,
          search,
          status,
          sort,
        });

        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "create_lead",
    "Create a new CRM lead. This action requires user confirmation before execution.",
    {
      companyName: z.string().trim().min(1).max(200),
      contactName: z.string().trim().max(200).optional(),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().max(50).optional(),
      website: z.string().trim().url().optional(),
      industry: z.string().trim().max(100).optional(),
      location: z.string().trim().max(200).optional(),
      source: z.string().trim().max(100).optional(),
      leadScore: z.number().min(0).max(100).optional(),
      status: z
        .enum([
          "New",
          "Researching",
          "Qualified",
          "Contacted",
          "Interested",
          "Meeting",
          "Proposal",
          "Won",
          "Lost",
          "No Response",
        ])
        .optional(),
      notes: z.string().trim().max(5000).optional(),
      lastContact: z.string().datetime().optional(),
      nextFollowUp: z.string().datetime().optional(),
      assignedTo: z.string().optional(),
    },
    async (input) => {
      try {
        authorize("create_lead");

        const policy = getActionPolicy("create_lead");

        if (!policy.requiresConfirmation) {
          throw new Error("create_lead must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "create_lead",
          description: `Create lead for ${input.companyName}.`,
          payload: input,
        });

        return success({
          requiresConfirmation: true,
          confirmationId: confirmation.confirmationId,
          action: confirmation.action,
          description: confirmation.description,
          expiresAt: confirmation.expiresAt,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "confirm_action",
    "Confirm and execute a previously approved OSCAR action.",
    {
      confirmationId: z.string().uuid(),
    },
    async ({ confirmationId }) => {
      try {
        const confirmation = getConfirmation(confirmationId);

        if (!confirmation) {
          return failure(new Error("Confirmation not found or expired."));
        }

        if (confirmation.userId !== principal.userId) {
          return failure(
            new Error("You are not authorized to use this confirmation."),
          );
        }

        authorize(confirmation.action);

        const consumedConfirmation = consumeConfirmation(
          confirmationId,
          principal.userId,
        );

        if (!consumedConfirmation) {
          return failure(
            new Error("Confirmation not found, expired, or already used."),
          );
        }

        const result = await executeConfirmedAction(consumedConfirmation, {
          userId: principal.userId,
          role: principal.role,
          req: undefined,
        });

        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_projects",
    "Get projects from the OSCAR CRM.",
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      client: z.string().optional(),
    },
    async ({ page, limit, search, status, client }) => {
      try {
        authorize("get_projects");
        const data = await getProjects({
          page,
          limit,
          search,
          status,
          client,
        });

        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_tasks",
    "Get tasks from the OSCAR task system.",
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      project: z.string().optional(),
      client: z.string().optional(),
    },
    async ({ page, limit, search, status, priority, project, client }) => {
      try {
        authorize("get_tasks");
        const data = await getTasks({
          page,
          limit,
          search,
          status,
          priority,
          project,
          client,
        });

        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_calendar_events",
    "Get calendar meetings from the OSCAR calendar.",
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      meetingType: z.string().optional(),
      client: z.string().optional(),
      project: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    },
    async ({
      page,
      limit,
      search,
      status,
      meetingType,
      client,
      project,
      from,
      to,
    }) => {
      try {
        authorize("get_calendar_events");
        const data = await getMeetings({
          page,
          limit,
          search,
          status,
          meetingType,
          client,
          project,
          from,
          to,
        });

        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
