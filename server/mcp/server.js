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
  getEmailStatistics,
} from "../services/analytics.service.js";
import { getClients } from "../services/client.service.js";
import { getLeads } from "../services/lead.service.js";
import { getProjects } from "../services/project.service.js";
import { getTasks } from "../services/task.service.js";
import { getMeetings } from "../services/meeting.service.js";
import { getInvoices } from "../services/invoice.service.js";
import {
  getConfirmation,
  consumeConfirmation,
} from "../services/confirmation.service.js";
import { executeConfirmedAction } from "../services/confirmed-action.service.js";
import { getLeadAnalysis } from "../services/lead-analysis.service.js";
import { analyzeLead } from "../services/lead-analysis.service.js";
import { getClientById } from "../services/client.service.js";
import { generateLeadEmail } from "../services/email-generation.service.js";
import { createEmailDraft, getEmailById } from "../services/email.service.js";
import {
  createWebsiteAudit,
  getWebsiteAudit,
} from "../services/website-audit.service.js";
import { saveMemory, searchMemory } from "../services/memory.service.js";

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
    "get_client",
    "Retrieve a single CRM client by ID.",
    {
      clientId: z.string().min(1),
    },
    async ({ clientId }) => {
      try {
        authorize("get_client");

        const client = await getClientById(clientId);

        if (!client) {
          return success({
            client: null,
            message: "Client not found.",
          });
        }

        return success({
          client,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_invoices",
    "Get invoices from the OSCAR financial system.",
    {
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      clientId: z.string().min(1).optional(),
      status: z
        .enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled"])
        .optional(),
      search: z.string().optional(),
    },
    async ({ page, limit, clientId, status, search }) => {
      try {
        authorize("get_invoices");

        const data = await getInvoices({
          page,
          limit,
          clientId,
          status,
          search,
        });

        return success(data);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "create_invoice",
    "Create a new invoice. This action requires user confirmation before execution.",
    {
      invoiceNumber: z.string().trim().min(1).max(50),
      clientId: z.string().min(1),

      issueDate: z.string().datetime().optional(),

      dueDate: z.string().datetime(),

      items: z
        .array(
          z.object({
            description: z.string().trim().min(1).max(500),
            quantity: z.number().positive(),
            unitPrice: z.number().min(0),
          }),
        )
        .min(1),

      taxRate: z.number().min(0).max(100).optional(),

      currency: z.string().trim().length(3).toUpperCase().optional(),

      status: z.enum(["Draft", "Sent"]).optional(),

      notes: z.string().trim().max(2000).optional(),
    },

    async (input) => {
      try {
        authorize("create_invoice");

        const policy = getActionPolicy("create_invoice");

        if (!policy.requiresConfirmation) {
          throw new Error("create_invoice must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "create_invoice",
          description: `Create invoice ${input.invoiceNumber}.`,
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
    "update_invoice",
    "Update an existing invoice. This action requires user confirmation before execution.",
    {
      invoiceId: z.string().min(1),

      invoiceNumber: z.string().trim().min(1).max(50).optional(),

      issueDate: z.string().datetime().optional(),

      dueDate: z.string().datetime().optional(),

      items: z
        .array(
          z.object({
            description: z.string().trim().min(1).max(500),
            quantity: z.number().positive(),
            unitPrice: z.number().min(0),
          }),
        )
        .min(1)
        .optional(),

      taxRate: z.number().min(0).max(100).optional(),

      currency: z.string().trim().length(3).toUpperCase().optional(),

      notes: z.string().trim().max(2000).optional(),
    },

    async ({ invoiceId, ...updates }) => {
      try {
        authorize("update_invoice");

        const policy = getActionPolicy("update_invoice");

        if (!policy.requiresConfirmation) {
          throw new Error("update_invoice must require confirmation.");
        }

        const hasUpdates = Object.values(updates).some(
          (value) => value !== undefined,
        );

        if (!hasUpdates) {
          throw new Error("At least one invoice field must be provided.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "update_invoice",
          description: `Update invoice ${invoiceId}.`,
          payload: {
            invoiceId,
            updates,
          },
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
    "mark_invoice_sent",
    "Mark an invoice as sent. This action requires user confirmation before execution.",
    {
      invoiceId: z.string().min(1),
    },
    async ({ invoiceId }) => {
      try {
        authorize("mark_invoice_sent");

        const policy = getActionPolicy("mark_invoice_sent");

        if (!policy.requiresConfirmation) {
          throw new Error("mark_invoice_sent must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "mark_invoice_sent",
          description: `Mark invoice ${invoiceId} as sent.`,
          payload: {
            invoiceId,
          },
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
    "mark_invoice_paid",
    "Mark an invoice as paid. This action requires user confirmation before execution.",
    {
      invoiceId: z.string().min(1),
    },
    async ({ invoiceId }) => {
      try {
        authorize("mark_invoice_paid");

        const policy = getActionPolicy("mark_invoice_paid");

        if (!policy.requiresConfirmation) {
          throw new Error("mark_invoice_paid must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "mark_invoice_paid",
          description: `Mark invoice ${invoiceId} as paid.`,
          payload: {
            invoiceId,
          },
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
    "cancel_invoice",
    "Cancel an invoice. This is a destructive action and requires user confirmation before execution.",
    {
      invoiceId: z.string().min(1),
    },
    async ({ invoiceId }) => {
      try {
        authorize("cancel_invoice");

        const policy = getActionPolicy("cancel_invoice");

        if (!policy.requiresConfirmation) {
          throw new Error("cancel_invoice must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "cancel_invoice",
          description: `Cancel invoice ${invoiceId}.`,
          payload: {
            invoiceId,
          },
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
    "create_client",
    "Create a new CRM client. This action requires user confirmation before execution.",
    {
      companyName: z.string().trim().min(1).max(200),
      contactName: z.string().trim().max(200).optional(),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().max(50).optional(),
      website: z.string().trim().url().optional(),
      industry: z.string().trim().max(100).optional(),
      location: z.string().trim().max(200).optional(),
      status: z
        .enum(["Active", "Inactive", "Onboarding", "Completed"])
        .optional(),
      notes: z.string().trim().max(5000).optional(),
      assignedTo: z.string().optional(),
    },
    async (input) => {
      try {
        authorize("create_client");

        const policy = getActionPolicy("create_client");

        if (!policy.requiresConfirmation) {
          throw new Error("create_client must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "create_client",
          description: `Create client for ${input.companyName}.`,
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
    "update_client",
    "Update an existing CRM client. This action requires user confirmation before execution.",
    {
      clientId: z.string().min(1),

      companyName: z.string().trim().min(1).max(200).optional(),
      contactName: z.string().trim().max(200).optional(),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().max(50).optional(),
      website: z.string().trim().url().optional(),
      industry: z.string().trim().max(100).optional(),
      location: z.string().trim().max(200).optional(),

      status: z
        .enum(["Active", "Inactive", "Onboarding", "Completed"])
        .optional(),

      notes: z.string().trim().max(5000).optional(),
      assignedTo: z.string().optional(),
    },

    async ({ clientId, ...updates }) => {
      try {
        authorize("update_client");

        const policy = getActionPolicy("update_client");

        if (!policy.requiresConfirmation) {
          throw new Error("update_client must require confirmation.");
        }

        const hasUpdates = Object.values(updates).some(
          (value) => value !== undefined,
        );

        if (!hasUpdates) {
          throw new Error("At least one client field must be provided.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "update_client",
          description: `Update client ${clientId}.`,
          payload: {
            clientId,
            updates,
          },
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
    "search_leads",
    "Search and filter CRM leads using company, contact, email, industry, status, and sorting criteria.",
    {
      search: z.string().trim().optional(),
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
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      sort: z
        .enum(["newest", "oldest", "score-high", "score-low"])
        .default("newest"),
    },
    async ({
      search = "",
      status = "",
      page = 1,
      limit = 10,
      sort = "newest",
    }) => {
      try {
        authorize("search_leads");

        const result = await getLeads({
          search,
          status,
          page,
          limit,
          sort,
        });

        return success({
          leads: result.leads,
          pagination: result.pagination,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_lead_analysis",
    "Retrieve the existing AI qualification analysis for a CRM lead.",
    {
      leadId: z.string().min(1),
    },
    async ({ leadId }) => {
      try {
        authorize("get_lead_analysis");

        const analysis = await getLeadAnalysis(leadId);

        if (!analysis) {
          return success({
            analysis: null,
            message: "No analysis exists for this lead.",
          });
        }

        return success({
          analysis,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "analyze_lead",
    "Run OSCAR's AI qualification analysis for a CRM lead and store the resulting analysis.",
    {
      leadId: z.string().min(1),
    },
    async ({ leadId }) => {
      try {
        authorize("analyze_lead");

        const policy = getActionPolicy("analyze_lead");

        if (policy.requiresConfirmation) {
          throw new Error(
            "analyze_lead confirmation policy is not supported by this tool.",
          );
        }

        const analysis = await analyzeLead(leadId);

        if (!analysis) {
          throw new Error("Lead not found.");
        }

        return success({
          analysis,
        });
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
    "update_lead",
    "Update an existing CRM lead. This action requires user confirmation before execution.",
    {
      leadId: z.string().min(1),

      companyName: z.string().trim().min(1).max(200).optional(),
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
    async ({ leadId, ...updates }) => {
      try {
        authorize("update_lead");

        if (Object.keys(updates).length === 0) {
          throw new Error(
            "At least one lead field must be provided for update.",
          );
        }

        const policy = getActionPolicy("update_lead");

        if (!policy.requiresConfirmation) {
          throw new Error("update_lead must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "update_lead",
          description: `Update lead ${leadId}.`,
          payload: {
            leadId,
            ...updates,
          },
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
    "delete_lead",
    "Permanently delete a CRM lead. This destructive action requires explicit user confirmation.",
    {
      leadId: z.string().min(1),
    },
    async ({ leadId }) => {
      try {
        authorize("delete_lead");

        const policy = getActionPolicy("delete_lead");

        if (!policy.requiresConfirmation || !policy.destructive) {
          throw new Error(
            "delete_lead must require confirmation and be marked destructive.",
          );
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "delete_lead",
          description: `Permanently delete lead ${leadId}.`,
          payload: {
            leadId,
          },
        });

        return success({
          requiresConfirmation: true,
          destructive: true,
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
          active: principal.active,
          req: undefined,
        });

        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "create_project",
    "Create a new project. This action requires explicit user confirmation before execution.",
    {
      name: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).optional(),
      client: z.string().trim().min(1),
      status: z
        .enum(["Planning", "Active", "On Hold", "Completed", "Cancelled"])
        .optional(),
      priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
      startDate: z.string().datetime().optional(),
      dueDate: z.string().datetime().optional(),
      budget: z.number().min(0).optional(),
      assignedTo: z.string().trim().min(1).optional(),
      notes: z.string().trim().max(5000).optional(),
    },
    async (input) => {
      try {
        authorize("create_project");

        const policy = getActionPolicy("create_project");

        if (!policy.requiresConfirmation) {
          throw new Error("create_project must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "create_project",
          description: `Create project "${input.name}"?`,
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
    "update_project",
    "Update an existing project. This action requires explicit user confirmation before execution.",
    {
      projectId: z.string().trim().min(1),

      name: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(5000).optional(),
      client: z.string().trim().min(1).optional(),
      status: z
        .enum(["Planning", "Active", "On Hold", "Completed", "Cancelled"])
        .optional(),
      priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
      startDate: z.string().datetime().optional(),
      dueDate: z.string().datetime().optional(),
      budget: z.number().min(0).optional(),
      assignedTo: z.string().trim().min(1).optional(),
      notes: z.string().trim().max(5000).optional(),
    },
    async ({ projectId, ...updates }) => {
      try {
        authorize("update_project");

        const policy = getActionPolicy("update_project");

        if (!policy.requiresConfirmation) {
          throw new Error("update_project must require confirmation.");
        }

        const hasUpdates = Object.values(updates).some(
          (value) => value !== undefined,
        );

        if (!hasUpdates) {
          throw new Error("At least one project field must be provided.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "update_project",
          description: `Update project ${projectId}?`,
          payload: {
            projectId,
            updates,
          },
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
    "delete_project",
    "Delete an existing project. This is a destructive action and requires explicit user confirmation before execution.",
    {
      projectId: z.string().trim().min(1),
    },
    async ({ projectId }) => {
      try {
        authorize("delete_project");

        const policy = getActionPolicy("delete_project");

        if (!policy.requiresConfirmation) {
          throw new Error("delete_project must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "delete_project",
          description: `Delete project ${projectId}?`,
          payload: {
            projectId,
          },
        });

        return success({
          requiresConfirmation: true,
          destructive: policy.destructive === true,
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
    "create_task",
    "Create a new task. The task client is derived automatically from its project. This action requires explicit user confirmation.",
    {
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).optional(),
      project: z.string().trim().min(1),
      status: z
        .enum(["Todo", "In Progress", "Review", "Completed", "Blocked"])
        .optional(),
      priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
      assignedTo: z.string().trim().min(1).optional(),
      dueDate: z.string().datetime().optional(),
      completedAt: z.string().datetime().optional(),
      notes: z.string().trim().max(5000).optional(),
    },
    async (input) => {
      try {
        authorize("create_task");

        const policy = getActionPolicy("create_task");

        if (!policy.requiresConfirmation) {
          throw new Error("create_task must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "create_task",
          description: `Create task "${input.title}"?`,
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
    "update_task",
    "Update an existing task. The task client remains derived from its project. This action requires explicit user confirmation.",
    {
      taskId: z.string().trim().min(1),

      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(5000).optional(),
      project: z.string().trim().min(1).optional(),
      status: z
        .enum(["Todo", "In Progress", "Review", "Completed", "Blocked"])
        .optional(),
      priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
      assignedTo: z.string().trim().min(1).optional(),
      dueDate: z.string().datetime().optional(),
      completedAt: z.string().datetime().optional(),
      notes: z.string().trim().max(5000).optional(),
    },
    async ({ taskId, ...updates }) => {
      try {
        authorize("update_task");

        const policy = getActionPolicy("update_task");

        if (!policy.requiresConfirmation) {
          throw new Error("update_task must require confirmation.");
        }

        const hasUpdates = Object.values(updates).some(
          (value) => value !== undefined,
        );

        if (!hasUpdates) {
          throw new Error("At least one task field must be provided.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "update_task",
          description: `Update task ${taskId}?`,
          payload: {
            taskId,
            updates,
          },
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
    "delete_task",
    "Delete an existing task. This is a destructive action and requires explicit user confirmation.",
    {
      taskId: z.string().trim().min(1),
    },
    async ({ taskId }) => {
      try {
        authorize("delete_task");

        const policy = getActionPolicy("delete_task");

        if (!policy.requiresConfirmation) {
          throw new Error("delete_task must require confirmation.");
        }

        const confirmation = createConfirmation({
          userId: principal.userId,
          action: "delete_task",
          description: `Delete task ${taskId}?`,
          payload: {
            taskId,
          },
        });

        return success({
          requiresConfirmation: true,
          destructive: policy.destructive === true,
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
    "generate_email",
    "Generate a personalized outreach email for a lead using OSCAR's email generation service.",
    {
      leadId: z.string().min(1),
      objective: z.string().max(1000).optional(),
    },
    async ({ leadId, objective }) => {
      try {
        authorize("generate_email");

        const result = await generateLeadEmail(leadId, objective);

        if (!result) {
          throw new Error("Lead not found.");
        }

        return success(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "create_email_draft",
    "Create an email draft without sending it.",
    {
      leadId: z.string().optional(),
      to: z.string().email(),
      subject: z.string().min(1).max(500),
      body: z.string().min(1).max(20000),
      metadata: z.record(z.string(), z.any()).optional(),
    },
    async (input) => {
      try {
        authorize("create_email_draft");

        const draft = await createEmailDraft(input);

        return success({
          id: draft._id.toString(),
          leadId: draft.lead?.toString() ?? null,
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
          status: draft.status,
          createdAt: draft.createdAt,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "send_email",
    "Request confirmation to send an existing email draft. Sending is a consequential external action.",
    {
      emailId: z.string().min(1),
    },
    async ({ emailId }) => {
      try {
        authorize("send_email");

        const email = await getEmailById(emailId);

        if (!email) {
          throw new Error("Email draft not found.");
        }

        if (email.status !== "draft") {
          throw new Error(
            `Email cannot be sent because its status is "${email.status}".`,
          );
        }

        const confirmation = await createConfirmation({
          userId: principal.userId,
          action: "send_email",
          payload: {
            emailId,
          },
          resource: "Email",
          resourceId: emailId,
          destructive: false,
        });

        return success({
          requiresConfirmation: true,
          confirmation,
          email: {
            id: email._id.toString(),
            to: email.to,
            subject: email.subject,
            status: email.status,
          },
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "schedule_email",
    "Schedule an existing email draft to be sent at a future date and time. Requires confirmation.",
    {
      emailId: z.string().min(1),
      scheduledAt: z.string().datetime(),
    },
    async ({ emailId, scheduledAt }) => {
      try {
        authorize("schedule_email");

        const email = await getEmailById(emailId);

        if (!email) {
          throw new Error("Email draft not found.");
        }

        if (email.status !== "draft") {
          throw new Error(
            `Email cannot be scheduled because its status is "${email.status}".`,
          );
        }

        const scheduledDate = new Date(scheduledAt);

        if (scheduledDate <= new Date()) {
          throw new Error("Scheduled time must be in the future.");
        }

        const confirmation = await createConfirmation({
          userId: principal.userId,
          action: "schedule_email",
          payload: {
            emailId,
            scheduledAt,
          },
          resource: "Email",
          resourceId: emailId,
          destructive: false,
        });

        return success({
          requiresConfirmation: true,
          confirmation,
          email: {
            id: email._id.toString(),
            to: email.to,
            subject: email.subject,
            status: email.status,
            scheduledAt,
          },
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "create_calendar_event",
    "Create a calendar meeting. Requires confirmation before execution.",
    {
      title: z.string().min(1).max(200),
      description: z.string().max(5000).optional(),
      client: z.string().optional(),
      project: z.string().optional(),
      contactName: z.string().max(200).optional(),
      contactEmail: z.string().email().optional(),
      location: z.string().max(500).optional(),
      meetingType: z
        .enum([
          "Discovery",
          "Consultation",
          "Follow-up",
          "Client Meeting",
          "Internal",
          "Other",
        ])
        .optional(),
      status: z
        .enum(["Scheduled", "Completed", "Cancelled", "No Show"])
        .optional(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      notes: z.string().max(5000).optional(),
      assignedTo: z.string().optional(),
    },
    async (input) => {
      try {
        authorize("create_calendar_event");

        const confirmation = await createConfirmation({
          userId: principal.userId,
          action: "create_calendar_event",
          payload: input,
          resource: "Meeting",
          destructive: false,
        });

        return success({
          requiresConfirmation: true,
          confirmation,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "update_calendar_event",
    "Update an existing calendar meeting. Requires confirmation before execution.",
    {
      meetingId: z.string().min(1),

      title: z.string().min(1).max(200).optional(),
      description: z.string().max(5000).optional(),
      client: z.string().optional(),
      project: z.string().optional(),
      contactName: z.string().max(200).optional(),
      contactEmail: z.string().email().optional(),
      location: z.string().max(500).optional(),

      meetingType: z
        .enum([
          "Discovery",
          "Consultation",
          "Follow-up",
          "Client Meeting",
          "Internal",
          "Other",
        ])
        .optional(),

      status: z
        .enum(["Scheduled", "Completed", "Cancelled", "No Show"])
        .optional(),

      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),

      notes: z.string().max(5000).optional(),
      assignedTo: z.string().optional(),
    },
    async ({ meetingId, ...updates }) => {
      try {
        authorize("update_calendar_event");

        if (Object.keys(updates).length === 0) {
          throw new Error("At least one field must be provided for update.");
        }

        const confirmation = await createConfirmation({
          userId: principal.userId,
          action: "update_calendar_event",
          payload: {
            meetingId,
            ...updates,
          },
          resource: "Meeting",
          resourceId: meetingId,
          destructive: false,
        });

        return success({
          requiresConfirmation: true,
          confirmation,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_email_statistics",
    "Get email statistics from OSCAR's database.",
    {
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    },
    async ({ from, to }) => {
      try {
        authorize("get_email_statistics");

        const statistics = await getEmailStatistics({
          from,
          to,
        });

        return success(statistics);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "delete_calendar_event",
    "Delete a calendar meeting. This is a destructive action and requires confirmation.",
    {
      meetingId: z.string().min(1),
    },
    async ({ meetingId }) => {
      try {
        authorize("delete_calendar_event");

        const confirmation = await createConfirmation({
          userId: principal.userId,
          action: "delete_calendar_event",
          payload: {
            meetingId,
          },
          resource: "Meeting",
          resourceId: meetingId,
          destructive: true,
        });

        return success({
          requiresConfirmation: true,
          confirmation,
        });
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

  server.tool(
    "analyze_website",
    "Analyze a lead's website and store the resulting website audit.",
    {
      leadId: z.string().min(1),
    },
    async ({ leadId }) => {
      try {
        authorize("analyze_website");

        const audit = await createWebsiteAudit(leadId);

        if (!audit) {
          throw new Error("Lead not found.");
        }

        return success({
          id: audit._id.toString(),
          leadId: audit.lead.toString(),
          url: audit.url,
          status: audit.status,
          title: audit.title,
          analysis: audit.analysis ?? null,
          analyzedAt: audit.analyzedAt ?? null,
          model: audit.model ?? null,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "get_website_audit",
    "Retrieve the latest website audit for a lead.",
    {
      leadId: z.string().min(1),
    },
    async ({ leadId }) => {
      try {
        authorize("get_website_audit");

        const audit = await getWebsiteAudit(leadId);

        if (!audit) {
          throw new Error("No website audit found for this lead.");
        }

        return success({
          id: audit._id.toString(),
          leadId: audit.lead.toString(),
          url: audit.url,
          status: audit.status,
          title: audit.title,
          analysis: audit.analysis ?? null,
          analyzedAt: audit.analyzedAt ?? null,
          model: audit.model ?? null,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "search_memory",
    "Search OSCAR's persistent memory for information relevant to the authenticated user.",
    {
      query: z.string().max(1000).optional(),
      type: z
        .enum(["business", "client", "lead", "preference", "long_term"])
        .optional(),
      clientId: z.string().optional(),
      leadId: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    async (input) => {
      try {
        authorize("search_memory");

        const memories = await searchMemory({
          userId: principal.userId,
          ...input,
        });

        return success({
          count: memories.length,
          memories,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.tool(
    "save_memory",
    "Save a persistent memory for the authenticated user.",
    {
      type: z.enum(["business", "client", "lead", "preference", "long_term"]),
      content: z.string().min(1).max(5000),
      importance: z.number().min(0).max(1).optional(),
      clientId: z.string().optional(),
      leadId: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    },
    async (input) => {
      try {
        authorize("save_memory");

        const memory = await saveMemory({
          userId: principal.userId,
          source: "oscar",
          ...input,
        });

        return success({
          id: memory._id.toString(),
          type: memory.type,
          content: memory.content,
          importance: memory.importance,
          source: memory.source,
          clientId: memory.clientId?.toString() ?? null,
          leadId: memory.leadId?.toString() ?? null,
          createdAt: memory.createdAt,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
