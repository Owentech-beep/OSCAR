import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getOscarBusinessContext } from "../services/oscar-context.service.js";
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

export function createMcpServer() {
  const server = new McpServer({
    name: "OSCAR MCP",
    version: "1.0.0",
  });

  server.tool(
    "get_business_context",
    "Get OSCAR's current business context from real database data.",
    {},
    async () => {
      try {
        const business = await getOscarBusinessContext();
        return success(business);
      } catch (error) {
        return failure(error);
      }
    }
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
        const data = await getBusinessMetrics({ from, to, limit });
        return success(data);
      } catch (error) {
        return failure(error);
      }
    }
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
        const data = await getRevenue({ from, to });
        return success(data);
      } catch (error) {
        return failure(error);
      }
    }
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
        const data = await generateBusinessReport({ from, to });
        return success(data);
      } catch (error) {
        return failure(error);
      }
    }
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
    }
  );

  server.tool(
    "get_leads",
    "Get leads from the OSCAR CRM.",
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      sort: z
        .enum(["newest", "oldest", "score-high", "score-low"])
        .optional(),
    },
    async ({ page, limit, search, status, sort }) => {
      try {
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
    }
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
    }
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
    async ({
      page,
      limit,
      search,
      status,
      priority,
      project,
      client,
    }) => {
      try {
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
    }
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
    }
  );

  return server;
}
