import { tool } from "@openai/agents";
import { z } from "zod";

import { requireToolContext } from "./tool-context.js";
import { User } from "../models/User.js";
import { assertCanPerformAction } from "../services/authorization.service.js";
import { getInvoices } from "../services/invoice.service.js";

export const getInvoicesTool = tool({
  name: "get_invoices",

  description:
    "Retrieve real invoices from OSCAR. Search by invoice number, " +
    "filter by client ID or stored status, and paginate results. " +
    "This tool only reads records. It does not create, change, or send invoices.",

  parameters: z.object({
    search: z
      .string()
      .max(100)
      .nullable()
      .describe("Invoice-number search text, or null for no search."),

    clientId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/)
      .nullable()
      .describe(
        "A client ID retrieved from OSCAR, or null for all clients. Never invent an ID.",
      ),

    status: z
      .enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled"])
      .nullable()
      .describe(
        "Stored invoice status, or null for all statuses. " +
          "Overdue filters the stored status; it does not calculate lateness.",
      ),

    page: z.number().int().min(1).describe("Page number, starting at 1."),

    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe("Invoices per page. Use 20 unless another size is needed."),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    try {
      const actor = await User.findById(auth.userId)
        .select("role active")
        .lean();

      assertCanPerformAction(actor, "get_invoices");

      const result = await getInvoices({
        search: input.search?.trim() || "",
        clientId: input.clientId || "",
        status: input.status || "",
        page: input.page,
        limit: input.limit,
      });

      return {
        success: true,
        data: {
          invoices: result.invoices.map((invoice) => ({
            id: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            client: invoice.client
              ? {
                  id: invoice.client._id.toString(),
                  companyName: invoice.client.companyName || "",
                  contactName: invoice.client.contactName || "",
                }
              : null,
            status: invoice.status,
            currency: invoice.currency,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            paidAt: invoice.paidAt || null,
            pdfPath: `/api/invoices/${invoice._id.toString()}/pdf`,
          })),
          pagination: result.pagination,
          scope: "This page contains matching invoices, not business-wide totals.",
        },
      };
    } catch (error) {
      if (error.code === "ACTION_NOT_AUTHORIZED") {
        return {
          success: false,
          error: "You are not authorized to view invoices.",
        };
      }

      console.error("get_invoices tool failed:", error);

      return {
        success: false,
        error: "Unable to retrieve invoices.",
      };
    }
  },
});