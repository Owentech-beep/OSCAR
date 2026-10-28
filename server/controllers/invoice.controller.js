import mongoose from "mongoose";

import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  markInvoiceSent,
  markInvoicePaid,
  cancelInvoice,
  getInvoiceSummary,
} from "../services/invoice.service.js";
import { generateInvoicePdf } from "../services/invoice-pdf.service.js";
import { assertCanPerformAction } from "../services/authorization.service.js";
import { writeAuditLog } from "../services/audit.service.js";
import { User } from "../models/User.js";
import { getBusinessSettings } from "../services/settings.service.js";

async function authorizeInvoiceAction(req, action) {
  const userId = req.session.user?.id;

  if (!userId) {
    const error = new Error("Authentication required.");
    error.statusCode = 401;
    throw error;
  }

  const actor = await User.findById(userId).select("role active");

  if (!actor || !actor.active) {
    const error = new Error("Your account is inactive or unavailable.");
    error.statusCode = 403;
    throw error;
  }

  assertCanPerformAction(actor, action);

  return userId;
}

async function recordInvoiceAudit(req, userId, action, invoice) {
  await writeAuditLog({
    actorUser: userId,
    action: `invoice.${action}`,
    resourceType: "Invoice",
    resourceId: invoice._id.toString(),
    req,
  });
}

function validateObjectId(id, label = "Invoice ID") {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(`Invalid ${label}.`);
    error.statusCode = 400;
    throw error;
  }
}

function handleInvoiceError(error, next) {
  if (error instanceof mongoose.Error.ValidationError) {
    error.statusCode = 400;
  }

  if (error instanceof mongoose.Error.CastError) {
    error.statusCode = 400;
  }

  return next(error);
}

export async function getInvoicesController(req, res, next) {
  try {
    await authorizeInvoiceAction(req, "get_invoices");

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    if (
      req.query.clientId &&
      !mongoose.isValidObjectId(req.query.clientId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid client ID.",
      });
    }

    const result = await getInvoices({
      page,
      limit,
      clientId: req.query.clientId || "",
      status: req.query.status || "",
      search: req.query.search || "",
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleInvoiceError(error, next);
  }
}

export async function getInvoiceController(req, res, next) {
  try {
    await authorizeInvoiceAction(req, "get_invoices");
    validateObjectId(req.params.id);

    const invoice = await getInvoiceById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: "Invoice not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    return handleInvoiceError(error, next);
  }
}

export async function createInvoiceController(req, res, next) {
  try {
    const userId = await authorizeInvoiceAction(req, "create_invoice");

    // Only accept fields intended for invoice creation.
    // The initial status is always Draft.
    const {
      invoiceNumber,
      clientId,
      issueDate,
      dueDate,
      items,
      taxRate,
      currency,
      notes,
    } = req.body;

    const invoice = await createInvoice({
      invoiceNumber,
      clientId,
      issueDate,
      dueDate,
      items,
      taxRate,
      currency,
      notes,
      status: "Draft",
      createdBy: userId,
    });

    await recordInvoiceAudit(req, userId, "created", invoice);

    return res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    return handleInvoiceError(error, next);
  }
}

export async function updateInvoiceController(req, res, next) {
  try {
    const userId = await authorizeInvoiceAction(req, "update_invoice");
    validateObjectId(req.params.id);

    // Do not allow status or ownership changes through the generic update route.
    const { invoiceNumber, clientId, issueDate, dueDate, items, taxRate, currency, notes } =
      req.body;

    const updates = {
      invoiceNumber,
      clientId,
      issueDate,
      dueDate,
      items,
      taxRate,
      currency,
      notes,
    };

    for (const key of Object.keys(updates)) {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    }

    if (updates.clientId && !mongoose.isValidObjectId(updates.clientId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid client ID.",
      });
    }

    const invoice = await updateInvoice(req.params.id, updates);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: "Invoice not found.",
      });
    }

    await recordInvoiceAudit(req, userId, "updated", invoice);

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    return handleInvoiceError(error, next);
  }
}

async function runInvoiceAction(req, res, next, action, service, auditAction) {
  try {
    const userId = await authorizeInvoiceAction(req, action);
    validateObjectId(req.params.id);

    const invoice = await service(req.params.id);

    await recordInvoiceAudit(req, userId, auditAction, invoice);

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    return handleInvoiceError(error, next);
  }
}

export function markInvoiceSentController(req, res, next) {
  return runInvoiceAction(
    req, res, next, "mark_invoice_sent",
    markInvoiceSent, "marked_sent",
  );
}

export function markInvoicePaidController(req, res, next) {
  return runInvoiceAction(
    req, res, next, "mark_invoice_paid",
    markInvoicePaid, "marked_paid",
  );
}

export function cancelInvoiceController(req, res, next) {
  return runInvoiceAction(
    req, res, next, "cancel_invoice",
    cancelInvoice, "cancelled",
  );
}

export async function getInvoiceSummaryController(req, res, next) {
  try {
    await authorizeInvoiceAction(req, "get_invoices");

    const summary = await getInvoiceSummary();

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return handleInvoiceError(error, next);
  }
}

export async function downloadInvoicePdfController(req, res, next) {
  try {
    // Verify the user is authenticated and authorized
    await authorizeInvoiceAction(req, "get_invoices");

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      const error = new Error("Invalid invoice ID.");
      error.statusCode = 400;
      throw error;
    }

    // Retrieve the real invoice from MongoDB
    const invoice = await getInvoiceById(id);

    if (!invoice) {
      const error = new Error("Invoice not found.");
      error.statusCode = 404;
      throw error;
    }

    // Generate the PDF
    const business = await getBusinessSettings();
    const pdfStream = generateInvoicePdf(invoice, business);

    // Ensure the filename is safe for HTTP headers
    const invoiceNumber = String(invoice.invoiceNumber)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice-${invoiceNumber}.pdf"`,
    );

    res.setHeader("Cache-Control", "private, no-store");

    pdfStream.on("error", (error) => {
    console.error("Invoice PDF generation failed:", error);

      if (!res.headersSent) {
        return next(error);
      }

      res.destroy(error);
    });

    pdfStream.pipe(res);
  } catch (error) {
    next(error);
  }
}