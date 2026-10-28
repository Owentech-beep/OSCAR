import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Client from "../models/Client.js";

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateInvoiceTotals(items, taxRate = 0) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createServiceError("An invoice must contain at least one item.");
  }

  const calculatedItems = items.map((item) => {
    const description = String(item.description ?? "").trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!description) {
      throw createServiceError("Each invoice item requires a description.");
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw createServiceError(
        "Invoice item quantity must be greater than zero.",
      );
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw createServiceError("Invoice item unit price cannot be negative.");
    }

    return {
      description,
      quantity,
      unitPrice: roundMoney(unitPrice),
      amount: roundMoney(quantity * unitPrice),
    };
  });

  const subtotal = roundMoney(
    calculatedItems.reduce((sum, item) => sum + item.amount, 0),
  );

  const normalizedTaxRate = Number(taxRate);

  if (
    !Number.isFinite(normalizedTaxRate) ||
    normalizedTaxRate < 0 ||
    normalizedTaxRate > 100
  ) {
    throw createServiceError("Tax rate must be between 0 and 100.");
  }

  const tax = roundMoney(subtotal * (normalizedTaxRate / 100));

  return {
    items: calculatedItems,
    subtotal,
    tax,
    total: roundMoney(subtotal + tax),
    taxRate: normalizedTaxRate,
  };
}

function validateDates(issueDate, dueDate) {
  const issue = new Date(issueDate);
  const due = new Date(dueDate);

  if (Number.isNaN(issue.getTime())) {
    throw createServiceError("Invalid invoice issue date.");
  }

  if (Number.isNaN(due.getTime())) {
    throw createServiceError("Invalid invoice due date.");
  }

  if (due < issue) {
    throw createServiceError(
      "Invoice due date cannot be before the issue date.",
    );
  }

  return {
    issueDate: issue,
    dueDate: due,
  };
}

function validateId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw createServiceError(`Invalid ${label}.`);
  }
}

function ensureInvoiceCanBeEdited(invoice) {
  if (invoice.status !== "Draft") {
    throw createServiceError(
      `Only draft invoices can be edited. This invoice is currently ${invoice.status}.`,
      409,
    );
  }
}

async function findInvoiceOrThrow(invoiceId) {
  validateId(invoiceId, "invoice ID");

  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw createServiceError("Invoice not found.", 404);
  }

  return invoice;
}

async function populateInvoice(invoiceId) {
  return Invoice.findById(invoiceId)
    .populate("client", "companyName contactName email phone")
    .populate("createdBy", "name email")
    .lean();
}

export async function createInvoice({
  invoiceNumber,
  clientId,
  issueDate = new Date(),
  dueDate,
  items,
  taxRate = 0,
  currency = "ZAR",
  status = "Draft",
  notes,
  createdBy,
}) {
  if (!String(invoiceNumber ?? "").trim()) {
    throw createServiceError("Invoice number is required.");
  }

  validateId(clientId, "client ID");
  validateId(createdBy, "invoice creator ID");

  if (status !== "Draft") {
    throw createServiceError("Invoices must be created as drafts.");
  }

  const normalizedCurrency = String(currency).trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw createServiceError(
      "Currency must be a valid three-letter currency code.",
    );
  }

  const client = await Client.findById(clientId);

  if (!client) {
    throw createServiceError("Client not found.", 404);
  }

  const dates = validateDates(issueDate, dueDate);
  const totals = calculateInvoiceTotals(items, taxRate);

  const invoice = await Invoice.create({
    invoiceNumber: String(invoiceNumber).trim(),
    client: clientId,
    issueDate: dates.issueDate,
    dueDate: dates.dueDate,
    items: totals.items,
    subtotal: totals.subtotal,
    tax: totals.tax,
    taxRate: totals.taxRate,
    total: totals.total,
    currency: normalizedCurrency,
    status: "Draft",
    notes,
    createdBy,
  });

  return populateInvoice(invoice._id);
}

export async function getInvoices({
  page = 1,
  limit = 20,
  clientId = "",
  status = "",
  search = "",
} = {}) {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20));

  const filter = {};

  if (clientId) {
    validateId(clientId, "client ID");
    filter.client = clientId;
  }

  const allowedStatuses = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];

  if (status) {
    if (!allowedStatuses.includes(status)) {
      throw createServiceError("Invalid invoice status.");
    }

    filter.status = status;
  }

  const normalizedSearch = String(search).trim();

  if (normalizedSearch) {
    filter.invoiceNumber = {
      $regex: escapeRegex(normalizedSearch),
      $options: "i",
    };
  }

  const skip = (normalizedPage - 1) * normalizedLimit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate("client", "companyName contactName email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(normalizedLimit)
      .lean(),

    Invoice.countDocuments(filter),
  ]);

  return {
    invoices,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages: Math.ceil(total / normalizedLimit),
    },
  };
}

export async function getInvoiceById(invoiceId) {
  validateId(invoiceId, "invoice ID");

  return populateInvoice(invoiceId);
}

export async function updateInvoice(invoiceId, data = {}) {
  const invoice = await findInvoiceOrThrow(invoiceId);

  ensureInvoiceCanBeEdited(invoice);

  if (data.status !== undefined) {
    throw createServiceError(
      "Invoice status must be changed through a dedicated invoice action.",
    );
  }

  if (data.clientId !== undefined) {
    validateId(data.clientId, "client ID");

    const client = await Client.findById(data.clientId);

    if (!client) {
      throw createServiceError("Client not found.", 404);
    }

    invoice.client = data.clientId;
  }

  const dates = validateDates(
    data.issueDate ?? invoice.issueDate,
    data.dueDate ?? invoice.dueDate,
  );

  const calculated =
    data.items !== undefined || data.taxRate !== undefined
      ? calculateInvoiceTotals(
          data.items ?? invoice.items,
          data.taxRate ?? invoice.taxRate,
        )
      : {
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          taxRate: invoice.taxRate,
          total: invoice.total,
        };

  invoice.issueDate = dates.issueDate;
  invoice.dueDate = dates.dueDate;
  invoice.items = calculated.items;
  invoice.subtotal = calculated.subtotal;
  invoice.tax = calculated.tax;
  invoice.taxRate = calculated.taxRate;
  invoice.total = calculated.total;

  if (data.invoiceNumber !== undefined) {
    const invoiceNumber = String(data.invoiceNumber).trim();

    if (!invoiceNumber) {
      throw createServiceError("Invoice number is required.");
    }

    invoice.invoiceNumber = invoiceNumber;
  }

  if (data.currency !== undefined) {
    const currency = String(data.currency).trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw createServiceError(
        "Currency must be a valid three-letter currency code.",
      );
    }

    invoice.currency = currency;
  }

  if (data.notes !== undefined) {
    invoice.notes = data.notes;
  }

  // Validate the edited document before writing.
  await invoice.validate();

  const updated = await Invoice.findOneAndUpdate(
    {
      _id: invoice._id,
      status: "Draft",
      __v: invoice.__v,
    },
    {
      $set: {
        invoiceNumber: invoice.invoiceNumber,
        client: invoice.client,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        items: invoice.items.map((item) => item.toObject()),
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        taxRate: invoice.taxRate,
        total: invoice.total,
        currency: invoice.currency,
        notes: invoice.notes ?? "",
      },
      $inc: { __v: 1 },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updated) {
    const existing = await Invoice.findById(invoiceId).select("status").lean();

    if (!existing) {
      throw createServiceError("Invoice not found.", 404);
    }

    throw createServiceError(
      "This invoice changed while you were editing it. " +
        "Refresh the page and reopen it. Only drafts can be edited.",
      409,
    );
  }

  return populateInvoice(updated._id);
}

async function transitionInvoiceStatus(
  invoiceId,
  allowedStatuses,
  nextStatus,
  extraFields = {},
) {
  validateId(invoiceId, "invoice ID");

  // Check the current status and update it in one database operation.
  const invoice = await Invoice.findOneAndUpdate(
    {
      _id: invoiceId,
      status: { $in: allowedStatuses },
    },
    {
      $set: {
        ...extraFields,
        status: nextStatus,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!invoice) {
    const existing = await Invoice.findById(invoiceId).select("status").lean();

    if (!existing) {
      throw createServiceError("Invoice not found.", 404);
    }

    throw createServiceError(
      `Cannot change invoice from ${existing.status} to ${nextStatus}. ` +
        `Allowed starting statuses: ${allowedStatuses.join(", ")}.`,
      409,
    );
  }

  return populateInvoice(invoice._id);
}

export async function markInvoiceSent(invoiceId) {
  return transitionInvoiceStatus(invoiceId, ["Draft"], "Sent");
}

export async function markInvoicePaid(invoiceId) {
  return transitionInvoiceStatus(invoiceId, ["Sent", "Overdue"], "Paid", {
    paidAt: new Date(),
  });
}

export async function cancelInvoice(invoiceId) {
  return transitionInvoiceStatus(
    invoiceId,
    ["Draft", "Sent", "Overdue"],
    "Cancelled",
  );
}

export async function getInvoiceSummary() {
  const now = new Date();

  const [summary] = await Invoice.aggregate([
    {
      $group: {
        _id: null,

        totalInvoices: {
          $sum: 1,
        },

        paidCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Paid"] }, 1, 0],
          },
        },

        paidAmount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Paid"] }, "$total", 0],
          },
        },

        outstandingCount: {
          $sum: {
            $cond: [{ $in: ["$status", ["Sent", "Overdue"]] }, 1, 0],
          },
        },

        outstandingAmount: {
          $sum: {
            $cond: [{ $in: ["$status", ["Sent", "Overdue"]] }, "$total", 0],
          },
        },

        overdueCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ["$status", ["Sent", "Overdue"]] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              1,
              0,
            ],
          },
        },

        overdueAmount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ["$status", ["Sent", "Overdue"]] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              "$total",
              0,
            ],
          },
        },
      },
    },
  ]);

  if (!summary) {
    return {
      totalInvoices: 0,
      paidCount: 0,
      paidAmount: 0,
      outstandingCount: 0,
      outstandingAmount: 0,
      overdueCount: 0,
      overdueAmount: 0,
    };
  }

  const { _id, ...result } = summary;

  return result;
}
